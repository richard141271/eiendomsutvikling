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
import { toast } from "sonner"
import { Eye, EyeOff } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"

function reportDebugEvent(hypothesisId: "A" | "B" | "C" | "D" | "E", location: string, msg: string, data: Record<string, unknown>) {
  void hypothesisId
  void location
  void msg
  void data
}

const formSchema = z.object({
  email: z.string().email("Ugyldig e-postadresse"),
  password: z.string().min(4, "Passordet må være minst 4 tegn"),
})

export function LoginForm() {
  const router = useRouter()
  const [isLoading, setIsLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [showPassword, setShowPassword] = React.useState(false)
  const [forgotOpen, setForgotOpen] = React.useState(false)
  const [forgotEmail, setForgotEmail] = React.useState("")
  const [forgotLoading, setForgotLoading] = React.useState(false)

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  })

  async function onSubmit(values: z.infer<typeof formSchema>) {
    const startedAt = typeof performance !== "undefined" ? performance.now() : Date.now()
    setIsLoading(true)
    setError(null)
    // #region debug-point D:login-start
    reportDebugEvent("D", "components/login-form.tsx:onSubmit:start", "[DEBUG] Login started", {
      email: values.email,
    })
    // #endregion

    try {
      const passwordToUse = values.password.length === 4 ? values.password + "00" : values.password
      const supabase = createClient()
      const { error } = await supabase.auth.signInWithPassword({
        email: values.email,
        password: passwordToUse,
      })

      if (error) {
        // #region debug-point D:login-error
        reportDebugEvent("D", "components/login-form.tsx:onSubmit:error", "[DEBUG] Login failed", {
          email: values.email,
          durationMs: Math.round((typeof performance !== "undefined" ? performance.now() : Date.now()) - startedAt),
          error: error.message,
        })
        // #endregion
        if (error.message === "Invalid login credentials") {
          setError("Feil e-post eller passord")
        } else if (error.message.includes("Email not confirmed")) {
          setError("Du må bekrefte e-postadressen din før du logger inn.")
        } else {
          setError(`Feil ved innlogging: ${error.message}`)
        }
        setIsLoading(false)
        return
      }

      // #region debug-point D:login-success
      reportDebugEvent("D", "components/login-form.tsx:onSubmit:success", "[DEBUG] Login succeeded", {
        email: values.email,
        durationMs: Math.round((typeof performance !== "undefined" ? performance.now() : Date.now()) - startedAt),
      })
      // #endregion
      router.push("/dashboard")
      router.refresh()
    } catch (err) {
      // #region debug-point D:login-catch
      reportDebugEvent("D", "components/login-form.tsx:onSubmit:catch", "[DEBUG] Login threw unexpected error", {
        email: values.email,
        durationMs: Math.round((typeof performance !== "undefined" ? performance.now() : Date.now()) - startedAt),
        error: err instanceof Error ? err.message : String(err),
      })
      // #endregion
      setError("En uventet feil oppstod")
      setIsLoading(false)
    }
  }

  const handleForgotPassword = async () => {
    const email = forgotEmail.trim()
    if (!email) {
      toast.error("Skriv inn e-postadressen din")
      return
    }

    try {
      setForgotLoading(true)
      const supabase = createClient()
      const redirectTo = `${window.location.origin}/api/auth/callback?next=/reset-password`
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo })
      if (error) {
        throw new Error(error.message || "Kunne ikke sende e-post")
      }
      toast.success("Vi har sendt deg en e-post for å sette nytt passord")
      setForgotOpen(false)
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Kunne ikke sende e-post"
      toast.error(msg)
    } finally {
      setForgotLoading(false)
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
        <form onSubmit={form.handleSubmit(onSubmit)} method="post" autoComplete="on">
          <div className="grid w-full items-center gap-4">
            <div className="flex flex-col space-y-1.5">
              <Label htmlFor="email">E-post</Label>
              <Input
                id="email"
                type="email"
                placeholder="navn@eksempel.no"
                autoComplete="username"
                inputMode="email"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
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
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Minst 4 tegn"
                  className="pr-10"
                  autoComplete="current-password"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  {...form.register("password")}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-500 hover:text-slate-800"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Skjul passord" : "Vis passord"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {form.formState.errors.password && (
                <span className="text-sm text-red-500">
                  {form.formState.errors.password.message}
                </span>
              )}
              <Button
                type="button"
                variant="link"
                className="h-auto p-0 justify-start text-sm"
                onClick={() => setForgotOpen(true)}
              >
                Glemt passord?
              </Button>
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

      <Dialog
        open={forgotOpen}
        onOpenChange={(open) => {
          setForgotOpen(open)
          if (open) {
            setForgotEmail(form.getValues("email") || "")
          }
        }}
      >
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Glemt passord</DialogTitle>
            <DialogDescription>
              Skriv inn e-posten din, så sender vi deg en lenke for å sette nytt passord.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-2">
            <Label htmlFor="forgot-email">E-post</Label>
            <Input
              id="forgot-email"
              value={forgotEmail}
              onChange={(e) => setForgotEmail(e.target.value)}
              placeholder="navn@eksempel.no"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setForgotOpen(false)} disabled={forgotLoading}>
              Avbryt
            </Button>
            <Button type="button" onClick={handleForgotPassword} disabled={forgotLoading}>
              {forgotLoading ? "Sender..." : "Send lenke"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
