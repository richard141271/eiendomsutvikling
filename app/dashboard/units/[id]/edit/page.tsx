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
  name: z.string().min(1, "Navn er påkrevd"),
  unitNumber: z.string().optional(),
  sizeSqm: z.string().min(1, "Størrelse er påkrevd"),
  roomCount: z.string().min(1, "Antall rom er påkrevd"),
  rentAmount: z.string().min(1, "Leie er påkrevd"),
  depositAmount: z.string().min(1, "Depositum er påkrevd"),
  status: z.enum(["AVAILABLE", "RESERVED", "RENTED", "SOLD"]),
  notes: z.string().optional(),
  imageUrl: z.string().optional(),
})

export default function EditUnitPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [isLoading, setIsLoading] = React.useState(false)
  const [isUploading, setIsUploading] = React.useState(false)
  const [isFetching, setIsFetching] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      unitNumber: "",
      sizeSqm: "",
      roomCount: "",
      rentAmount: "",
      depositAmount: "",
      status: "AVAILABLE",
      notes: "",
      imageUrl: "",
    },
  })

  React.useEffect(() => {
    async function fetchUnit() {
      try {
        const res = await fetch(`/api/units/${params.id}`)
        if (!res.ok) throw new Error("Kunne ikke hente enhet")
        const data = await res.json()
        
        form.reset({
          name: data.name,
          sizeSqm: data.sizeSqm?.toString() || "",
          roomCount: data.roomCount?.toString() || "",
          rentAmount: data.rentAmount?.toString() || "",
          depositAmount: data.depositAmount?.toString() || "",
          status: data.status,
          imageUrl: data.imageUrl || "",
        })
      } catch (err) {
        setError("Kunne ikke laste enhetsdata")
      } finally {
        setIsFetching(false)
      }
    }
    fetchUnit()
  }, [params.id, form])

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true)
    setError(null)

    try {
      const res = await fetch(`/api/units/${params.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(values),
      })

      if (!res.ok) {
        throw new Error("Kunne ikke oppdatere enhet")
      }

      router.push(`/dashboard/units/${params.id}`)
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
      if (confirm("Er du sikker på at du vil slette denne enheten? Dette kan ikke angres.")) {
        try {
          const res = await fetch(`/api/units/${params.id}`, { method: "DELETE" });
          if (res.ok) {
            router.refresh();
            router.push("/dashboard/properties");
          } else {
            alert("Kunne ikke slette enhet");
          }
        } catch (e) {
          alert("Feil ved sletting");
        }
      }
    } else if (value === "SOLD") {
       try {
        const res = await fetch(`/api/units/${params.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: "SOLD" })
        });
        if (res.ok) {
            router.refresh();
            alert("Enhet markert som solgt");
        } else {
             alert("Kunne ikke oppdatere status");
        }
      } catch (e) {
        alert("Kunne ikke oppdatere status");
      }
    }
  }

  if (isFetching) {
    return <div className="p-8 text-center">Laster enhet...</div>
  }

  return (
    <div className="flex flex-col items-center gap-6 p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle>Rediger Enhet</CardTitle>
          <CardDescription>
            Oppdater informasjon om enheten.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-2">
              <Label>Bilde av enheten</Label>
              <ImageUpload
                value={form.watch("imageUrl")}
                onChange={(url) => form.setValue("imageUrl", url)}
                onUploadStatusChange={setIsUploading}
                label="Last opp bilde"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Enhetsnavn</Label>
                <Input
                  id="name"
                  placeholder="f.eks. Leil. 101"
                  {...form.register("name")}
                />
                {form.formState.errors.name && (
                  <p className="text-sm text-red-500">{form.formState.errors.name.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="unitNumber">Bolignummer (H-nummer)</Label>
                <Input
                  id="unitNumber"
                  placeholder="f.eks. H0101"
                  {...form.register("unitNumber")}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select 
                onValueChange={(val) => form.setValue("status", val as any)}
                defaultValue={form.getValues("status")}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Velg status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="AVAILABLE">Ledig</SelectItem>
                  <SelectItem value="RESERVED">Reservert</SelectItem>
                  <SelectItem value="RENTED">Utleid</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notater</Label>
              <Textarea
                id="notes"
                placeholder="Interne notater..."
                {...form.register("notes")}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="sizeSqm">Størrelse (kvm)</Label>
                <Input
                  id="sizeSqm"
                  type="number"
                  {...form.register("sizeSqm")}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="roomCount">Antall rom</Label>
                <Input
                  id="roomCount"
                  type="number"
                  {...form.register("roomCount")}
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="rentAmount">Månedsleie (NOK)</Label>
                <Input
                  id="rentAmount"
                  type="number"
                  {...form.register("rentAmount")}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="depositAmount">Depositum (NOK)</Label>
                <Input
                  id="depositAmount"
                  type="number"
                  {...form.register("depositAmount")}
                />
              </div>
            </div>

            {error && <div className="text-sm text-red-500">{error}</div>}

            <div className="flex justify-end gap-4">
              <Button variant="outline" type="button" onClick={() => router.back()}>
                Avbryt
              </Button>
              <Button type="submit" disabled={isLoading || isUploading}>
                {isUploading ? "Laster opp bilde..." : isLoading ? "Lagrer..." : "Lagre Endringer"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
