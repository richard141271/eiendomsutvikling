"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { createClient } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function MyContractsPage() {
  const [contracts, setContracts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchContracts = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Fetch user from Prisma to get internal ID
        const userRes = await fetch(`/api/users/me`); // Need to ensure this endpoint exists
        if (!userRes.ok) return;
        const userData = await userRes.json();

        // Fetch contracts for this tenant
        // Passing email as query param for MVP authentication
        const res = await fetch(`/api/contracts/my?email=${user.email}`);
        if (res.ok) {
          const data = await res.json();
          setContracts(data);
        }
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    fetchContracts();
  }, []);

  if (loading) return <div>Laster...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Mine leiekontrakter</h1>
        <p className="text-muted-foreground">Her finner du dine aktive og signerte leiekontrakter.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {contracts.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <p className="text-muted-foreground">Du har ingen leiekontrakter enda.</p>
            </CardContent>
          </Card>
        ) : (
          contracts.map((contract) => (
            <Card key={contract.id}>
              <CardHeader>
                <CardTitle>{contract.unit.property.name} - {contract.unit.name}</CardTitle>
                <CardDescription>Status: {contract.status}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-sm">
                  <p><strong>Startdato:</strong> {new Date(contract.startDate).toLocaleDateString()}</p>
                  <p><strong>Leie:</strong> {contract.rentAmount} kr/mnd</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => router.push(`/dashboard/contracts/${contract.id}`)}>
                    Se kontrakt
                  </Button>
                  {contract.status === 'DRAFT' && (
                    <Button onClick={() => router.push(`/dashboard/contracts/${contract.id}`)}>
                      Signer
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
