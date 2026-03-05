"use client";

import { useState } from "react";
import { format } from "date-fns";
import { nb } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, UserPlus, MessageSquare, Calendar } from "lucide-react";
import { createPerson, createObservation } from "@/app/actions/witness";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface WitnessListProps {
  project: {
    id: string;
    people: any[];
    events: any[];
  };
}

export default function WitnessList({ project }: WitnessListProps) {
  const router = useRouter();
  const [isAddPersonOpen, setIsAddPersonOpen] = useState(false);
  const [isAddObservationOpen, setIsAddObservationOpen] = useState(false);
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);

  // Form states
  const [personName, setPersonName] = useState("");
  const [personRole, setPersonRole] = useState("");
  
  const [observationText, setObservationText] = useState("");
  const [selectedEventId, setSelectedEventId] = useState("");

  const handleAddPerson = async () => {
    try {
      await createPerson(project.id, personName, personRole);
      toast.success("Person lagt til");
      setIsAddPersonOpen(false);
      setPersonName("");
      setPersonRole("");
      router.refresh();
    } catch (error) {
      toast.error("Kunne ikke legge til person");
    }
  };

  const handleAddObservation = async () => {
    if (!selectedPersonId || !selectedEventId) return;
    try {
      // Find event date to use as default observation date?
      const event = project.events.find(e => e.id === selectedEventId);
      const date = event ? new Date(event.date) : new Date();
      
      await createObservation(selectedPersonId, selectedEventId, observationText, date);
      toast.success("Observasjon lagt til");
      setIsAddObservationOpen(false);
      setObservationText("");
      setSelectedEventId("");
      router.refresh();
    } catch (error) {
      toast.error("Kunne ikke legge til observasjon");
    }
  };

  const openAddObservation = (personId: string) => {
    setSelectedPersonId(personId);
    setIsAddObservationOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Dialog open={isAddPersonOpen} onOpenChange={setIsAddPersonOpen}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="mr-2 h-4 w-4" /> Legg til Person
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Legg til ny person/vitne</DialogTitle>
              <DialogDescription>
                Registrer en person som er relevant for saken.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Navn</Label>
                <Input id="name" value={personName} onChange={(e) => setPersonName(e.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="role">Rolle (f.eks. Nabo, Takstmann)</Label>
                <Input id="role" value={personRole} onChange={(e) => setPersonRole(e.target.value)} />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleAddPerson}>Lagre</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {project.people.map((person) => (
          <Card key={person.id} className="flex flex-col">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle>{person.name}</CardTitle>
                  <p className="text-sm text-muted-foreground">{person.role || "Ingen rolle angitt"}</p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => openAddObservation(person.id)}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="flex-1">
              <div className="space-y-4">
                <div className="flex items-center justify-between text-sm font-medium text-muted-foreground">
                  <span>Observasjoner</span>
                  <span className="bg-slate-100 px-2 py-0.5 rounded-full text-xs">
                    {person.witnessObservations.length}
                  </span>
                </div>
                
                <div className="space-y-3">
                  {person.witnessObservations.length === 0 ? (
                    <p className="text-sm text-slate-400 italic">Ingen observasjoner registrert.</p>
                  ) : (
                    person.witnessObservations.map((obs: any) => (
                      <div key={obs.id} className="text-sm border-l-2 border-blue-200 pl-3 py-1">
                        <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
                          <Calendar className="h-3 w-3" />
                          {obs.event?.date ? format(new Date(obs.event.date), "d. MMM yyyy", { locale: nb }) : "Ukjent dato"}
                        </div>
                        <p className="text-slate-700">{obs.observation}</p>
                        {obs.event && (
                          <p className="text-xs text-blue-600 mt-1 truncate">
                            Knyttet til: {obs.event.title}
                          </p>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </CardContent>
            <div className="p-4 pt-0 mt-auto">
              <Button variant="outline" className="w-full" onClick={() => openAddObservation(person.id)}>
                <MessageSquare className="mr-2 h-4 w-4" /> Ny observasjon
              </Button>
            </div>
          </Card>
        ))}
        
        {project.people.length === 0 && (
          <div className="col-span-full flex flex-col items-center justify-center p-12 border-2 border-dashed rounded-lg text-slate-400">
            <UserPlus className="h-12 w-12 mb-4 opacity-20" />
            <p className="text-lg font-medium">Ingen personer registrert</p>
            <p className="text-sm mb-4">Start med å legge til vitner eller andre involverte parter.</p>
            <Button onClick={() => setIsAddPersonOpen(true)}>Legg til Person</Button>
          </div>
        )}
      </div>

      {/* Add Observation Dialog */}
      <Dialog open={isAddObservationOpen} onOpenChange={setIsAddObservationOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ny observasjon</DialogTitle>
            <DialogDescription>
              Knytt en observasjon til en hendelse.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="event">Hendelse</Label>
              <Select value={selectedEventId} onValueChange={setSelectedEventId}>
                <SelectTrigger>
                  <SelectValue placeholder="Velg hendelse" />
                </SelectTrigger>
                <SelectContent>
                  {project.events.map((event) => (
                    <SelectItem key={event.id} value={event.id}>
                      {format(new Date(event.date), "d. MMM yyyy", { locale: nb })} - {event.title}
                    </SelectItem>
                  ))}
                  {project.events.length === 0 && (
                     <div className="p-2 text-sm text-muted-foreground text-center">Ingen hendelser funnet. Bruk &quot;Auto-grupper&quot; i bevisoversikten først.</div>
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="observation">Observasjon</Label>
              <Textarea 
                id="observation" 
                value={observationText} 
                onChange={(e) => setObservationText(e.target.value)} 
                placeholder="Hva ble observert?"
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleAddObservation} disabled={!selectedEventId || !observationText}>
              Lagre Observasjon
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
