"use client";

import { useEffect, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";

interface Interest {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  message: string | null;
  status: "PENDING" | "CONTACTED" | "REJECTED" | "OFFERED";
  createdAt: string;
  unit: {
    name: string;
    property: {
      name: string;
    };
  };
}

export default function InterestsPage() {
  const [interests, setInterests] = useState<Interest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/interests")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch");
        return res.json();
      })
      .then((data) => setInterests(data))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div>Laster interessenter...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Interessenter</h1>
        <p className="text-muted-foreground">Oversikt over personer som har meldt interesse for boliger.</p>
      </div>

      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Dato</TableHead>
              <TableHead>Navn</TableHead>
              <TableHead>Kontakt</TableHead>
              <TableHead>Bolig</TableHead>
              <TableHead>Melding</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Handling</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {interests.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-4">
                  Ingen interessenter funnet.
                </TableCell>
              </TableRow>
            ) : (
              interests.map((interest) => (
                <TableRow key={interest.id}>
                  <TableCell>{format(new Date(interest.createdAt), "dd.MM.yyyy HH:mm")}</TableCell>
                  <TableCell className="font-medium">{interest.name}</TableCell>
                  <TableCell>
                    <div className="text-sm">{interest.email}</div>
                    <div className="text-xs text-muted-foreground">{interest.phone}</div>
                  </TableCell>
                  <TableCell>
                    {interest.unit.property.name} - {interest.unit.name}
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate" title={interest.message || ""}>
                    {interest.message}
                  </TableCell>
                  <TableCell>
                    <Badge variant={
                      interest.status === 'PENDING' ? 'secondary' :
                      interest.status === 'CONTACTED' ? 'default' :
                      interest.status === 'OFFERED' ? 'default' : 'destructive'
                    }>
                      {interest.status === 'PENDING' ? 'Venter' :
                       interest.status === 'CONTACTED' ? 'Kontaktet' :
                       interest.status === 'OFFERED' ? 'Tilbudt' : 'Avvist'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button variant="outline" size="sm" onClick={() => alert("Kommer snart: Endre status / Kontakt")}>
                      Behandle
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
