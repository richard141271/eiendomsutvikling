"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface SettingsClientProps {
  isAdmin: boolean;
}

export function SettingsClient({ isAdmin }: SettingsClientProps) {
  const [loading, setLoading] = useState(false);
  
  // Settings states
  const [rentPerSqm, setRentPerSqm] = useState(185);

  useEffect(() => {
    if (isAdmin) {
      // Fetch settings on load only for admins
      const fetchSettings = async () => {
        try {
          const res = await fetch("/api/settings");
          if (res.ok) {
            const data = await res.json();
            if (data.standardRentPerSqm) setRentPerSqm(data.standardRentPerSqm);
          }
        } catch (error) {
          console.error("Failed to load settings", error);
        }
      };
      fetchSettings();
    }
  }, [isAdmin]);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
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
    <div className="grid gap-6">
      {isAdmin && (
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

                <div className="flex justify-end">
                    <Button type="submit" disabled={loading} size="lg">
                        {loading ? "Lagrer..." : "Lagre alle endringer"}
                    </Button>
                </div>
            </div>
        </form>
      )}

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
  );
}
