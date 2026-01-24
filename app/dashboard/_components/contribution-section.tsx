"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createContribution } from "@/app/actions/contribution";
import { ContributionType, ContributionStatus } from "@prisma/client";
import { Loader2, Upload, X, CheckCircle2, Clock, CheckCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import Image from "next/image";
import { format } from "date-fns";
import { nb } from "date-fns/locale";

interface ContributionSectionProps {
  unitId: string;
  contributions: any[]; // Using any[] for now to avoid deep type issues, but should match Prisma return type
}

export function ContributionSection({ unitId, contributions }: ContributionSectionProps) {
  const [type, setType] = useState<ContributionType | "">("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("Upload failed");

      const data = await res.json();
      setImageUrl(data.imageUrl);
    } catch (error) {
      console.error(error);
      alert("Kunne ikke laste opp bilde");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!type || !description) {
        alert("Vennligst fyll ut alle feltene");
        return;
    }

    setIsSubmitting(true);
    try {
      const res = await createContribution({
        unitId,
        type: type as ContributionType,
        description,
        imageUrl: imageUrl || undefined,
      });

      if (res.success) {
        alert("Bidrag sendt inn!");
        setType("");
        setDescription("");
        setImageUrl(null);
      } else {
        alert(res.error || "Noe gikk galt");
      }
    } catch (error) {
        console.error(error);
        alert("En feil oppstod");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getTypeLabel = (type: ContributionType) => {
    switch (type) {
      case "IMPROVEMENT_UNIT": return "Forslag til forbedring i leiligheten";
      case "IMPROVEMENT_PROPERTY": return "Forslag til forbedring uteområde";
      case "OWN_INITIATIVE": return "Eget initiativ / bidrag";
      default: return type;
    }
  };

  const getStatusBadge = (status: ContributionStatus) => {
    switch (status) {
      case "PENDING": return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200"><Clock className="w-3 h-3 mr-1"/> Ny</Badge>;
      case "REVIEWED": return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200"><CheckCircle className="w-3 h-3 mr-1"/> Vurdert</Badge>;
      case "COMPLETED": return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200"><CheckCircle2 className="w-3 h-3 mr-1"/> Utført</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Send inn forslag eller bidrag</CardTitle>
          <CardDescription>
            Har du forslag til forbedringer, gjort noe ekstra for fellesskapet, eller flytter du ut og vil dele erfaringer? 
            Registrer det her for å bygge din status som leietaker!
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="type">Type henvendelse</Label>
              <Select value={type} onValueChange={(val) => setType(val as ContributionType)}>
                <SelectTrigger>
                  <SelectValue placeholder="Velg type..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="IMPROVEMENT_UNIT">Forslag til forbedring i leiligheten</SelectItem>
                  <SelectItem value="IMPROVEMENT_PROPERTY">Forslag til forbedring uteområde</SelectItem>
                  <SelectItem value="OWN_INITIATIVE">Eget initiativ / bidrag</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Beskrivelse</Label>
              <Textarea
                id="description"
                placeholder="Beskriv hva du har gjort eller foreslår..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <Label>Bilde (valgfritt)</Label>
              {imageUrl ? (
                <div className="relative w-full h-48 rounded-md overflow-hidden border">
                  <Image src={imageUrl} alt="Uploaded" fill className="object-cover" />
                  <button
                    type="button"
                    onClick={() => setImageUrl(null)}
                    className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full hover:bg-red-600 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div 
                  className="border-2 border-dashed rounded-md p-6 flex flex-col items-center justify-center cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="w-8 h-8 text-muted-foreground mb-2" />
                  <span className="text-sm text-muted-foreground">Klikk for å laste opp bilde</span>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageUpload}
                    disabled={isUploading}
                  />
                </div>
              )}
              {isUploading && <p className="text-sm text-muted-foreground animate-pulse">Laster opp...</p>}
            </div>

            <Button type="submit" className="w-full" disabled={isSubmitting || isUploading}>
              {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Send inn
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Dine innsendinger</CardTitle>
          <CardDescription>Oversikt over dine forslag og bidrag.</CardDescription>
        </CardHeader>
        <CardContent>
            {contributions.length === 0 ? (
                <p className="text-muted-foreground text-sm">Ingen innsendinger enda.</p>
            ) : (
                <div className="space-y-4">
                    {contributions.map((contribution) => (
                        <div key={contribution.id} className="border rounded-lg p-4 space-y-3">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="font-medium text-sm">{getTypeLabel(contribution.type)}</p>
                                    <p className="text-xs text-muted-foreground">
                                        {format(new Date(contribution.createdAt), "d. MMMM yyyy", { locale: nb })}
                                    </p>
                                </div>
                                {getStatusBadge(contribution.status)}
                            </div>
                            <p className="text-sm">{contribution.description}</p>
                            {contribution.imageUrl && (
                                <div className="relative w-full h-32 rounded-md overflow-hidden border">
                                    <Image src={contribution.imageUrl} alt="Contribution" fill className="object-cover" />
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </CardContent>
      </Card>
    </div>
  );
}
