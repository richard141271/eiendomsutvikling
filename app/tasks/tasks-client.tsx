
"use client";

import { createLocationTask, toggleLocationTask } from "@/app/actions/location-tasks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useState, useEffect } from "react";
import { MapPin, Navigation, Plus, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
// import { toast } from "sonner"; 

interface LocationTask {
  id: string;
  title: string;
  locationName: string;
  latitude: number;
  longitude: number;
  radius: number;
  done: boolean;
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
  const [newLat, setNewLat] = useState<number | null>(null);
  const [newLng, setNewLng] = useState<number | null>(null);

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
        checkProximity(latitude, longitude);
      },
      (err) => {
        console.error(err);
        setGpsLoading(false);
      }
    );
  }

  function checkProximity(lat: number, lng: number) {
    const nearby = tasks.filter(t => !t.done && getDistanceFromLatLonInKm(lat, lng, t.latitude, t.longitude) * 1000 <= t.radius);
    
    if (nearby.length > 0) {
      // Simple alert/toast
      // In a real app, use a proper Toast component
      alert(`Du er i nærheten av ${nearby.length} oppgaver!\n${nearby.map(t => t.title).join(", ")}`);
    }
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
      // Use current location or default (user input needed for location name usually)
      // For "Rask oppgave", we might want to capture current GPS automatically
      
      let lat = newLat;
      let lng = newLng;
      let locName = newLocName || "Ukjent sted";

      if ((!lat || !lng) && userLocation) {
        lat = userLocation.lat;
        lng = userLocation.lng;
        locName = "Min posisjon"; // Or reverse geocode if possible
      }

      if (!lat || !lng) {
        alert("Mangler posisjon. Slå på GPS eller skriv inn koordinater.");
        setLoading(false);
        return;
      }

      await createLocationTask({
        title: newTaskTitle,
        locationName: locName,
        latitude: lat,
        longitude: lng,
      });

      setNewTaskTitle("");
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

  // Sort tasks: Nearby first if location known
  const sortedTasks = [...tasks].sort((a, b) => {
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
        <Button size="icon" variant="outline" onClick={refreshLocation} disabled={gpsLoading}>
          <Navigation className={cn("h-4 w-4", gpsLoading && "animate-spin")} />
        </Button>
      </div>

      {!showNewForm ? (
        <Button className="w-full h-12 text-lg" onClick={() => setShowNewForm(true)}>
          <Plus className="mr-2 h-5 w-5" /> Ny Oppgave
        </Button>
      ) : (
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div>
              <Label>Hva skal gjøres?</Label>
              <Input 
                value={newTaskTitle} 
                onChange={(e) => setNewTaskTitle(e.target.value)} 
                placeholder="F.eks. Hent posten"
              />
            </div>
            
            <div className="flex gap-2 items-end">
               <div className="flex-1">
                 <Label>Stedsnavn</Label>
                 <Input 
                   value={newLocName} 
                   onChange={(e) => setNewLocName(e.target.value)} 
                   placeholder={userLocation ? "Min posisjon" : "Stedsnavn"}
                 />
               </div>
               <Button variant="outline" type="button" onClick={refreshLocation}>
                 <MapPin className="h-4 w-4" />
               </Button>
            </div>

            <div className="flex gap-2">
              <Button className="flex-1" onClick={handleQuickAdd} disabled={loading || !newTaskTitle}>
                Lagre
              </Button>
              <Button variant="ghost" onClick={() => setShowNewForm(false)}>
                Avbryt
              </Button>
            </div>
            {userLocation && <p className="text-xs text-slate-500">Bruker GPS-posisjon: {userLocation.lat.toFixed(4)}, {userLocation.lng.toFixed(4)}</p>}
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {sortedTasks.map((task) => {
          const distance = userLocation 
            ? getDistanceFromLatLonInKm(userLocation.lat, userLocation.lng, task.latitude, task.longitude)
            : null;

          return (
            <Card key={task.id} className={cn("transition-colors", task.done ? "opacity-60 bg-slate-50" : "bg-white")}>
              <CardContent className="p-4 flex items-center gap-4">
                <Checkbox 
                  checked={task.done} 
                  onCheckedChange={() => handleToggle(task.id, task.done)}
                  className="w-6 h-6"
                />
                <div className="flex-1 min-w-0">
                  <h3 className={cn("font-medium text-lg", task.done && "line-through")}>{task.title}</h3>
                  <div className="flex items-center text-sm text-slate-500 gap-2">
                    <MapPin className="w-3 h-3" />
                    <span>{task.locationName}</span>
                    {distance !== null && (
                      <span className={cn("text-xs px-1.5 py-0.5 rounded", distance < 0.2 ? "bg-emerald-100 text-emerald-800" : "bg-slate-100")}>
                        {distance < 1 ? `${Math.round(distance * 1000)}m` : `${distance.toFixed(1)}km`}
                      </span>
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
