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

const formSchema = z.object({
  name: z.string().min(1, "Navn er påkrevd"),
  sizeSqm: z.coerce.number().min(1, "Størrelse må være positiv"),
  rooms: z.coerce.number().min(1, "Rom må være minst 1"),
  rentAmount: z.coerce.number().min(0, "Leie kan ikke være negativ"),
  depositAmount: z.coerce.number().min(0, "Depositum kan ikke være negativt"),
})

interface NewUnitPageProps {
  params: {
    id: string
  }
}

export default function NewUnitPage({ params }: NewUnitPageProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      sizeSqm: 0,
      rooms: 1,
      rentAmount: 0,
      depositAmount: 0,
    },
  })

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
                <Label htmlFor="rooms">Antall rom</Label>
                <Input
                  id="rooms"
                  type="number"
                  {...form.register("rooms")}
                />
                {form.formState.errors.rooms && (
                  <p className="text-sm text-red-500">{form.formState.errors.rooms.message}</p>
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
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Oppretter..." : "Opprett enhet"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
