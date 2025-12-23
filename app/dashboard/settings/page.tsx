"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

export default function SettingsPage() {
  const [loading, setLoading] = useState(false);
  
  // Fiken states
  const [fikenSlug, setFikenSlug] = useState("");
  const [fikenToken, setFikenToken] = useState("");

  const handleSaveFiken = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // Simulate save
    await new Promise(resolve => setTimeout(resolve, 1000));
    alert("Fiken innstillinger lagret (simulert)");
    setLoading(false);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Innstillinger</h1>
        <p className="text-muted-foreground">
          Administrer din konto og integrasjoner.
        </p>
      </div>

      <Separator />

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Fiken Integrasjon</CardTitle>
            <CardDescription>
              Koble til din Fiken-konto for automatisk fakturering og regnskap.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSaveFiken} className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="slug">Fiken Bedrifts-slug</Label>
                <Input 
                  id="slug" 
                  placeholder="min-bedrift" 
                  value={fikenSlug}
                  onChange={(e) => setFikenSlug(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Du finner dette i URL-en når du er logget inn i Fiken (f.eks. fiken.no/foretak/<b>min-bedrift</b>).
                </p>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="token">API-nøkkel</Label>
                <Input 
                  id="token" 
                  type="password" 
                  placeholder="••••••••••••••••" 
                  value={fikenToken}
                  onChange={(e) => setFikenToken(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Opprettes under "API" i Fiken innstillinger.
                </p>
              </div>
              <Button type="submit" disabled={loading}>
                {loading ? "Lagrer..." : "Lagre Fiken-innstillinger"}
              </Button>
            </form>
          </CardContent>
        </Card>

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
      </div>
    </div>
  );
}
