
"use client";

import { createLocationTask, toggleLocationTask, toggleLocationTaskItem, createRestList } from "@/app/actions/location-tasks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState, useEffect } from "react";
import { MapPin, Navigation, Plus, Loader2, Trash2, ListTodo, Map as MapIcon, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import MapPickerLoader from "@/components/ui/map-picker-loader";
// import { toast } from "sonner"; 

interface LocationTaskItem {
  id: string;
  content: string;
  done: boolean;
}

interface LocationTask {
  id: string;
  title: string;
  locationName: string;
  address?: string | null;
  latitude: number;
  longitude: number;
  radius: number;
  done: boolean;
  type?: string;
  items?: LocationTaskItem[];
}

interface TasksClientProps {
  tasks: LocationTask[];
}

export default function TasksClient({ tasks }: TasksClientProps) {
  const router = useRouter();
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [loading, setLoading] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [showNewForm, setShowNewForm] = useState(false);

  // New Task Form State
  const [newLocName, setNewLocName] = useState("");
  const [newAddress, setNewAddress] = useState("");
  const [newLat, setNewLat] = useState<number | null>(null);
  const [newLng, setNewLng] = useState<number | null>(null);
  
  // Checklist State
  const [taskType, setTaskType] = useState<"SIMPLE" | "CHECKLIST">("SIMPLE");
  const [checklistItems, setChecklistItems] = useState<string[]>([]);
  const [newItemText, setNewItemText] = useState("");

  // UI State for map
  const [showMap, setShowMap] = useState(false);

  useEffect(() => {
    // Check location on mount
    refreshLocation();
  }, []);

  function refreshLocation() {
    if (!navigator.geolocation) return;
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setUserLocation({ lat: latitude, lng: longitude });
        setGpsLoading(false);
        // Only set form location if not already set manually
        if (!newLat && !newLng) {
          setNewLat(latitude);
          setNewLng(longitude);
        }
      },
      (err) => {
        console.error(err);
        setGpsLoading(false);
      }
    );
  }

  function addChecklistItem() {
    if (!newItemText.trim()) return;
    setChecklistItems([...checklistItems, newItemText.trim()]);
    setNewItemText("");
  }

  function removeChecklistItem(index: number) {
    setChecklistItems(checklistItems.filter((_, i) => i !== index));
  }

  // Haversine formula
  function getDistanceFromLatLonInKm(lat1: number, lon1: number, lat2: number, lon2: number) {
    var R = 6371; // Radius of the earth in km
    var dLat = deg2rad(lat2-lat1);  // deg2rad below
    var dLon = deg2rad(lon2-lon1); 
    var a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2)
      ; 
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
    var d = R * c; // Distance in km
    return d;
  }

  function deg2rad(deg: number) {
    return deg * (Math.PI/180)
  }

  async function handleQuickAdd() {
    if (!newTaskTitle) return;
    
    setLoading(true);
    try {
      let lat = newLat;
      let lng = newLng;
      let locName = newLocName || "Ukjent sted";

      if ((!lat || !lng) && userLocation) {
        lat = userLocation.lat;
        lng = userLocation.lng;
        if (!newLocName) locName = "Min posisjon"; 
      }

      if (!lat || !lng) {
        alert("Mangler posisjon. Velg sted i kartet eller slå på GPS.");
        setLoading(false);
        return;
      }

      await createLocationTask({
        title: newTaskTitle,
        locationName: locName,
        address: newAddress,
        latitude: lat,
        longitude: lng,
        type: taskType,
        items: taskType === "CHECKLIST" ? checklistItems : undefined,
      });

      setNewTaskTitle("");
      setNewLocName("");
      setNewAddress("");
      setChecklistItems([]);
      setTaskType("SIMPLE");
      setShowNewForm(false);
      router.refresh();
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  async function handleToggle(id: string, done: boolean) {
    await toggleLocationTask(id, !done);
    router.refresh();
  }

  async function handleToggleItem(itemId: string, done: boolean) {
    await toggleLocationTaskItem(itemId, done);
    // Don't refresh whole page for item toggle to avoid layout shift, 
    // but in this simple version we might need to to see update? 
    // Optimistic update would be better.
    router.refresh();
  }

  async function handleCreateRestList(taskId: string, items: LocationTaskItem[]) {
    if (!confirm("Vil du opprette en restliste med de gjenstående punktene og fullføre denne oppgaven?")) return;
    
    const unchecked = items.filter(i => !i.done).map(i => i.content);
    if (unchecked.length === 0) return;

    setLoading(true);
    try {
      await createRestList(taskId, unchecked);
      router.refresh();
    } catch (e) {
      console.error(e);
      alert("Noe gikk galt ved opprettelse av restliste.");
    } finally {
      setLoading(false);
    }
  }

  // Sort tasks: Nearby first if location known
  const safeTasks = Array.isArray(tasks) ? tasks : [];
  const sortedTasks = [...safeTasks].sort((a, b) => {
    if (a.done === b.done) {
      if (userLocation) {
        const distA = getDistanceFromLatLonInKm(userLocation.lat, userLocation.lng, a.latitude, a.longitude);
        const distB = getDistanceFromLatLonInKm(userLocation.lat, userLocation.lng, b.latitude, b.longitude);
        return distA - distB;
      }
      return 0;
    }
    return a.done ? 1 : -1;
  });

  return (
    <div className="space-y-6 pb-24">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Stedsbaserte Oppgaver</h1>
        <Button variant="outline" onClick={refreshLocation} disabled={gpsLoading} className="flex gap-2">
          <Navigation className={cn("h-4 w-4", gpsLoading && "animate-spin")} />
          <span className="sr-only sm:not-sr-only sm:inline-block">Oppdater posisjon</span>
        </Button>
      </div>

      {!showNewForm ? (
        <Button className="w-full h-12 text-lg" onClick={() => setShowNewForm(true)}>
          <Plus className="mr-2 h-5 w-5" /> Ny Oppgave
        </Button>
      ) : (
        <Card>
          <CardContent className="pt-6 space-y-4">
            <Tabs value={taskType} onValueChange={(v) => setTaskType(v as any)}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="SIMPLE">Enkel Oppgave</TabsTrigger>
                <TabsTrigger value="CHECKLIST">Sjekkliste</TabsTrigger>
              </TabsList>
              
              <div className="mt-4 space-y-4">
                <div>
                  <Label>Tittel / Oppgave</Label>
                  <Input 
                    value={newTaskTitle} 
                    onChange={(e) => setNewTaskTitle(e.target.value)} 
                    placeholder={taskType === "SIMPLE" ? "F.eks. Hent posten" : "F.eks. Hente utstyr"}
                  />
                </div>

                {taskType === "CHECKLIST" && (
                  <div className="space-y-2">
                    <Label>Punkter til liste</Label>
                    <div className="flex gap-2">
                      <Input 
                        value={newItemText} 
                        onChange={(e) => setNewItemText(e.target.value)} 
                        placeholder="F.eks. Hammer"
                        onKeyDown={(e) => { if(e.key === 'Enter') addChecklistItem() }}
                      />
                      <Button type="button" onClick={addChecklistItem} variant="secondary">
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    {checklistItems.length > 0 && (
                      <ul className="space-y-1 mt-2">
                        {checklistItems.map((item, idx) => (
                          <li key={idx} className="flex items-center justify-between bg-slate-50 p-2 rounded text-sm">
                            <span>{item}</span>
                            <button onClick={() => removeChecklistItem(idx)} className="text-red-500">
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
                
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label>Sted</Label>
                    <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => setShowMap(!showMap)}>
                      {showMap ? "Skjul kart" : "Vis kart"}
                    </Button>
                  </div>
                  
                  {showMap && (
                    <div className="mb-2">
                      <MapPickerLoader 
                        position={newLat && newLng ? { lat: newLat, lng: newLng } : (userLocation || null)} 
                        setPosition={(pos) => {
                          setNewLat(pos.lat);
                          setNewLng(pos.lng);
                          // Optionally reverse geocode here if we had an API
                        }} 
                      />
                      <div className="flex justify-between items-center mt-1">
                        <p className="text-xs text-slate-500">Trykk i kartet for å velge posisjon.</p>
                        {newLat && newLng && (
                           <p className="text-xs text-slate-400">
                             {newLat.toFixed(4)}, {newLng.toFixed(4)}
                           </p>
                        )}
                      </div>
                    </div>
                  )}

                  <Input 
                    value={newLocName} 
                    onChange={(e) => setNewLocName(e.target.value)} 
                    placeholder={userLocation ? "Min posisjon" : "Stedsnavn"}
                  />
                  <Input 
                    value={newAddress} 
                    onChange={(e) => setNewAddress(e.target.value)} 
                    placeholder="Adresse (valgfritt)"
                  />
                </div>
              </div>
            </Tabs>

            <div className="flex gap-2 pt-2">
              <Button className="flex-1" onClick={handleQuickAdd} disabled={loading || !newTaskTitle}>
                Lagre
              </Button>
              <Button variant="ghost" onClick={() => setShowNewForm(false)}>
                Avbryt
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {sortedTasks.map((task) => {
          const distance = userLocation 
            ? getDistanceFromLatLonInKm(userLocation.lat, userLocation.lng, task.latitude, task.longitude)
            : null;

          const isChecklist = task.type === "CHECKLIST" || (task.items && task.items.length > 0);
          const uncheckedItems = task.items?.filter(i => !i.done) || [];

          return (
            <Card key={task.id} className={cn("transition-colors", task.done ? "opacity-60 bg-slate-50" : "bg-white")}>
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  {!isChecklist && (
                    <Checkbox 
                      checked={task.done} 
                      onCheckedChange={() => handleToggle(task.id, task.done)}
                      className="w-6 h-6 mt-1"
                    />
                  )}
                  {isChecklist && (
                    <div className="mt-1">
                      <ListTodo className="w-6 h-6 text-slate-400" />
                    </div>
                  )}
                  
                  <div className="flex-1 min-w-0">
                    <h3 className={cn("font-medium text-lg", task.done && "line-through")}>{task.title}</h3>
                    <div className="flex flex-wrap items-center text-sm text-slate-500 gap-2 mt-1">
                      <MapPin className="w-3 h-3" />
                      <span>{task.locationName}</span>
                      {task.address && <span className="text-slate-400">({task.address})</span>}
                      {distance !== null && (
                        <span className={cn("text-xs px-1.5 py-0.5 rounded", distance < 0.2 ? "bg-emerald-100 text-emerald-800" : "bg-slate-100")}>
                          {distance < 1 ? `${Math.round(distance * 1000)}m` : `${distance.toFixed(1)}km`}
                        </span>
                      )}
                    </div>

                    {isChecklist && task.items && (
                      <div className="mt-4 space-y-2">
                        {task.items.map(item => (
                          <div key={item.id} className="flex items-center gap-2">
                            <Checkbox 
                              checked={item.done} 
                              onCheckedChange={(checked) => handleToggleItem(item.id, checked as boolean)}
                              id={item.id}
                            />
                            <label 
                              htmlFor={item.id}
                              className={cn("text-sm cursor-pointer select-none", item.done && "line-through text-slate-400")}
                            >
                              {item.content}
                            </label>
                          </div>
                        ))}
                        
                        {!task.done && uncheckedItems.length > 0 && uncheckedItems.length < task.items.length && (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="mt-2 w-full text-xs"
                            onClick={() => handleCreateRestList(task.id, task.items!)}
                          >
                            <RotateCcw className="w-3 h-3 mr-2" />
                            Fullfør og lag restliste ({uncheckedItems.length} gjenstår)
                          </Button>
                        )}

                        {!task.done && uncheckedItems.length === 0 && task.items.length > 0 && (
                           <Button 
                           variant="default" 
                           size="sm" 
                           className="mt-2 w-full text-xs bg-emerald-600 hover:bg-emerald-700"
                           onClick={() => handleToggle(task.id, false)} // Actually this marks it as done in UI logic if we click it
                         >
                           Marker hele oppgaven som ferdig
                         </Button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
        {sortedTasks.length === 0 && <p className="text-center text-slate-500">Ingen oppgaver.</p>}
      </div>
    </div>
  );
}
