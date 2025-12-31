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

const formSchema = z.object({
  email: z.string().email("Ugyldig e-postadresse"),
  password: z.string().min(4, "Passordet må være minst 4 tegn"),
})

export function LoginForm() {
  const router = useRouter()
  const [isLoading, setIsLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  })

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true)
    setError(null)

    try {
      // Pad 4-digit PIN with "00" to satisfy Supabase 6-char requirement
      const passwordToUse = values.password.length === 4 ? values.password + "00" : values.password;

      const supabase = createClient()
      const { error } = await supabase.auth.signInWithPassword({
        email: values.email,
        password: passwordToUse,
      })

      if (error) {
        console.error("Login error:", error);
        // Translate common errors
        if (error.message === "Invalid login credentials") {
           setError("Feil e-post eller passord");
        } else if (error.message.includes("Email not confirmed")) {
           setError("Du må bekrefte e-postadressen din før du logger inn.");
        } else {
           setError(`Feil ved innlogging: ${error.message}`);
        }
        return
      }

      router.push("/dashboard")
      router.refresh()
    } catch (err) {
      setError("En uventet feil oppstod")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Logg inn</CardTitle>
        <CardDescription>
          Skriv inn din e-post for å logge inn på din konto.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <div className="grid w-full items-center gap-4">
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
              <Label htmlFor="password">Passord (PIN)</Label>
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
                {isLoading ? "Logger inn..." : "Logg inn"}
             </Button>
          </div>
        </form>
      </CardContent>
      <CardFooter className="flex justify-center">
        <Button variant="link" onClick={() => router.push("/register")}>
          Har du ikke konto? Registrer deg
        </Button>
      </CardFooter>
    </Card>
  )
}
