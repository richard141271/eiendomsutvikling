"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function EditContractPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  
  // In a real app, we would fetch the contract here and populate state.
  // For MVP, we'll assume the user is updating rent and dates.
  // We'll fetch the current values in useEffect.
  
  const [formData, setFormData] = useState({
    startDate: "",
    endDate: "",
    rentAmount: "",
    depositAmount: ""
  });

  const [initialized, setInitialized] = useState(false);

  // Fetch initial data
  useState(() => {
    fetch(`/api/contracts/${params.id}`)
      .then(res => res.json())
      .then(data => {
        setFormData({
          startDate: data.startDate ? new Date(data.startDate).toISOString().split('T')[0] : "",
          endDate: data.endDate ? new Date(data.endDate).toISOString().split('T')[0] : "",
          rentAmount: data.rentAmount || "",
          depositAmount: data.depositAmount || ""
        });
        setInitialized(true);
      })
      .catch(err => console.error(err));
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch(`/api/contracts/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) throw new Error("Failed to update");
      router.push(`/dashboard/contracts/${params.id}`);
      router.refresh();
    } catch (error) {
      alert("Kunne ikke oppdatere kontrakten");
    } finally {
      setLoading(false);
    }
  };

  if (!initialized) return <div>Laster...</div>;

  return (
    <div className="max-w-2xl mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle>Rediger kontrakt</CardTitle>
          <CardDescription>Endre vilkårene i kontrakten før signering.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startDate">Startdato</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({...formData, startDate: e.target.value})}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate">Sluttdato</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData({...formData, endDate: e.target.value})}
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="rentAmount">Leie (kr)</Label>
                <Input
                  id="rentAmount"
                  type="number"
                  value={formData.rentAmount}
                  onChange={(e) => setFormData({...formData, rentAmount: e.target.value})}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="depositAmount">Depositum (kr)</Label>
                <Input
                  id="depositAmount"
                  type="number"
                  value={formData.depositAmount}
                  onChange={(e) => setFormData({...formData, depositAmount: e.target.value})}
                  required
                />
              </div>
            </div>

            <div className="flex justify-end gap-4">
              <Button type="button" variant="outline" onClick={() => router.back()}>Avbryt</Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Lagrer..." : "Lagre endringer"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
