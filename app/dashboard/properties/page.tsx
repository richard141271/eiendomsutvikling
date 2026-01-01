import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { prisma } from "@/lib/prisma";
import { 
  Building, 
  MapPin, 
  FileText, 
  Pen, 
  Megaphone,
  MoreHorizontal,
  CreditCard,
  User,
  AlertCircle
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function PropertiesPage() {
  let units: any[] = [];
  try {
     units = await prisma.unit.findMany({
      include: {
        property: true,
        leaseContracts: {
            where: {
                status: 'SIGNED',
            },
            include: {
                tenant: true
            },
            orderBy: {
                createdAt: 'desc'
            },
            take: 1
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
  } catch (e) {
    console.error("Failed to fetch units:", e);
  }

  // Helper to format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('no-NO', { style: 'currency', currency: 'NOK', maximumFractionDigits: 0 }).format(amount);
  };

  return (
    <div className="flex flex-col gap-6 p-4 md:p-8 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">Leieobjekter</h1>
        <Link href="/dashboard/properties/new">
          <Button>Nytt leieobjekt</Button>
        </Link>
      </div>

      {/* Tabs / Filters - Visual only for now */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        <Button variant="secondary" size="sm" className="whitespace-nowrap">Alle leieobjekter</Button>
        <Button variant="ghost" size="sm" className="whitespace-nowrap">Aktive leieforhold</Button>
        <Button variant="ghost" size="sm" className="whitespace-nowrap">Avsl. leieforhold</Button>
        <Button variant="ghost" size="sm" className="whitespace-nowrap">Bare leieobjekter</Button>
      </div>

      <div className="grid gap-6">
        {units.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground bg-slate-50 rounded-lg border border-dashed">
            <p>Ingen leieobjekter funnet.</p>
            <Link href="/dashboard/properties/new" className="mt-4 inline-block">
                <Button variant="outline">Opprett ditt første leieobjekt</Button>
            </Link>
          </div>
        ) : (
          units.map((unit) => {
            const activeContract = unit.leaseContracts[0];
            const tenant = activeContract?.tenant;
            
            return (
              <Card key={unit.id} className="overflow-hidden bg-white shadow-sm border-slate-200">
                <div className="p-6">
                    {/* Header Section */}
                    <div className="flex flex-col md:flex-row justify-between items-start gap-4 mb-6">
                        <div className="space-y-1">
                            <h2 className="text-xl font-semibold text-slate-900">
                                {unit.property.name} {unit.name && unit.name !== unit.property.name ? `| ${unit.name}` : ''}
                            </h2>
                            <div className="flex items-center text-slate-500 text-sm gap-2">
                                <MapPin className="w-4 h-4" />
                                <span>{unit.property.address}</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 text-slate-600 text-sm">
                            <div className="flex items-center gap-1 bg-slate-100 px-2 py-1 rounded">
                                <Building className="w-3 h-3" />
                                <span>Leilighet</span>
                            </div>
                            <div className="flex items-center gap-1 bg-slate-100 px-2 py-1 rounded">
                                <FileText className="w-3 h-3" />
                                <span>{unit.name}</span>
                            </div>
                            <div className="flex items-center gap-1 bg-slate-100 px-2 py-1 rounded">
                                <span>{unit.roomCount} rom</span>
                            </div>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-wrap gap-2 mb-6">
                        <Link href={`/dashboard/units/${unit.id}`}>
                            <Button variant="outline" size="sm" className="h-9 gap-2">
                                <Pen className="w-3 h-3" /> Rediger leieobjekt
                            </Button>
                        </Link>
                        <Button variant="outline" size="sm" className="h-9 gap-2">
                            <Megaphone className="w-3 h-3" /> Annonser for leieobjektet
                        </Button>
                         <Link href={`/dashboard/units/${unit.id}`}>
                            <Button variant="outline" size="sm" className="h-9 gap-2">
                                <FileText className="w-3 h-3" /> Dokumenter
                            </Button>
                        </Link>
                        <Button variant="outline" size="sm" className="h-9 w-9 p-0 ml-auto">
                            <MoreHorizontal className="w-4 h-4" />
                        </Button>
                    </div>

                    {/* Tenant Info Card */}
                    <div className="border rounded-md bg-slate-50/50 p-0 overflow-hidden">
                        {tenant ? (
                            <div className="grid grid-cols-1 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x border-slate-100">
                                <div className="p-4">
                                    <span className="text-xs font-medium text-slate-500 uppercase tracking-wider block mb-1">Leietaker(e)</span>
                                    <div className="flex items-center gap-2">
                                        <div className="w-1 h-8 bg-green-500 rounded-full"></div>
                                        <span className="font-medium text-slate-900">{tenant.name}</span>
                                    </div>
                                </div>
                                <div className="p-4">
                                    <span className="text-xs font-medium text-slate-500 uppercase tracking-wider block mb-1">Betalingsstatus</span>
                                    <div className="flex items-center gap-2 text-slate-700">
                                        <CreditCard className="w-4 h-4 text-slate-400" />
                                        <span className="font-mono">{formatCurrency(unit.rentAmount)}</span>
                                    </div>
                                </div>
                                <div className="p-4">
                                    <span className="text-xs font-medium text-slate-500 uppercase tracking-wider block mb-1">Status</span>
                                    <span className="text-sm">Aktiv kontrakt</span>
                                </div>
                                <div className="p-4">
                                    <span className="text-xs font-medium text-slate-500 uppercase tracking-wider block mb-1">Varsler</span>
                                    <span className="text-sm text-slate-400">-</span>
                                </div>
                            </div>
                        ) : (
                            <div className="p-6 text-center">
                                <div className="flex justify-center mb-2">
                                    <AlertCircle className="w-6 h-6 text-yellow-500" />
                                </div>
                                <p className="text-sm text-slate-600 font-medium">Ingen aktiv leietaker</p>
                                <p className="text-xs text-slate-400 mb-4">Leieobjektet står tomt</p>
                                <Link href={`/dashboard/units/${unit.id}/invite`}>
                                    <Button size="sm" variant="default">Inviter leietaker</Button>
                                </Link>
                            </div>
                        )}
                    </div>
                </div>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
