import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { prisma } from "@/lib/prisma";
import { format } from "date-fns";
import { nb } from "date-fns/locale";

export default async function MessagesPage() {
  let threads: any[] = [];
  try {
    threads = await prisma.messageThread.findMany({
      include: {
        LeaseContract: {
          include: {
            unit: {
               include: {
                 property: true
               }
            },
            tenant: true
          }
        },
        Message: {
          orderBy: {
            timestamp: 'desc'
          },
          take: 1
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
  } catch (e) {
    console.error("Failed to fetch messages:", e);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Meldinger</h1>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
             <TableRow>
               <TableHead>Eiendom / Enhet</TableHead>
               <TableHead>Leietaker</TableHead>
               <TableHead>Siste melding</TableHead>
               <TableHead>Dato</TableHead>
               <TableHead className="text-right">Handlinger</TableHead>
             </TableRow>
          </TableHeader>
          <TableBody>
             {threads.length === 0 ? (
               <TableRow>
                 <TableCell colSpan={5} className="h-24 text-center">
                   Ingen meldinger funnet.
                 </TableCell>
               </TableRow>
             ) : (
               threads.map((thread) => {
                 const lastMessage = thread.Message[0];
                 const tenantName = thread.LeaseContract.tenant.name;
                 const propertyName = thread.LeaseContract.unit.property.name;
                 const unitName = thread.LeaseContract.unit.name;

                 return (
                   <TableRow key={thread.id}>
                     <TableCell>
                       <div className="font-medium">{propertyName}</div>
                       <div className="text-sm text-muted-foreground">{unitName}</div>
                     </TableCell>
                     <TableCell>{tenantName}</TableCell>
                     <TableCell className="max-w-[300px] truncate">
                        {lastMessage ? lastMessage.content : "Ingen meldinger"}
                     </TableCell>
                     <TableCell>
                        {lastMessage && format(new Date(lastMessage.timestamp), 'dd. MMM yyyy HH:mm', { locale: nb })}
                     </TableCell>
                     <TableCell className="text-right">
                       <Link href={`/dashboard/messages/${thread.id}`}>
                         <Button variant="ghost" size="sm">
                           Åpne
                         </Button>
                       </Link>
                     </TableCell>
                   </TableRow>
                 );
               })
             )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
