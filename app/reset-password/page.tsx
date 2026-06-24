"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase";
import { normalizeStoredPassword } from "@/lib/auth-password";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Eye, EyeOff } from "lucide-react";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [hasSession, setHasSession] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    const run = async () => {
      try {
        const supabase = createClient();
        const { data } = await supabase.auth.getUser();
        setHasSession(Boolean(data?.user));
      } finally {
        setLoading(false);
      }
    };
    run();
  }, []);

  const handleSave = async () => {
    if (saving) return;
    const pw = password.trim();
    const c = confirm.trim();

    if (pw.length < 4) {
      toast.error("Passordet må være minst 4 tegn");
      return;
    }
    if (pw !== c) {
      toast.error("Passordene er ikke like");
      return;
    }

    const passwordToSet = normalizeStoredPassword(pw);

    try {
      setSaving(true);
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password: passwordToSet });
      if (error) throw new Error(error.message || "Kunne ikke oppdatere passord");

      toast.success("Passord oppdatert");
      router.push("/dashboard");
      router.refresh();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Kunne ikke oppdatere passord";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-900 px-4">
        <div className="text-sm text-slate-600 dark:text-slate-300">Laster...</div>
      </div>
    );
  }

  if (!hasSession) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-900 px-4">
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle>Ugyldig lenke</CardTitle>
            <CardDescription>
              Lenken for å sette nytt passord er utløpt eller ugyldig. Gå til innlogging og trykk “Glemt passord?” på nytt.
            </CardDescription>
          </CardHeader>
          <CardFooter className="flex justify-center">
            <Button asChild>
              <Link href="/login">Til innlogging</Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-900 px-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Sett nytt passord</CardTitle>
          <CardDescription>Velg et nytt passord (PIN).</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="new-password">Nytt passord</Label>
            <div className="relative">
              <Input
                id="new-password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minst 4 tegn"
                className="pr-10"
                autoComplete="new-password"
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
          </div>

          <div className="grid gap-2">
            <Label htmlFor="confirm-password">Gjenta passord</Label>
            <Input
              id="confirm-password"
              type={showPassword ? "text" : "password"}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Gjenta passord"
              autoComplete="new-password"
            />
          </div>
        </CardContent>
        <CardFooter className="flex gap-2">
          <Button type="button" variant="outline" className="flex-1" onClick={() => router.push("/login")} disabled={saving}>
            Avbryt
          </Button>
          <Button type="button" className="flex-1" onClick={handleSave} disabled={saving}>
            {saving ? "Lagrer..." : "Lagre"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
