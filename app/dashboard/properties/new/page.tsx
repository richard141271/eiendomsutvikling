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
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { createClient } from "@/lib/supabase"
import { syncUser } from "@/app/actions/user-sync"
import { ImageUpload } from "@/components/image-upload"

const formSchema = z.object({
  name: z.string().min(2, "Navn må være minst 2 tegn"),
  address: z.string().min(5, "Adresse må være minst 5 tegn"),
  gnr: z.string().optional(),
  bnr: z.string().optional(),
  notes: z.string().optional(),
  imageUrl: z.string().optional(),
})

export default function NewPropertyPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      address: "",
      gnr: "",
      bnr: "",
      notes: "",
      imageUrl: "",
    },
  })

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true)
    setError(null)

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        // Redirect to login if session is missing
        router.push("/login?next=/dashboard/properties/new");
        return
      }

      // Ensure user exists in DB
      const syncResult = await syncUser();
      if (!syncResult.success) {
        console.warn("User sync warning:", syncResult.error);
        // Continue anyway, as the API might handle it or it might be a transient error
      }

      const res = await fetch("/api/properties", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...values,
          ownerId: user.id,
          email: user.email,
        }),
      })

      if (!res.ok) {
        const text = await res.text();
        let errorMsg = "Kunne ikke opprette eiendom";
        try {
          const json = JSON.parse(text);
          errorMsg = json.error || errorMsg;
        } catch (e) {
          // ignore json parse error
        }
        throw new Error(errorMsg)
      }

      router.push("/dashboard/properties")
      router.refresh()
    } catch (err: any) {
      setError(err.message || "En uventet feil oppstod")
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle>Legg til Ny Eiendom</CardTitle>
          <CardDescription>
            Registrer en ny eiendom for å administrere den.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Eiendomsnavn</Label>
                <Input
                  id="name"
                  placeholder="f.eks. Storgata 10"
                  {...form.register("name")}
                />
                {form.formState.errors.name && (
                  <p className="text-sm text-red-500">{form.formState.errors.name.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Adresse</Label>
                <Input
                  id="address"
                  placeholder="Gateadresse, Sted"
                  {...form.register("address")}
                />
                {form.formState.errors.address && (
                  <p className="text-sm text-red-500">{form.formState.errors.address.message}</p>
                )}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="gnr">Gnr (Valgfritt)</Label>
                <Input
                  id="gnr"
                  placeholder="Gårdsnummer"
                  {...form.register("gnr")}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bnr">Bnr (Valgfritt)</Label>
                <Input
                  id="bnr"
                  placeholder="Bruksnummer"
                  {...form.register("bnr")}
                />
              </div>
            </div>

            <div className="space-y-2">
              <ImageUpload
                value={form.watch("imageUrl")}
                onChange={(url) => form.setValue("imageUrl", url)}
                label="Bilde av eiendommen"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notater</Label>
              <Textarea
                id="notes"
                placeholder="Tilleggsinformasjon om eiendommen..."
                {...form.register("notes")}
              />
            </div>

            {error && <div className="text-sm text-red-500">{error}</div>}

            <div className="flex justify-end gap-4">
              <Button variant="outline" type="button" onClick={() => router.back()}>
                Avbryt
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Oppretter..." : "Opprett Eiendom"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
