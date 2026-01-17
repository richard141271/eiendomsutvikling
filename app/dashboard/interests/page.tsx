"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Interest {
  id: string;
  unitId: string;
  userId?: string | null;
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
  const [selectedInterest, setSelectedInterest] = useState<Interest | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [statusValue, setStatusValue] = useState<Interest["status"] | "">("");
  const [saving, setSaving] = useState(false);

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

  const openDialog = (interest: Interest) => {
    setSelectedInterest(interest);
    setStatusValue(interest.status);
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setSelectedInterest(null);
    setStatusValue("");
  };

  const handleSave = async () => {
    if (!selectedInterest || !statusValue) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/interests/${selectedInterest.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: statusValue }),
      });

      if (!res.ok) {
        throw new Error("Kunne ikke oppdatere interessent");
      }

      const updated = await res.json();

      setInterests((prev) =>
        prev.map((i) => (i.id === updated.id ? { ...i, status: updated.status } : i))
      );

      closeDialog();
    } catch (error) {
      alert("Noe gikk galt ved lagring. Prøv igjen.");
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

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
                    <Badge
                      variant={
                        interest.status === "PENDING"
                          ? "secondary"
                          : interest.status === "CONTACTED" || interest.status === "OFFERED"
                          ? "default"
                          : "destructive"
                      }
                    >
                      {interest.status === "PENDING"
                        ? "Venter"
                        : interest.status === "CONTACTED"
                        ? "Kontaktet"
                        : interest.status === "OFFERED"
                        ? "Tilbudt"
                        : "Avvist"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button variant="outline" size="sm" onClick={() => openDialog(interest)}>
                      Behandle
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={(open) => (open ? setDialogOpen(true) : closeDialog())}>
        <DialogContent>
          {selectedInterest && (
            <>
              <DialogHeader>
                <DialogTitle>Behandle interessent</DialogTitle>
                <DialogDescription>
                  Oppdater status og gå videre til visning eller kontrakt ved behov.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div>
                  <p className="font-medium">{selectedInterest.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {selectedInterest.email}
                    {selectedInterest.phone ? ` • ${selectedInterest.phone}` : ""}
                  </p>
                  <p className="text-sm mt-1">
                    {selectedInterest.unit.property.name} – {selectedInterest.unit.name}
                  </p>
                </div>

                {selectedInterest.message && (
                  <div className="text-sm bg-muted/40 rounded-md p-3">
                    {selectedInterest.message}
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select
                    value={statusValue}
                    onValueChange={(val) =>
                      setStatusValue(val as Interest["status"])
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Velg status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PENDING">Venter</SelectItem>
                      <SelectItem value="CONTACTED">Kontaktet</SelectItem>
                      <SelectItem value="OFFERED">Tilbudt kontrakt</SelectItem>
                      <SelectItem value="REJECTED">Avvist</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex flex-wrap gap-2 pt-2">
                  <Button
                    variant="outline"
                    asChild
                  >
                    <Link href={`/dashboard/units/${selectedInterest.unitId}`}>
                      Åpne enhet
                    </Link>
                  </Button>
                  <Button
                    variant="outline"
                    asChild
                  >
                    <Link href={`/dashboard/units/${selectedInterest.unitId}/invite`}>
                      Opprett kontrakt
                    </Link>
                  </Button>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={closeDialog}>
                  Avbryt
                </Button>
                <Button onClick={handleSave} disabled={saving || !statusValue}>
                  {saving ? "Lagrer..." : "Lagre status"}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
