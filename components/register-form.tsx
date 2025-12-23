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

const formSchema = z.object({
  name: z.string().min(2, "Navn må være minst 2 tegn"),
  email: z.string().email("Ugyldig e-postadresse"),
  password: z.string().min(4, "Passordet må være minst 4 tegn"),
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
    },
  })

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true)
    setError(null)

    try {
      const supabase = createClient()
      const { data, error: authError } = await supabase.auth.signUp({
        email: values.email,
        password: values.password,
        options: {
          data: {
            name: values.name,
            role: 'OWNER', // Default to Owner for public registration
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
            role: 'OWNER',
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
    <Card className="w-[350px]">
      <CardHeader>
        <CardTitle>Registrer</CardTitle>
        <CardDescription>
          Opprett en konto for å administrere dine eiendommer.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <div className="grid w-full items-center gap-4">
            <div className="flex flex-col space-y-1.5">
              <Label htmlFor="name">Navn</Label>
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
          </div>
          {error && <div className="mt-4 text-sm text-red-500">{error}</div>}
          <div className="mt-4 flex justify-between">
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
