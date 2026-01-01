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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ImageUpload } from "@/components/image-upload"

const formSchema = z.object({
  name: z.string().min(2, "Navn må være minst 2 tegn"),
  address: z.string().min(5, "Adresse må være minst 5 tegn"),
  gnr: z.string().optional(),
  bnr: z.string().optional(),
  notes: z.string().optional(),
  imageUrl: z.string().optional(),
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
      imageUrl: "",
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
          imageUrl: data.imageUrl || "",
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

  async function handleAction(value: string) {
    if (value === "DELETE") {
      if (confirm("Er du sikker på at du vil slette denne eiendommen? Dette kan ikke angres.")) {
        try {
          const res = await fetch(`/api/properties/${params.id}`, { method: "DELETE" });
          if (res.ok) {
            router.refresh();
            router.push("/dashboard/properties");
          } else {
            alert("Kunne ikke slette eiendom");
          }
        } catch (e) {
          alert("Feil ved sletting");
        }
      }
    } else if (value === "SOLD") {
      try {
        const res = await fetch(`/api/properties/${params.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: "SOLD" })
        });
        if (res.ok) {
            router.refresh();
            alert("Eiendom markert som solgt");
        } else {
            alert("Kunne ikke oppdatere status");
        }
      } catch (e) {
        alert("Kunne ikke oppdatere status");
      }
    }
  }

  if (isFetching) {
    return <div className="p-8 text-center">Laster eiendom...</div>
  }

  return (
    <div className="flex flex-col items-center gap-6 p-4">
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
                {isLoading ? "Lagrer..." : "Lagre Endringer"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="w-full max-w-2xl border-destructive/50">
        <CardHeader>
          <CardTitle className="text-destructive">Handlinger</CardTitle>
          <CardDescription>Slett eller selg eiendommen</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
             <Label>Velg handling</Label>
             <Select onValueChange={handleAction}>
                <SelectTrigger className="w-full">
                   <SelectValue placeholder="Velg handling..." />
                </SelectTrigger>
                <SelectContent>
                   <SelectItem value="SOLD">Marker som solgt</SelectItem>
                   <SelectItem value="DELETE">Slett eiendom</SelectItem>
                </SelectContent>
             </Select>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
