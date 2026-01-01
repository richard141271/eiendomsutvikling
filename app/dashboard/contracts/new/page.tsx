"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

interface Property {
  id: string;
  name: string;
  units: Unit[];
}

interface Unit {
  id: string;
  name: string;
  status: string;
}

export default function NewContractPage() {
  const router = useRouter();
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPropertyId, setSelectedPropertyId] = useState("");
  const [selectedUnitId, setSelectedUnitId] = useState("");

  useEffect(() => {
    fetch("/api/properties")
      .then((res) => res.json())
      .then((data) => setProperties(data))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const handleNext = () => {
    if (selectedUnitId) {
      router.push(`/dashboard/units/${selectedUnitId}/invite`);
    }
  };

  const selectedProperty = properties.find(p => p.id === selectedPropertyId);

  return (
    <div className="max-w-2xl mx-auto py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Ny Leiekontrakt</h1>
        <p className="text-muted-foreground">Start med å velge eiendom og enhet.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Velg Enhet</CardTitle>
          <CardDescription>Hvilken enhet gjelder kontrakten for?</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Eiendom</Label>
            <Select value={selectedPropertyId} onValueChange={setSelectedPropertyId}>
              <SelectTrigger>
                <SelectValue placeholder="Velg eiendom" />
              </SelectTrigger>
              <SelectContent>
                {properties.map((property) => (
                  <SelectItem key={property.id} value={property.id}>
                    {property.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Enhet</Label>
            <Select 
              value={selectedUnitId} 
              onValueChange={setSelectedUnitId}
              disabled={!selectedPropertyId}
            >
              <SelectTrigger>
                <SelectValue placeholder="Velg enhet" />
              </SelectTrigger>
              <SelectContent>
                {selectedProperty?.units.map((unit) => (
                  <SelectItem key={unit.id} value={unit.id}>
                    {unit.name} ({unit.status})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="pt-4 flex justify-end">
            <Button onClick={handleNext} disabled={!selectedUnitId}>
              Neste: Fyll ut kontrakt
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
