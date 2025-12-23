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
  
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [unitId, setUnitId] = useState("");
  const [tenantId, setTenantId] = useState("");

  useEffect(() => {
    // Fetch units for selection
    const fetchUnits = async () => {
      try {
        const res = await fetch("/api/properties"); // This might return properties with units
        // Or we need a specific endpoint for all units. 
        // For now let's assume /api/units exists or we fetch properties and extract units.
        // Actually /api/properties returns properties.
        const props = await res.json();
        const allUnits = props.flatMap((p: any) => p.units.map((u: any) => ({ ...u, propertyName: p.name })));
        setUnits(allUnits);
      } catch (e) {
        console.error("Failed to fetch units", e);
      }
    };
    fetchUnits();
  }, []);

  // When unit changes, find the active tenant
  useEffect(() => {
    if (!unitId) return;
    
    // In a real app we would fetch the tenant for this unit.
    // Here we can mock or fetch if we had an endpoint.
    // For MVP admin form, maybe we just list all users or let admin type/select?
    // Let's assume we can fetch unit details which includes tenant.
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
  }, [unitId]);

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
