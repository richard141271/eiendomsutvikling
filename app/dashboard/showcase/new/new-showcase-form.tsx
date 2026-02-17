"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

type NewShowcaseFormProps = {
  createShowcase: (formData: FormData) => void;
};

export function NewShowcaseForm({ createShowcase }: NewShowcaseFormProps) {
  const [submitting, setSubmitting] = useState(false);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    if (submitting) {
      event.preventDefault();
      return;
    }

    setSubmitting(true);
  }

  return (
    <form action={createShowcase} onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Navn på objekt / overskrift</Label>
        <Input id="name" name="name" placeholder="F.eks. Storgata 12 - Visning" required />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="address">Adresse (valgfritt)</Label>
        <Input id="address" name="address" placeholder="F.eks. Storgata 12, 0150 Oslo" />
      </div>

      <Button type="submit" className="w-full" disabled={submitting}>
        {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Opprett og start veiviser
      </Button>
    </form>
  );
}

