"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createDevNote, getDevNotes, deleteDevNote, toggleDevNoteResolved } from "@/app/actions/dev-notes";
import { Trash2, CheckCircle2, Circle, Loader2, Copy, Check } from "lucide-react";
import { format } from "date-fns";
import { nb } from "date-fns/locale";

interface DevNote {
  id: string;
  content: string;
  author: string | null;
  isResolved: boolean;
  createdAt: Date;
}

export function DevNotesSection() {
  const [notes, setNotes] = useState<DevNote[]>([]);
  const [content, setContent] = useState("");
  const [author, setAuthor] = useState("Pål-Martin"); // Default
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    loadNotes();
    // Load saved author
    const savedAuthor = localStorage.getItem("devNoteAuthor");
    if (savedAuthor) setAuthor(savedAuthor);
  }, []);

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
    const res = await createDevNote(content, author);
    if (res.success && res.data) {
      setNotes([res.data as unknown as DevNote, ...notes]);
      setContent("");
      localStorage.setItem("devNoteAuthor", author);
    }
    setLoading(false);
  };

  const handleToggle = async (id: string, currentStatus: boolean) => {
    // Optimistic update
    setNotes(notes.map(n => n.id === id ? { ...n, isResolved: !currentStatus } : n));
    await toggleDevNoteResolved(id, !currentStatus);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Slett notat?")) return;
    setNotes(notes.filter(n => n.id !== id));
    await deleteDevNote(id);
  };

  const handleCopy = (note: DevNote) => {
    navigator.clipboard.writeText(note.content);
    setCopiedId(note.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Notater (Utvikling & Testing)</CardTitle>
        <CardDescription>
          Interne notater mellom Pål-Martin og Utvikler. Legg inn bugs, ønsker eller endringer her.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
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
             <div className="md:col-span-3">
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
