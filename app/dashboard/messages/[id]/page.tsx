import { prisma } from "@/lib/prisma";
import { format } from "date-fns";
import { nb } from "date-fns/locale";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export default async function MessageThreadPage({ params }: { params: { id: string } }) {
  const thread = await prisma.messageThread.findUnique({
    where: { id: params.id },
    include: {
      contract: {
        include: {
          unit: {
             include: {
               property: true
             }
          },
          tenant: true
        }
      },
      messages: {
        orderBy: {
          timestamp: 'asc'
        },
        include: {
          sender: true
        }
      }
    }
  });

  if (!thread) {
    return <div>Fant ikke meldingsløp.</div>;
  }

  return (
    <div className="flex flex-col gap-6 h-[calc(100vh-10rem)]">
      <div className="flex items-center justify-between">
        <div>
           <h1 className="text-2xl font-bold">
             {thread.contract.unit.property.name} - {thread.contract.unit.name}
           </h1>
           <p className="text-muted-foreground">
             Samtale med {thread.contract.tenant.name}
           </p>
        </div>
      </div>

      <Card className="flex-1 flex flex-col overflow-hidden">
        <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
           {thread.messages.length === 0 ? (
             <p className="text-center text-muted-foreground">Ingen meldinger ennå.</p>
           ) : (
             thread.messages.map((msg) => (
               <div key={msg.id} className={`flex flex-col ${msg.senderId === thread.contract.tenantId ? 'items-start' : 'items-end'}`}>
                  <div className={`max-w-[80%] rounded-lg p-3 ${msg.senderId === thread.contract.tenantId ? 'bg-muted' : 'bg-primary text-primary-foreground'}`}>
                     <p>{msg.content}</p>
                  </div>
                  <span className="text-xs text-muted-foreground mt-1">
                    {format(new Date(msg.timestamp), 'dd. MMM HH:mm', { locale: nb })} - {msg.sender.name}
                  </span>
               </div>
             ))
           )}
        </CardContent>
        <Separator />
        <div className="p-4">
           {/* Placeholder for input */}
           <p className="text-center text-sm text-muted-foreground">Svar-funksjon kommer snart</p>
        </div>
      </Card>
    </div>
  );
}
