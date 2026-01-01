"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function InviteTenantPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [inviteSuccess, setInviteSuccess] = useState(false);
  const [unit, setUnit] = useState<any>(null);
  const [interests, setInterests] = useState<any[]>([]);
  const [selectedInterestId, setSelectedInterestId] = useState("manual");
  
  // Form states
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [rentAmount, setRentAmount] = useState("");
  const [depositAmount, setDepositAmount] = useState("");

  useEffect(() => {
    // Fetch unit details
    const fetchUnit = async () => {
      try {
        const res = await fetch(`/api/units/${params.id}`);
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

    // Fetch interests
    const fetchInterests = async () => {
        try {
            const res = await fetch(`/api/interests?unitId=${params.id}`);
            if (res.ok) {
                const data = await res.json();
                setInterests(data);
            }
        } catch (e) {
            console.error("Failed to fetch interests", e);
        }
    }

    fetchUnit();
    fetchInterests();
  }, [params.id]);

  const handleInterestChange = (val: string) => {
      setSelectedInterestId(val);
      if (val === "manual") {
          setName("");
          setEmail("");
          setPhone("");
      } else {
          const interest = interests.find(i => i.id === val);
          if (interest) {
              setName(interest.name);
              setEmail(interest.email);
              setPhone(interest.phone || "");
          }
      }
  }

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

      setInviteSuccess(true);
      router.refresh();
    } catch (error) {
      alert("Noe gikk galt. Prøv igjen.");
    } finally {
      setLoading(false);
    }
  };

  if (inviteSuccess) {
    return (
      <div className="max-w-2xl mx-auto py-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-green-600">Kontrakt opprettet og invitasjon sendt!</CardTitle>
            <CardDescription>
              Kontrakt er opprettet og ligger klar.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-green-50 p-4 rounded-lg border border-green-100">
              <p className="font-medium text-green-800">Viktig informasjon:</p>
              <p className="text-sm text-green-700 mt-1">
                Invitasjon er sendt på e-post til <strong>{email}</strong>.
              </p>
              <p className="text-sm text-green-700 mt-2">
                Leietaker kan nå logge inn på appen for å se og signere kontrakten.
              </p>
            </div>
            <Button onClick={() => router.push(`/dashboard/units/${params.id}`)} className="w-full">
              Tilbake til enhet
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle>Opprett Kontrakt</CardTitle>
          <CardDescription>
            Velg en interessent eller fyll ut manuelt for å opprette kontrakt.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* Interest Selector */}
            {interests.length > 0 && (
                <div className="space-y-2">
                    <Label>Velg Interessent (Valgfritt)</Label>
                    <Select value={selectedInterestId} onValueChange={handleInterestChange}>
                        <SelectTrigger>
                            <SelectValue placeholder="Velg fra liste" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="manual">Fyll ut manuelt</SelectItem>
                            {interests.map(i => (
                                <SelectItem key={i.id} value={i.id}>
                                    {i.name} ({new Date(i.createdAt).toLocaleDateString()})
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            )}

            <div className="space-y-4">
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Leietaker</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                {loading ? "Oppretter..." : "Opprett & Send"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
