"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createClient } from "@/lib/supabase";
import { resetUserPassword } from "@/app/actions/user-actions";
import { fetchCityFromPostalCode } from "@/app/actions/postal-actions";

export default function EditUserPage({ params }: { params: { id: string } }) {
  const [user, setUser] = useState<any>(null);
  const [currentUser, setCurrentUser] = useState<any>(null); // To check permissions
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [isResetting, setIsResetting] = useState(false);
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

  // Auto-fetch city from postal code
  useEffect(() => {
    if (user?.postalCode && user.postalCode.length === 4) {
      fetchCityFromPostalCode(user.postalCode).then(city => {
        if (city && city !== user.city) {
          setUser((prev: any) => ({ ...prev, city }));
        }
      });
    }
  }, [user?.postalCode]);

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

  const handlePasswordReset = async () => {
    if (!newPassword || newPassword.length < 6) {
      alert("Passordet må være minst 6 tegn.");
      return;
    }
    
    setIsResetting(true);
    try {
      const result = await resetUserPassword(params.id, newPassword);
      if (result.success) {
        alert("Passordet er oppdatert!");
        setNewPassword("");
      } else {
        alert("Feil ved oppdatering av passord: " + result.error);
      }
    } catch (error) {
      console.error(error);
      alert("Noe gikk galt.");
    } finally {
      setIsResetting(false);
    }
  };

  if (loading) return <div>Laster bruker...</div>;
  if (!user) return <div>Bruker ikke funnet.</div>;

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Rediger Bruker</h1>
        <p className="text-muted-foreground">Endre informasjon og tilgang.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 border p-6 rounded-md bg-white">
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
          <Label htmlFor="address">Adresse</Label>
          <Input
            id="address"
            value={user.address || ""}
            onChange={(e) => setUser({ ...user, address: e.target.value })}
          />
        </div>
        <div className="grid gap-2 md:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="postalCode">Postnummer</Label>
            <Input
              id="postalCode"
              value={user.postalCode || ""}
              onChange={(e) => setUser({ ...user, postalCode: e.target.value })}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="city">Sted</Label>
            <Input
              id="city"
              value={user.city || ""}
              onChange={(e) => setUser({ ...user, city: e.target.value })}
            />
          </div>
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

      <div className="border rounded-md p-6 space-y-4 bg-white border-red-100">
        <div>
          <h2 className="text-xl font-bold text-red-900">Sikkerhet</h2>
          <p className="text-muted-foreground text-sm">Administrer passord for brukeren. (Kun for testing/admin)</p>
        </div>
        <div className="flex gap-4 items-end">
          <div className="grid gap-2 flex-1">
             <Label htmlFor="new-password">Nytt passord</Label>
             <Input 
                id="new-password" 
                type="text" 
                placeholder="Skriv nytt passord..." 
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
             />
          </div>
          <Button 
            variant="destructive" 
            onClick={handlePasswordReset}
            disabled={isResetting || !newPassword}
          >
            {isResetting ? "Oppdaterer..." : "Oppdater passord"}
          </Button>
        </div>
      </div>

      {user.role === 'TENANT' && (
         <div className="border rounded-md p-6 space-y-4 bg-white">
           <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold">Leiekontrakter</h2>
              <Button variant="secondary" size="sm" asChild>
                <Link href={`/dashboard/tenants/${user.id}`}>Gå til full leietakerprofil</Link>
              </Button>
           </div>
           
           {user.leaseContracts && user.leaseContracts.length > 0 ? (
             <div className="grid gap-4">
               {user.leaseContracts.map((contract: any) => {
                 const moveIn = contract.InspectionProtocol?.find((p: any) => p.type === 'MOVE_IN');
                 return (
                   <div key={contract.id} className="flex items-center justify-between border p-4 rounded bg-slate-50">
                      <div>
                        <div className="font-medium">{contract.unit.name}</div>
                        <div className="text-sm text-muted-foreground">{contract.unit.property.name}</div>
                        <div className="text-xs text-muted-foreground mt-1">
                           {contract.startDate ? new Date(contract.startDate).toLocaleDateString() : '-'} - {contract.endDate ? new Date(contract.endDate).toLocaleDateString() : 'Løpende'}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {moveIn && (
                            <Button variant="outline" size="sm" asChild className="hidden sm:flex">
                                <Link href={`/dashboard/contracts/${contract.id}/inspection/${moveIn.id}`}>
                                    Protokoll
                                </Link>
                            </Button>
                        )}
                        <Button variant="outline" size="sm" asChild>
                          <Link href={`/dashboard/contracts/${contract.id}`}>Vis kontrakt</Link>
                        </Button>
                      </div>
                   </div>
                 );
               })}
             </div>
           ) : (
             <div className="text-center py-6 text-muted-foreground">
               <p>Ingen kontrakter funnet.</p>
               <Button variant="link" asChild className="mt-2">
                  <Link href="/dashboard/contracts/new">Opprett ny kontrakt</Link>
               </Button>
             </div>
           )}
         </div>
       )}
    </div>
  );
}
