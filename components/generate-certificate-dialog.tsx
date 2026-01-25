
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const formSchema = z.object({
  status: z.enum(["SØLV LEIETAKER", "GULL LEIETAKER", "DIAMANT LEIETAKER"]),
  totalScore: z.coerce.number().min(0).max(10),
  comment: z.string().optional(),
});

interface GenerateCertificateDialogProps {
  tenantId: string;
  tenantName: string;
}

export function GenerateCertificateDialog({
  tenantId,
  tenantName,
}: GenerateCertificateDialogProps) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  
  const {
    control,
    register,
    handleSubmit,
    formState: { isSubmitting, errors },
  } = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      status: "GULL LEIETAKER",
      totalScore: 10,
      comment: "",
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      // Map status to stars
      let stars = 0;
      if (values.status === "DIAMANT LEIETAKER") stars = 10;
      else if (values.status === "GULL LEIETAKER") stars = 6;
      else if (values.status === "SØLV LEIETAKER") stars = 1;

      const response = await fetch("/api/certificates/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          tenantId,
          totalScore: values.totalScore,
          stars,
          comment: values.comment,
          statusTextOverride: values.status,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Noe gikk galt");
      }

      setOpen(false);
      router.refresh();
    } catch (error) {
      console.error(error);
      alert(error instanceof Error ? error.message : "Kunne ikke generere sertifikat");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Generer Leietakerbevis
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Generer Leietakerbevis</DialogTitle>
          <DialogDescription>
            Opprett et nytt offisielt leietakerbevis (PDF) for {tenantName}.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="status">Status / Nivå</Label>
            <Controller
              control={control}
              name="status"
              render={({ field }) => (
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <SelectTrigger id="status">
                    <SelectValue placeholder="Velg nivå" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SØLV LEIETAKER">Sølv Leietaker</SelectItem>
                    <SelectItem value="GULL LEIETAKER">Gull Leietaker</SelectItem>
                    <SelectItem value="DIAMANT LEIETAKER">Diamant Leietaker</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
            {errors.status && <p className="text-sm text-red-500">{errors.status.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="totalScore">Total Score (0-10)</Label>
            <Input
              id="totalScore"
              type="number"
              min={0}
              max={10}
              {...register("totalScore")}
            />
            {errors.totalScore && <p className="text-sm text-red-500">{errors.totalScore.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="comment">Kommentar (valgfritt)</Label>
            <Textarea
              id="comment"
              placeholder="F.eks. Utmerket leietaker..."
              className="resize-none"
              {...register("comment")}
            />
          </div>

          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Generer PDF
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
