"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Home, Ruler, DollarSign } from "lucide-react";

interface Unit {
  id: string;
  name: string;
  sizeSqm: number;
  rooms: number;
  rentAmount: number;
  status: string;
  property: {
    name: string;
    address: string;
  };
}

export default function AvailableUnitsPage() {
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/units/available")
      .then((res) => res.json())
      .then((data) => setUnits(data))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const handleInterest = (unitId: string) => {
    // In a real app, this would send a request to the backend
    alert(`Interesse meldt for enhet ${unitId}! Vi tar kontakt.`);
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
                    <span>{unit.rooms} rom</span>
                  </div>
                  <div className="flex items-center font-bold">
                    <DollarSign className="h-4 w-4 mr-1 text-muted-foreground" />
                    <span>{unit.rentAmount.toLocaleString()} kr/mnd</span>
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button className="w-full" onClick={() => handleInterest(unit.id)}>
                  Meld interesse
                </Button>
              </CardFooter>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
