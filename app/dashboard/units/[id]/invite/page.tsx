"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function InviteTenantPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [unit, setUnit] = useState<any>(null);
  
  // Form states
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [rentAmount, setRentAmount] = useState("");
  const [depositAmount, setDepositAmount] = useState("");

  useEffect(() => {
    // Fetch unit details to pre-fill rent/deposit
    // In a real app we would fetch this. For MVP without DB connection working yet,
    // we might skip pre-filling or mock it if fetch fails.
    const fetchUnit = async () => {
      try {
        const res = await fetch(`/api/units/${params.id}`); // This might fail if API not ready
        if (res.ok) {
          const data = await res.json();
          setUnit(data);
          setRentAmount(data.rentAmount?.toString() || "");
          setDepositAmount(data.depositAmount?.toString() || "");
        }
      } catch (e) {
        console.error("Failed to fetch unit", e);
      }
    };
    fetchUnit();
  }, [params.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch(`/api/units/${params.id}/invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          phone,
          startDate,
          endDate,
          rentAmount,
          depositAmount
        }),
      });

      if (!res.ok) throw new Error("Kunne ikke sende invitasjon");

      router.push(`/dashboard/units/${params.id}`);
      router.refresh();
    } catch (error) {
      alert("Noe gikk galt. Prøv igjen.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle>Inviter leietaker og opprett kontrakt</CardTitle>
          <CardDescription>
            Fyll inn detaljene for å invitere en leietaker. Dette vil opprette et kontraktsutkast.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Leietaker</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Fullt navn</Label>
                  <Input 
                    id="name" 
                    placeholder="Ola Nordmann" 
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">E-post</Label>
                  <Input 
                    id="email" 
                    type="email" 
                    placeholder="ola@eksempel.no" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Telefon</Label>
                <Input 
                  id="phone" 
                  placeholder="+47 99 99 99 99" 
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Kontraktsdetaljer</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startDate">Startdato</Label>
                  <Input 
                    id="startDate" 
                    type="date" 
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endDate">Sluttdato (valgfritt)</Label>
                  <Input 
                    id="endDate" 
                    type="date" 
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="rent">Månedsleie (kr)</Label>
                  <Input 
                    id="rent" 
                    type="number" 
                    value={rentAmount}
                    onChange={(e) => setRentAmount(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="deposit">Depositum (kr)</Label>
                  <Input 
                    id="deposit" 
                    type="number" 
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                    required
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-4 pt-4">
              <Button type="button" variant="outline" onClick={() => router.back()}>
                Avbryt
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Sender..." : "Send invitasjon"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
