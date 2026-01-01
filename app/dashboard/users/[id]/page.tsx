"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createClient } from "@/lib/supabase";

export default function EditUserPage({ params }: { params: { id: string } }) {
  const [user, setUser] = useState<any>(null);
  const [currentUser, setCurrentUser] = useState<any>(null); // To check permissions
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
        // We need to fetch our DB user to check role, but for UI we can just fetch the target user and see if API allows edit
    });

    fetch(`/api/users/${params.id}`)
      .then((res) => res.json())
      .then((data) => setUser(data))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [params.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`/api/users/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(user),
      });

      if (res.ok) {
        alert("Bruker oppdatert!");
        router.refresh();
      } else {
        alert("Feil ved oppdatering.");
      }
    } catch (error) {
      console.error(error);
      alert("Noe gikk galt.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div>Laster bruker...</div>;
  if (!user) return <div>Bruker ikke funnet.</div>;

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Rediger Bruker</h1>
        <p className="text-muted-foreground">Endre informasjon og tilgang.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 border p-6 rounded-md">
        <div className="grid gap-2">
          <Label htmlFor="name">Navn</Label>
          <Input
            id="name"
            value={user.name}
            onChange={(e) => setUser({ ...user, name: e.target.value })}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="email">E-post</Label>
          <Input
            id="email"
            value={user.email}
            disabled // Email usually managed by Auth provider
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="phone">Telefon</Label>
          <Input
            id="phone"
            value={user.phone || ""}
            onChange={(e) => setUser({ ...user, phone: e.target.value })}
          />
        </div>
        
        <div className="grid gap-2">
          <Label htmlFor="role">Rolle</Label>
          <Select
            value={user.role}
            onValueChange={(val) => setUser({ ...user, role: val })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Velg rolle" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="TENANT">Leietaker</SelectItem>
              <SelectItem value="MANAGER">Ansatt / Manager</SelectItem>
              <SelectItem value="ADMIN">Administrator</SelectItem>
              <SelectItem value="OWNER">Eier</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            NB: Kun Administratorer kan endre roller.
          </p>
        </div>

        <div className="flex justify-end gap-2 mt-4">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Avbryt
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? "Lagrer..." : "Lagre endringer"}
          </Button>
        </div>
      </form>
    </div>
  );
}
