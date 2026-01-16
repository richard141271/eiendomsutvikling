"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { DevNotesSection } from "@/components/dev-notes-section";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";

export default function SettingsPage() {
  const [loading, setLoading] = useState(false);
  
  // Settings states
  const [fikenSlug, setFikenSlug] = useState("");
  const [fikenToken, setFikenToken] = useState("");
  const [rentPerSqm, setRentPerSqm] = useState(185);
  
  // Fiken connection state
  const [isTesting, setIsTesting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<"idle" | "success" | "error">("idle");

  useEffect(() => {
    // Fetch settings on load
    const fetchSettings = async () => {
      try {
        const res = await fetch("/api/settings");
        if (res.ok) {
          const data = await res.json();
          if (data.fikenCompanySlug) setFikenSlug(data.fikenCompanySlug);
          if (data.fikenApiToken) {
              setFikenToken(data.fikenApiToken);
              if (data.fikenCompanySlug) setConnectionStatus("success");
          }
          if (data.standardRentPerSqm) setRentPerSqm(data.standardRentPerSqm);
        }
      } catch (error) {
        console.error("Failed to load settings", error);
      }
    };
    fetchSettings();
  }, []);

  const handleTestConnection = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!fikenToken) {
        alert("Vennligst lim inn API-nøkkel først");
        return;
    }

    setIsTesting(true);
    setConnectionStatus("idle");
    try {
      const res = await fetch("/api/settings/fiken/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: fikenToken })
      });
      
      const data = await res.json();
      
      if (res.ok && data.companies && data.companies.length > 0) {
        setConnectionStatus("success");
        // Auto-select first company if slug is empty
        if (!fikenSlug) {
            setFikenSlug(data.companies[0].slug);
        }
        // If we found a slug but it's different, maybe ask? For now, just keep existing or set if empty.
        // Actually, if user changes token, they probably want new slug.
        // But let's stick to "set if empty" to be safe.
        
        alert(`Koblet til Fiken! Fant bedriften: ${data.companies[0].name}`);
      } else {
        throw new Error(data.error || "Fant ingen bedrifter");
      }
    } catch (error: any) {
      console.error(error);
      setConnectionStatus("error");
      alert(`Kunne ikke koble til Fiken: ${error.message}`);
    } finally {
      setIsTesting(false);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fikenCompanySlug: fikenSlug,
          fikenApiToken: fikenToken,
          standardRentPerSqm: rentPerSqm
        })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Kunne ikke lagre innstillinger");
      }
      
      alert("Innstillinger lagret!");
    } catch (error: any) {
      console.error(error);
      alert(`Noe gikk galt under lagring: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Innstillinger</h1>
        <p className="text-muted-foreground">
          Administrer din konto, standardverdier og integrasjoner.
        </p>
      </div>

      <Separator />

      <div className="grid gap-6">
        <form onSubmit={handleSaveSettings}>
            <div className="grid gap-6">
                <Card>
                <CardHeader>
                    <CardTitle>Standardverdier</CardTitle>
                    <CardDescription>
                    Sett standardverdier for nye utleieenheter.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid gap-2 max-w-sm">
                        <Label htmlFor="rent">Markedsleie per kvm (NOK)</Label>
                        <Input 
                            id="rent" 
                            type="number"
                            value={rentPerSqm || ""}
                            onChange={(e) => setRentPerSqm(e.target.value === "" ? 0 : parseInt(e.target.value))}
                        />
                        <p className="text-xs text-muted-foreground">
                            Brukes til å automatisk beregne leiepris basert på størrelse.
                        </p>
                    </div>
                </CardContent>
                </Card>

                <Card>
                <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                        Fiken Integrasjon
                        {connectionStatus === "success" && <CheckCircle2 className="h-5 w-5 text-green-500" />}
                        {connectionStatus === "error" && <AlertCircle className="h-5 w-5 text-red-500" />}
                    </CardTitle>
                    <CardDescription>
                    Koble til din Fiken-konto for automatisk fakturering og regnskap.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        <div className="grid gap-2">
                            <Label htmlFor="token">API-nøkkel</Label>
                            <div className="flex gap-2">
                                <Input 
                                    id="token" 
                                    type="password" 
                                    placeholder="••••••••••••••••" 
                                    value={fikenToken}
                                    onChange={(e) => setFikenToken(e.target.value)}
                                />
                                <Button 
                                    variant="outline" 
                                    onClick={handleTestConnection}
                                    disabled={isTesting || !fikenToken}
                                >
                                    {isTesting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Koble til"}
                                </Button>
                            </div>
                            <p className="text-xs text-muted-foreground">
                            Opprettes under &quot;API&quot; i Fiken innstillinger.
                            </p>
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="slug">Fiken Bedrifts-slug</Label>
                            <Input 
                                id="slug" 
                                placeholder="min-bedrift" 
                                value={fikenSlug}
                                onChange={(e) => setFikenSlug(e.target.value)}
                            />
                            <p className="text-xs text-muted-foreground">
                            Hentes automatisk ved tilkobling. Du finner dette også i URL-en (f.eks. fiken.no/foretak/<b>min-bedrift</b>).
                            </p>
                        </div>
                    </div>
                </CardContent>
                </Card>

                <div className="flex justify-end">
                    <Button type="submit" disabled={loading} size="lg">
                        {loading ? "Lagrer..." : "Lagre alle endringer"}
                    </Button>
                </div>
            </div>
        </form>

        <Card>
          <CardHeader>
            <CardTitle>Varslinger</CardTitle>
            <CardDescription>
              Bestem hva du vil varsles om.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
               <div className="flex items-center space-x-2">
                 <input type="checkbox" id="email-notif" className="rounded border-gray-300" defaultChecked />
                 <Label htmlFor="email-notif">E-post ved nye vedlikeholdssaker</Label>
               </div>
               <div className="flex items-center space-x-2">
                 <input type="checkbox" id="sms-notif" className="rounded border-gray-300" />
                 <Label htmlFor="sms-notif">SMS ved signerte kontrakter</Label>
               </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button variant="outline">Lagre varslinger</Button>
          </CardFooter>
        </Card>

        <DevNotesSection />
      </div>
    </div>
  );
}
