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
import { createClient } from "@/lib/supabase"
import { ImageUpload } from "@/components/image-upload"

const formSchema = z.object({
  name: z.string().min(1, "Navn er påkrevd"),
  sizeSqm: z.coerce.number().min(1, "Størrelse må være positiv"),
  roomCount: z.coerce.number().min(1, "Rom må være minst 1"),
  rentAmount: z.coerce.number().min(0, "Leie kan ikke være negativ"),
  depositAmount: z.coerce.number().min(0, "Depositum kan ikke være negativt"),
  imageUrl: z.string().optional(),
})

interface NewUnitPageProps {
  params: {
    id: string
  }
}

export default function NewUnitPage({ params }: NewUnitPageProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = React.useState(false)
  const [isUploading, setIsUploading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      sizeSqm: 0,
      roomCount: 1,
      rentAmount: 0,
      depositAmount: 0,
      imageUrl: "",
    },
  })

  const watchedSizeSqm = form.watch("sizeSqm")
  const watchedRentAmount = form.watch("rentAmount")
  const [standardRentPerSqm, setStandardRentPerSqm] = React.useState(185);

  React.useEffect(() => {
    // Fetch settings
    fetch("/api/settings").then(res => res.json()).then(data => {
        if (data.standardRentPerSqm) setStandardRentPerSqm(data.standardRentPerSqm);
    }).catch(err => console.error(err));
  }, []);

  // Auto-calculate rent based on size
  React.useEffect(() => {
    if (watchedSizeSqm > 0) {
      const calculatedRent = Math.round(watchedSizeSqm * standardRentPerSqm)
      form.setValue("rentAmount", calculatedRent, { shouldValidate: true })
    }
  }, [watchedSizeSqm, form, standardRentPerSqm])

  // Auto-calculate deposit based on rent (3x monthly rent)
  React.useEffect(() => {
    if (watchedRentAmount > 0) {
      const calculatedDeposit = watchedRentAmount * 3
      form.setValue("depositAmount", calculatedDeposit, { shouldValidate: true })
    }
  }, [watchedRentAmount, form])

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true)
    setError(null)

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        setError("Du må være logget inn for å opprette en enhet")
        return
      }

      const res = await fetch("/api/units", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...values,
          propertyId: params.id,
        }),
      })

      if (!res.ok) {
        throw new Error("Kunne ikke opprette enhet")
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

  return (
    <div className="flex justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle>Legg til ny enhet</CardTitle>
          <CardDescription>
            Registrer en utleieenhet (leilighet) for denne eiendommen.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">Enhetsnavn</Label>
              <Input
                id="name"
                placeholder="f.eks. Leil. 101 eller 2. etasje"
                {...form.register("name")}
              />
              {form.formState.errors.name && (
                <p className="text-sm text-red-500">{form.formState.errors.name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Bilde av enheten</Label>
              <ImageUpload
                value={form.watch("imageUrl")}
                onChange={(url) => form.setValue("imageUrl", url)}
                label="Last opp bilde"
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
                {form.formState.errors.sizeSqm && (
                  <p className="text-sm text-red-500">{form.formState.errors.sizeSqm.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="roomCount">Antall rom</Label>
                <Input
                  id="roomCount"
                  type="number"
                  {...form.register("roomCount")}
                />
                {form.formState.errors.roomCount && (
                  <p className="text-sm text-red-500">{form.formState.errors.roomCount.message}</p>
                )}
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
                {form.formState.errors.rentAmount && (
                  <p className="text-sm text-red-500">{form.formState.errors.rentAmount.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="depositAmount">Depositum (NOK)</Label>
                <Input
                  id="depositAmount"
                  type="number"
                  {...form.register("depositAmount")}
                />
                {form.formState.errors.depositAmount && (
                  <p className="text-sm text-red-500">{form.formState.errors.depositAmount.message}</p>
                )}
              </div>
            </div>

            {error && <div className="text-sm text-red-500">{error}</div>}

            <div className="flex justify-end gap-4">
              <Button variant="outline" type="button" onClick={() => router.back()}>
                Avbryt
              </Button>
              <Button type="submit" disabled={isLoading || isUploading}>
                {isUploading ? "Laster opp bilde..." : isLoading ? "Oppretter..." : "Opprett enhet"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
