"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createClient } from "@/lib/supabase"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { CheckCircle2 } from "lucide-react"
import { fetchCityFromPostalCode } from "@/lib/postal-service"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const formSchema = z.object({
  name: z.string().min(2, "Navn må være minst 2 tegn"),
  email: z.string().email("Ugyldig e-postadresse"),
  password: z.string().min(4, "Passordet må være minst 4 tegn"),
  role: z.enum(["OWNER", "TENANT"]),
  address: z.string().min(1, "Adresse er påkrevd"),
  postalCode: z.string().min(4, "Postnummer må være 4 siffer"),
  city: z.string().min(1, "Sted er påkrevd"),
  phone: z.string().min(8, "Telefonnummer må være minst 8 siffer"),
  hasTenantCertificate: z.boolean().optional(),
})

export function RegisterForm() {
  const router = useRouter()
  const [isLoading, setIsLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [isSuccess, setIsSuccess] = React.useState(false)

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      role: "OWNER",
      address: "",
      postalCode: "",
      city: "",
      phone: "",
      hasTenantCertificate: false,
    },
  })
  
  const role = form.watch("role");
  const postalCode = form.watch("postalCode");

  // Auto-fetch city from postal code
  React.useEffect(() => {
    if (postalCode && postalCode.length === 4) {
      fetchCityFromPostalCode(postalCode).then(city => {
        if (city) {
          form.setValue("city", city);
        }
      });
    }
  }, [postalCode, form]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true)
    setError(null)

    try {
      // Pad 4-digit PIN with "00" to satisfy Supabase 6-char requirement
      const passwordToUse = values.password.length === 4 ? values.password + "00" : values.password;

      const supabase = createClient()
      const { data, error: authError } = await supabase.auth.signUp({
        email: values.email,
        password: passwordToUse,
        options: {
          data: {
            name: values.name,
            role: values.role,
          },
        },
      })

      if (authError) {
        setError(`Kunne ikke opprette bruker: ${authError.message}`)
        setIsLoading(false)
        return
      }

      if (data.user) {
        console.log("User created in Auth, registering in DB...", data.user.id);
        // Call API to create user in database
        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            id: data.user.id,
            email: values.email,
            name: values.name,
            role: values.role,
            address: values.address,
            postalCode: values.postalCode,
            city: values.city,
            phone: values.phone,
            hasTenantCertificate: values.role === 'TENANT' ? values.hasTenantCertificate : false,
          }),
        })

        console.log("API response status:", res.status, res.statusText);

        if (!res.ok) {
           const text = await res.text();
           console.log("API error body:", text);
           let errorMsg = "Ukjent feil";
           try {
             const json = JSON.parse(text);
             errorMsg = json.error || res.statusText;
           } catch (e) {
             errorMsg = text || res.statusText;
           }
           setError(`Kunne ikke opprette brukerprofil: ${errorMsg} (Status: ${res.status})`)
           setIsLoading(false)
           return
        }

        // Success!
        setIsSuccess(true)
        setIsLoading(false)
      }
    } catch (err) {
      setError("En uventet feil oppstod")
      setIsLoading(false)
    }
  }

  if (isSuccess) {
    return (
      <Card className="w-[350px]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-6 w-6 text-green-500" />
            Konto opprettet
          </CardTitle>
          <CardDescription>
            Registreringen var vellykket.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert className="bg-green-50 border-green-200">
            <AlertTitle className="text-green-800">Sjekk e-posten din</AlertTitle>
            <AlertDescription className="text-green-700">
              Vi har sendt en bekreftelseslenke til din e-postadresse. Du må klikke på denne for å aktivere kontoen før du kan logge inn.
            </AlertDescription>
          </Alert>
        </CardContent>
        <CardFooter className="flex justify-center">
          <Button className="w-full" onClick={() => router.push("/login")}>
            Gå til innlogging
          </Button>
        </CardFooter>
      </Card>
    )
  }

  return (
    <Card className="w-[450px]">
      <CardHeader>
        <CardTitle>Registrer bruker</CardTitle>
        <CardDescription>
          Opprett en konto som utleier eller boligsøker.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <div className="grid w-full items-center gap-4">
            
            {/* Role Selection */}
            <div className="flex flex-col space-y-1.5">
              <Label htmlFor="role">Jeg er:</Label>
              <Select 
                onValueChange={(value: "OWNER" | "TENANT") => form.setValue("role", value)} 
                defaultValue={form.getValues("role")}
              >
                <SelectTrigger id="role">
                  <SelectValue placeholder="Velg rolle" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="OWNER">Utleier / Admin</SelectItem>
                  <SelectItem value="TENANT">Boligsøker / Leietaker</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col space-y-1.5">
              <Label htmlFor="name">Fullt navn</Label>
              <Input
                id="name"
                placeholder="Ola Nordmann"
                {...form.register("name")}
              />
              {form.formState.errors.name && (
                <span className="text-sm text-red-500">
                  {form.formState.errors.name.message}
                </span>
              )}
            </div>
            
            <div className="flex flex-col space-y-1.5">
              <Label htmlFor="address">Adresse</Label>
              <Input
                id="address"
                placeholder="Storgata 1"
                {...form.register("address")}
              />
              {form.formState.errors.address && (
                <span className="text-sm text-red-500">
                  {form.formState.errors.address.message}
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col space-y-1.5">
                <Label htmlFor="postalCode">Postnummer</Label>
                <Input
                  id="postalCode"
                  placeholder="1771"
                  {...form.register("postalCode")}
                />
                {form.formState.errors.postalCode && (
                  <span className="text-sm text-red-500">
                    {form.formState.errors.postalCode.message}
                  </span>
                )}
              </div>
              <div className="flex flex-col space-y-1.5">
                <Label htmlFor="city">Sted</Label>
                <Input
                  id="city"
                  placeholder="Halden"
                  {...form.register("city")}
                />
                {form.formState.errors.city && (
                  <span className="text-sm text-red-500">
                    {form.formState.errors.city.message}
                  </span>
                )}
              </div>
            </div>

            <div className="flex flex-col space-y-1.5">
              <Label htmlFor="phone">Telefonnummer</Label>
              <Input
                id="phone"
                placeholder="12345678"
                {...form.register("phone")}
              />
              {form.formState.errors.phone && (
                <span className="text-sm text-red-500">
                  {form.formState.errors.phone.message}
                </span>
              )}
            </div>

            <div className="flex flex-col space-y-1.5">
              <Label htmlFor="email">E-post</Label>
              <Input
                id="email"
                placeholder="navn@eksempel.no"
                {...form.register("email")}
              />
              {form.formState.errors.email && (
                <span className="text-sm text-red-500">
                  {form.formState.errors.email.message}
                </span>
              )}
            </div>

            <div className="flex flex-col space-y-1.5">
              <Label htmlFor="password">Passord (eller PIN)</Label>
              <Input
                id="password"
                type="password"
                placeholder="Minst 4 tegn"
                {...form.register("password")}
              />
              {form.formState.errors.password && (
                <span className="text-sm text-red-500">
                  {form.formState.errors.password.message}
                </span>
              )}
            </div>

            {/* Tenant Certificate Checkbox */}
            {role === 'TENANT' && (
              <div className="space-y-4">
                <div className="flex items-center space-x-2 border p-4 rounded-md bg-slate-50">
                  <input
                      type="checkbox"
                      id="hasTenantCertificate"
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      {...form.register("hasTenantCertificate")}
                  />
                  <Label htmlFor="hasTenantCertificate" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer">
                    Jeg har leieboerbevis
                  </Label>
                </div>

                {form.watch("hasTenantCertificate") && (
                   <div className="border border-dashed border-slate-300 rounded-md p-6 flex flex-col items-center text-center bg-slate-50/50">
                     <div className="mb-2">
                       <CheckCircle2 className="h-8 w-8 text-slate-300 mx-auto" />
                     </div>
                     <p className="text-sm font-medium text-slate-900 mb-1">Last opp leieboerbevis</p>
                     <p className="text-xs text-slate-500 mb-4">Last opp PDF eller bilde av ditt bevis</p>
                     <Input 
                       type="file" 
                       accept=".pdf,image/*" 
                       className="max-w-xs"
                       onChange={(e) => {
                         // In a real app, handle file upload to Supabase Storage here
                         // For now we just log it
                         console.log("File selected:", e.target.files?.[0]);
                       }}
                     />
                   </div>
                )}
              </div>
            )}
            
          </div>
          {error && <div className="mt-4 text-sm text-red-500">{error}</div>}
          <div className="mt-6 flex justify-between">
             <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Oppretter konto..." : "Registrer"}
             </Button>
          </div>
        </form>
      </CardContent>
      <CardFooter className="flex justify-center">
        <Button variant="link" onClick={() => router.push("/login")}>
          Har du allerede konto? Logg inn
        </Button>
      </CardFooter>
    </Card>
  )
}
