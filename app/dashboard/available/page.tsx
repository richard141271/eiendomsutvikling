"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Home, Ruler } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createClient } from "@/lib/supabase";

interface Unit {
  id: string;
  name: string;
  sizeSqm: number;
  roomCount: number;
  rentAmount: number;
  status: string;
  imageUrl?: string | null;
  property: {
    name: string;
    address: string;
  };
}

export default function AvailableUnitsPage() {
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUnit, setSelectedUnit] = useState<Unit | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    message: ""
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch("/api/units/available")
      .then((res) => res.json())
      .then((data) => setUnits(data))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));

    // Pre-fill user data
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setFormData(prev => ({
          ...prev,
          email: user.email || "",
          name: user.user_metadata?.full_name || "",
          phone: user.user_metadata?.phone || ""
        }));
      }
    });
  }, []);

  const handleInterestClick = (unit: Unit) => {
    setSelectedUnit(unit);
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUnit) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/interests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          unitId: selectedUnit.id,
          ...formData
        })
      });

      if (res.ok) {
        alert("Interesse meldt! Vi tar kontakt snart.");
        setIsDialogOpen(false);
        setFormData(prev => ({ ...prev, message: "" })); // Reset message only
      } else {
        alert("Noe gikk galt. Prøv igjen.");
      }
    } catch (error) {
      console.error(error);
      alert("Feil ved innsending.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div>Laster ledige boliger...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Ledige Boliger</h1>
        <p className="text-muted-foreground">Her finner du en oversikt over våre ledige utleieenheter.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {units.length === 0 ? (
          <p>Ingen ledige boliger for øyeblikket.</p>
        ) : (
          units.map((unit) => (
            <Card key={unit.id} className="flex flex-col">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-xl">{unit.property.name}</CardTitle>
                    <CardDescription className="flex items-center mt-1">
                      <MapPin className="h-4 w-4 mr-1" />
                      {unit.property.address}
                    </CardDescription>
                  </div>
                  <Badge variant={unit.status === 'AVAILABLE' ? 'default' : 'secondary'}>
                    {unit.status === 'AVAILABLE' ? 'Ledig' : 'Kommer snart'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="flex-1 space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center">
                    <Home className="h-4 w-4 mr-2 text-muted-foreground" />
                    <span>{unit.name}</span>
                  </div>
                  <div className="flex items-center">
                    <Ruler className="h-4 w-4 mr-2 text-muted-foreground" />
                    <span>{unit.sizeSqm} m²</span>
                  </div>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center">
                    <span>{unit.roomCount} rom</span>
                  </div>
                  <div className="flex items-center font-bold">
                    <span>{unit.rentAmount.toLocaleString("no-NO")} NOK/mnd</span>
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button className="w-full" onClick={() => handleInterestClick(unit)}>
                  Meld interesse
                </Button>
              </CardFooter>
            </Card>
          ))
        )}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Meld interesse</DialogTitle>
            <DialogDescription>
              Fyll ut skjemaet for å melde interesse for {selectedUnit?.property.name} - {selectedUnit?.name}.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Navn</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email">E-post</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="phone">Telefon</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="message">Melding (valgfritt)</Label>
                <Textarea
                  id="message"
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  placeholder="Fortell oss gjerne litt om deg selv..."
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Avbryt
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Sender..." : "Send interesse"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
