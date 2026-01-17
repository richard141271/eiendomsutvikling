"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function NewMaintenancePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [units, setUnits] = useState<any[]>([]);
  const [tenants, setTenants] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [unitId, setUnitId] = useState("");
  const [tenantId, setTenantId] = useState("");

  useEffect(() => {
    const init = async () => {
      try {
        // Fetch current user
        const userRes = await fetch("/api/debug/user-info");
        const userData = await userRes.json();
        const user = userData.prismaUserByAuth;
        setCurrentUser(user);

        if (user?.role === "TENANT") {
          setTenantId(user.id);
          setTenants([user]);
        }

        // Fetch units
        const res = await fetch("/api/properties");
        const props = await res.json();
        const allUnits = props.flatMap((p: any) => p.units.map((u: any) => ({ ...u, propertyName: p.name })));
        setUnits(allUnits);

        // Auto-select if only one unit
        if (allUnits.length === 1) {
          setUnitId(allUnits[0].id);
        }
      } catch (e) {
        console.error("Initialization failed", e);
      }
    };
    init();
  }, []);

  // When unit changes, find the active tenant (only if not already set as current user)
  useEffect(() => {
    if (!unitId) return;
    
    // If I am the tenant, I don't need to look for myself
    if (currentUser?.role === "TENANT") return;

    const fetchUnitDetails = async () => {
      try {
        const res = await fetch(`/api/units/${unitId}`);
        if (res.ok) {
          const unit = await res.json();
          // Find active contract
          const activeContract = unit.leaseContracts?.find((c: any) => c.status === "SIGNED");
          if (activeContract) {
            setTenants([activeContract.tenant]);
            setTenantId(activeContract.tenant.id);
          } else {
            setTenants([]);
            setTenantId("");
          }
        }
      } catch (e) {
        console.error("Failed to fetch unit details", e);
      }
    };
    fetchUnitDetails();
  }, [unitId, currentUser]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("/api/maintenance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          unitId,
          tenantId,
        }),
      });

      if (!res.ok) throw new Error("Kunne ikke opprette sak");

      router.push("/dashboard/maintenance");
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
          <CardTitle>Registrer vedlikeholdssak</CardTitle>
          <CardDescription>
            Opprett en ny vedlikeholdssak eller melding.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="unit">Eiendom / Enhet</Label>
                <Select onValueChange={setUnitId} value={unitId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Velg enhet" />
                  </SelectTrigger>
                  <SelectContent>
                    {units.map((unit) => (
                      <SelectItem key={unit.id} value={unit.id}>
                        {unit.propertyName} - {unit.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {tenants.length > 0 && (
                 <div className="space-y-2">
                  <Label>Leietaker</Label>
                  <div className="p-2 border rounded-md bg-muted/20">
                    {tenants[0].name} ({tenants[0].email})
                  </div>
                 </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="title">Tittel</Label>
                <Input 
                  id="title" 
                  placeholder="F.eks. Vannlekkasje på bad" 
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Beskrivelse</Label>
                <Textarea 
                  id="description" 
                  placeholder="Beskriv problemet i detalj..." 
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                  rows={5}
                />
              </div>
            </div>

            <div className="flex justify-end gap-4 pt-4">
              <Button type="button" variant="outline" onClick={() => router.back()}>
                Avbryt
              </Button>
              <Button type="submit" disabled={loading || !unitId || !tenantId}>
                {loading ? "Lagrer..." : "Opprett sak"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
