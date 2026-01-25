
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
  
  const selectedProperty = properties.find(p => p.id === selectedPropertyId);

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    try {
      const title = formData.get("title") as string;
      const description = formData.get("description") as string;
      const propertyId = formData.get("propertyId") as string;
      const unitId = formData.get("unitId") as string;

      if (!title || !propertyId) {
        alert("Mangler tittel eller eiendom");
        setLoading(false);
        return;
      }

      const project = await createProject({
        title,
        description,
        propertyId,
        unitId: unitId || undefined,
      });

      router.push(`/projects/${project.id}`);
    } catch (error) {
      console.error(error);
      alert("Noe gikk galt");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form action={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="title">Prosjekttittel</Label>
        <Input id="title" name="title" placeholder="F.eks. Oppussing bad 2. etg" required />
      </div>

      <div className="space-y-2">
        <Label htmlFor="propertyId">Eiendom</Label>
        <Select name="propertyId" onValueChange={setSelectedPropertyId} required>
          <SelectTrigger>
            <SelectValue placeholder="Velg eiendom" />
          </SelectTrigger>
          <SelectContent>
            {properties.map((p) => (
              <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedProperty && selectedProperty.units.length > 0 && (
        <div className="space-y-2">
          <Label htmlFor="unitId">Enhet (valgfri)</Label>
          <Select name="unitId">
            <SelectTrigger>
              <SelectValue placeholder="Gjelder hele eiendommen" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Gjelder hele eiendommen</SelectItem>
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
