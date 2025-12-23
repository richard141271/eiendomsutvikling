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

const formSchema = z.object({
  name: z.string().min(2, "Navn må være minst 2 tegn"),
  address: z.string().min(5, "Adresse må være minst 5 tegn"),
  gnr: z.string().optional(),
  bnr: z.string().optional(),
  notes: z.string().optional(),
})

export default function EditPropertyPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [isLoading, setIsLoading] = React.useState(false)
  const [isFetching, setIsFetching] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      address: "",
      gnr: "",
      bnr: "",
      notes: "",
    },
  })

  React.useEffect(() => {
    async function fetchProperty() {
      try {
        const res = await fetch(`/api/properties/${params.id}`)
        if (!res.ok) throw new Error("Kunne ikke hente eiendom")
        const data = await res.json()
        
        form.reset({
          name: data.name,
          address: data.address,
          gnr: data.gnr || "",
          bnr: data.bnr || "",
          notes: data.notes || "",
        })
      } catch (err) {
        setError("Kunne ikke laste eiendomsdata")
      } finally {
        setIsFetching(false)
      }
    }
    fetchProperty()
  }, [params.id, form])

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true)
    setError(null)

    try {
      const res = await fetch(`/api/properties/${params.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(values),
      })

      if (!res.ok) {
        throw new Error("Kunne ikke oppdatere eiendom")
      }

      router.push(`/dashboard/properties/${params.id}`)
      router.refresh()
    } catch (err) {
      setError("En uventet feil oppstod")
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  if (isFetching) {
    return <div className="p-8 text-center">Laster eiendom...</div>
  }

  return (
    <div className="flex justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle>Rediger Eiendom</CardTitle>
          <CardDescription>
            Oppdater informasjon om eiendommen.
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
                {isLoading ? "Lagrer..." : "Lagre Endringer"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
