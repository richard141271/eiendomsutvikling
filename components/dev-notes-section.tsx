"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ImageUpload } from "@/components/image-upload";
import { createDevNote, getDevNotes, deleteDevNote, toggleDevNoteResolved } from "@/app/actions/dev-notes";
import { getCurrentUser } from "@/app/actions/user-sync";
import { Trash2, CheckCircle2, Circle, Loader2, Copy, Check, Info } from "lucide-react";
import { format } from "date-fns";
import { nb } from "date-fns/locale";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface DevNote {
  id: string;
  content: string;
  author: string | null;
  isResolved: boolean;
  createdAt: Date;
  imageUrl?: string | null;
}

export function DevNotesSection() {
  const [notes, setNotes] = useState<DevNote[]>([]);
  const [content, setContent] = useState("");
  const [author, setAuthor] = useState("Pål-Martin");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [showStatusBanner, setShowStatusBanner] = useState(true);

  useEffect(() => {
    loadNotes();
    // Load current user or saved author
    const initAuthor = async () => {
        try {
            const user = await getCurrentUser();
            if (user && user.name) {
                setAuthor(user.name);
            } else {
                const savedAuthor = localStorage.getItem("devNoteAuthor");
                if (savedAuthor) setAuthor(savedAuthor);
            }
        } catch (error) {
            console.error("Failed to fetch user:", error);
            const savedAuthor = localStorage.getItem("devNoteAuthor");
            if (savedAuthor) setAuthor(savedAuthor);
        }
    };
    initAuthor();
    
    // Load banner preference
    const savedBanner = localStorage.getItem("showDevStatusBanner");
    if (savedBanner !== null) {
      setShowStatusBanner(savedBanner === "true");
    }
  }, []);

  const toggleBanner = () => {
    const newState = !showStatusBanner;
    setShowStatusBanner(newState);
    localStorage.setItem("showDevStatusBanner", String(newState));
  };

  const loadNotes = async () => {
    setFetching(true);
    const res = await getDevNotes();
    if (res.success && res.data) {
      setNotes(res.data as unknown as DevNote[]);
    }
    setFetching(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    setLoading(true);
    const res = await createDevNote(content, author, imageUrl);
    if (res.success && res.data) {
      // Optimistic update might be tricky with dates, so let's reload to be safe and get the server-side timestamp
      await loadNotes();
      setContent("");
      setImageUrl(null);
      localStorage.setItem("devNoteAuthor", author);
    }
    setLoading(false);
  };

  const handleToggle = async (id: string, currentStatus: boolean) => {
    // Optimistic update
    setNotes(notes.map(n => n.id === id ? { ...n, isResolved: !currentStatus } : n));
    await toggleDevNoteResolved(id, !currentStatus);
    // Refresh to update counts/sorting if needed
    loadNotes();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Slett notat?")) return;
    setNotes(notes.filter(n => n.id !== id));
    await deleteDevNote(id);
    loadNotes();
  };

  const handleCopy = (note: DevNote) => {
    navigator.clipboard.writeText(note.content);
    setCopiedId(note.id);
    setTimeout(() => setCopiedId(null), 2000);
  };
  
  const unresolvedNotes = notes.filter(n => !n.isResolved);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
            <CardTitle>Notater (Utvikling & Testing)</CardTitle>
            <CardDescription>
            Interne notater mellom Pål-Martin og Utvikler. Legg inn bugs, ønsker eller endringer her.
            </CardDescription>
        </div>
        <Button variant="outline" size="sm" onClick={toggleBanner}>
            {showStatusBanner ? "Skjul status" : "Vis status"}
        </Button>
      </CardHeader>
      <CardContent className="space-y-6">
        {showStatusBanner && (
            <Alert className="bg-blue-50 border-blue-200">
            <Info className="h-4 w-4 text-blue-600" />
            <AlertTitle className="text-blue-800">Status fra Utvikler</AlertTitle>
            <AlertDescription className="text-blue-700">
                Jeg har sett notatene som ligger her (per 16.01.2026), men har ikke rukket å gjøre noe med alle enda.
            </AlertDescription>
            </Alert>
        )}
        
        {/* Compact Todo List for Unresolved Items */}
        {unresolvedNotes.length > 0 && (
          <div className="border rounded-md p-4 bg-yellow-50/50">
            <h3 className="font-medium mb-3 flex items-center gap-2">
                <Circle className="h-4 w-4 text-yellow-600" />
                Gjenstående oppgaver ({unresolvedNotes.length})
            </h3>
            <ul className="space-y-2">
              {unresolvedNotes.map((note) => (
                <li key={note.id} className="flex justify-between items-start text-sm bg-white p-2 rounded border shadow-sm">
                  <span className="text-slate-700">{note.content}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400">{note.author}</span>
                    <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-6 w-6 p-0 hover:bg-green-100 hover:text-green-600"
                        onClick={() => handleToggle(note.id, note.isResolved)}
                        title="Marker som løst"
                    >
                        <Check className="h-4 w-4" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 bg-slate-50 p-4 rounded-lg border">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
             <div className="md:col-span-1 space-y-2">
                <Label htmlFor="author">Navn</Label>
                <Input 
                    id="author" 
                    value={author} 
                    onChange={(e) => setAuthor(e.target.value)}
                    placeholder="Ditt navn"
                />
                <div className="flex gap-1">
                   <Button type="button" variant="outline" size="sm" className="text-xs h-6 px-2" onClick={() => setAuthor("Pål-Martin")}>
                     PM
                   </Button>
                   <Button type="button" variant="outline" size="sm" className="text-xs h-6 px-2" onClick={() => setAuthor("Utvikler")}>
                     Utvikler
                   </Button>
                </div>
             </div>
             <div className="md:col-span-3 space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="content">Notat</Label>
                  <div className="flex gap-2">
                      <Input 
                          id="content" 
                          value={content} 
                          onChange={(e) => setContent(e.target.value)}
                          placeholder="Hva vil du notere?"
                          className="flex-1"
                      />
                      <Button type="submit" disabled={loading}>
                          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Legg til"}
                      </Button>
                  </div>
                </div>
                <ImageUpload 
                  value={imageUrl || null}
                  onChange={(url) => setImageUrl(url || null)}
                  label="Skjermbilde / eksempel (valgfritt)"
                />
             </div>
          </div>
        </form>

        <div className="space-y-2">
          {fetching ? (
            <div className="text-center py-4 text-slate-400">Laster notater...</div>
          ) : notes.length === 0 ? (
            <div className="text-center py-8 text-slate-400 border border-dashed rounded-lg">
                Ingen notater ennå.
            </div>
          ) : (
            notes.map((note) => (
              <div 
                key={note.id} 
                className={`flex items-start justify-between p-3 rounded-lg border ${note.isResolved ? 'bg-slate-50 opacity-60' : 'bg-white'}`}
              >
                <div className="flex gap-3 items-start">
                    <button 
                        onClick={() => handleToggle(note.id, note.isResolved)}
                        className={`mt-1 ${note.isResolved ? 'text-green-500' : 'text-slate-300 hover:text-slate-400'}`}
                    >
                        {note.isResolved ? <CheckCircle2 className="h-5 w-5" /> : <Circle className="h-5 w-5" />}
                    </button>
                    <div>
                        <p className={`text-sm ${note.isResolved ? 'line-through text-slate-500' : 'text-slate-900'}`}>
                            {note.content}
                        </p>
                        {note.imageUrl && (
                          <a 
                            href={note.imageUrl} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="block mt-2 relative w-56 h-32 rounded-md overflow-hidden border bg-slate-50 hover:opacity-90 transition-opacity"
                          >
                            <Image 
                              src={note.imageUrl}
                              alt="Notatbilde"
                              fill
                              className="object-cover"
                            />
                          </a>
                        )}
                        <div className="flex gap-2 text-xs text-slate-400 mt-1">
                            <span className="font-medium text-slate-500">{note.author}</span>
                            <span>•</span>
                            <span>{format(new Date(note.createdAt), "d. MMM HH:mm", { locale: nb })}</span>
                        </div>
                    </div>
                </div>
                <div className="flex gap-1">
                    <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-8 w-8 p-0 text-slate-400 hover:text-slate-900"
                        onClick={() => handleCopy(note)}
                        title="Kopier notat"
                    >
                        {copiedId === note.id ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                    <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-8 w-8 p-0 text-slate-400 hover:text-red-500"
                        onClick={() => handleDelete(note.id)}
                        title="Slett notat"
                    >
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
