"use client";

import { Button } from "@/components/ui/button";
import { InspectionType } from "@prisma/client";
import { createInspectionProtocol } from "@/app/actions/inspection-actions";
import { Loader2, FileCheck } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";

interface ProtocolActionsProps {
  contractId: string;
  existingProtocols: { id: string; type: InspectionType }[];
  isOwner: boolean;
}

export function ProtocolActions({ contractId, existingProtocols, isOwner }: ProtocolActionsProps) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleCreate = async (type: InspectionType) => {
    setLoading(true);
    try {
      await createInspectionProtocol(contractId, type);
    } catch (error) {
      console.error(error);
      alert("Kunne ikke opprette protokoll");
    } finally {
      setLoading(false);
    }
  };

  const moveInProtocol = existingProtocols.find(p => p.type === "MOVE_IN");
  const moveOutProtocol = existingProtocols.find(p => p.type === "MOVE_OUT");

  return (
    <div className="flex gap-2">
      {moveInProtocol ? (
        <Button variant="outline" onClick={() => router.push(`/dashboard/contracts/${contractId}/inspection/${moveInProtocol.id}`)}>
          <FileCheck className="mr-2 h-4 w-4" />
          Vis Innflyttingsprotokoll
        </Button>
      ) : (
        isOwner && (
          <Button variant="outline" onClick={() => handleCreate("MOVE_IN")} disabled={loading}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileCheck className="mr-2 h-4 w-4" />}
            Opprett Innflyttingsprotokoll
          </Button>
        )
      )}

      {moveOutProtocol ? (
        <Button variant="outline" onClick={() => router.push(`/dashboard/contracts/${contractId}/inspection/${moveOutProtocol.id}`)}>
          <FileCheck className="mr-2 h-4 w-4" />
          Vis Utflyttingsprotokoll
        </Button>
      ) : (
        isOwner && (
          <Button variant="outline" onClick={() => handleCreate("MOVE_OUT")} disabled={loading}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileCheck className="mr-2 h-4 w-4" />}
            Opprett Utflyttingsprotokoll
          </Button>
        )
      )}
    </div>
  );
}
