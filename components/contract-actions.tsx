"use client"

import { Button } from "@/components/ui/button"
import { sendContract, signContract, markAsSigned } from "@/app/actions/contract-actions"
import { useTransition } from "react"

interface ContractActionsProps {
  contractId: string
  status: string
  isOwner: boolean
  isTenant: boolean
}

export function ContractActions({ contractId, status, isOwner, isTenant }: ContractActionsProps) {
  const [isPending, startTransition] = useTransition()

  const handleSend = () => {
    startTransition(async () => {
      const result = await sendContract(contractId)
      if (result.success) {
        // Toast success
        console.log("Contract sent")
      } else {
        // Toast error
        console.error(result.error)
      }
    })
  }

  const handleSign = () => {
    startTransition(async () => {
      const result = await signContract(contractId)
      if (result.success) {
        console.log("Contract signed")
      } else {
        console.error(result.error)
      }
    })
  }

  const handleMarkSigned = () => {
    startTransition(async () => {
      const result = await markAsSigned(contractId)
      if (result.success) {
        console.log("Contract marked as signed")
      } else {
        console.error(result.error)
      }
    })
  }

  if (isOwner) {
    return (
      <div className="flex gap-2">
        {status === "DRAFT" && (
          <Button onClick={handleSend} disabled={isPending}>
            {isPending ? "Sender..." : "Send til signering"}
          </Button>
        )}
        {(status === "SENT" || status === "DRAFT") && (
           <Button variant="secondary" onClick={handleMarkSigned} disabled={isPending}>
             {isPending ? "Lagrer..." : "Marker som signert"}
           </Button>
        )}
      </div>
    )
  }

  if (isTenant) {
    return (
      <div className="flex gap-2">
        {(status === "SENT" || status === "DRAFT") && (
          <Button onClick={handleSign} disabled={isPending} className="bg-green-600 hover:bg-green-700">
            {isPending ? "Signerer..." : "Signer kontrakt"}
          </Button>
        )}
      </div>
    )
  }

  return null
}
