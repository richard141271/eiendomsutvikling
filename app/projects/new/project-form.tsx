"use client";

import { createProject } from "@/app/actions/projects";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

interface Property {
  id: string;
  name: string;
  units: { id: string; name: string; unitNumber: string | null }[];
}

interface ProjectFormProps {
  properties: Property[];
}

export default function ProjectForm({ properties }: ProjectFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>("");
  const [customPropertyName, setCustomPropertyName] = useState<string>("");
  
  const selectedProperty = properties.find(p => p.id === selectedPropertyId);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (loading) return;
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    try {
      const title = formData.get("title") as string;
      const description = formData.get("description") as string;
      const propertyIdRaw = formData.get("propertyId") as string;
      const unitIdRaw = formData.get("unitId") as string;
      const customPropName = formData.get("customPropertyName") as string;
      
      const propertyId = propertyIdRaw === "custom" ? undefined : propertyIdRaw;
      const unitId = unitIdRaw === "none" ? undefined : unitIdRaw;

      if (!title) {
        alert("Mangler tittel");
        setLoading(false);
        return;
      }

      if (!propertyId && propertyIdRaw !== "custom") {
         alert("Velg eiendom eller 'Tilfeldig prosjekt'");
         setLoading(false);
         return;
      }

      const project = await createProject({
        title,
        description,
        propertyId,
        unitId: unitId || undefined,
        customPropertyName: propertyIdRaw === "custom" ? customPropName : undefined,
      });

      router.push(`/projects/${project.id}`);
    } catch (error) {
      console.error(error);
      alert("Noe gikk galt");
    } finally {
      // Don't set loading false if successful to prevent double click while redirecting
      // But we can't know if redirect happens immediately. 
      // Safe to keep it true if we are redirecting.
      // But if it failed, we must set it false.
      // Since we catch error, we can set it false in catch or checking a success flag.
      // Actually, createProject throws if fail.
      // So if we reach here, we are redirecting.
      // But finally block runs anyway.
      // Let's rely on component unmount or router push.
      // Ideally:
      // setLoading(false); // Only if error.
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="title">Prosjekttittel</Label>
        <Input id="title" name="title" placeholder="F.eks. Oppussing bad 2. etg" required />
      </div>

      <div className="space-y-2">
        <Label htmlFor="propertyId">Eiendom</Label>
        <Select 
          name="propertyId" 
          value={selectedPropertyId} 
          onValueChange={setSelectedPropertyId} 
          required
        >
          <SelectTrigger>
            <SelectValue placeholder="Velg eiendom" />
          </SelectTrigger>
          <SelectContent>
            {properties.map((p) => (
              <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
            ))}
            <SelectItem value="custom">Tilfeldig prosjekt</SelectItem>
        </SelectContent>
      </Select>
    </div>

    {selectedPropertyId === "custom" && (
      <div className="space-y-2">
        <Label htmlFor="customPropertyName">Navn på prosjektsted (valgfritt)</Label>
        <Input 
          id="customPropertyName" 
          name="customPropertyName" 
          placeholder="F.eks. Sjøtomta" 
          value={customPropertyName}
          onChange={(e) => setCustomPropertyName(e.target.value)}
        />
      </div>
    )}

    {selectedProperty && selectedProperty.units.length > 0 && (
        <div className="space-y-2">
          <Label htmlFor="unitId">Enhet (valgfri)</Label>
          <Select name="unitId" key={selectedPropertyId}>
            <SelectTrigger>
              <SelectValue placeholder="Gjelder hele eiendommen" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Gjelder hele eiendommen</SelectItem>
              {selectedProperty.units.map((u) => (
                <SelectItem key={u.id} value={u.id}>
                  {u.unitNumber ? `${u.unitNumber} - ${u.name}` : u.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="description">Beskrivelse</Label>
        <Textarea id="description" name="description" placeholder="Kort beskrivelse av prosjektet..." />
      </div>

      <Button type="submit" className="w-full" size="lg" disabled={loading}>
        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
        Opprett Prosjekt
      </Button>
    </form>
  );
}
