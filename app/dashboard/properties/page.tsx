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
  let properties: any[] = [];
  try {
     properties = await prisma.property.findMany({
      include: {
        units: {
          include: {
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
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
  } catch (e) {
    console.error("Failed to fetch properties:", e);
  }

  // Helper to format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('no-NO', { style: 'currency', currency: 'NOK', maximumFractionDigits: 0 }).format(amount);
  };

  return (
    <div className="flex flex-col gap-6 p-4 md:p-8 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">Eiendommer</h1>
        <Link href="/dashboard/properties/new">
          <Button>Ny Eiendom</Button>
        </Link>
      </div>

      <div className="grid gap-6">
        {properties.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground bg-slate-50 rounded-lg border border-dashed">
            <p>Ingen eiendommer funnet.</p>
            <Link href="/dashboard/properties/new" className="mt-4 inline-block">
                <Button variant="outline">Opprett din første eiendom</Button>
            </Link>
          </div>
        ) : (
          properties.map((property) => {
            const unitsCount = property.units.length;
            const rentedUnitsCount = property.units.filter((u: any) => u.status === 'RENTED').length;
            
            return (
              <Card key={property.id} className="overflow-hidden bg-white shadow-sm border-slate-200">
                <div className="p-6">
                    {/* Header Section */}
                    <div className="flex flex-col md:flex-row justify-between items-start gap-4 mb-6">
                        <div className="space-y-1">
                            <h2 className="text-xl font-semibold text-slate-900">
                                {property.name}
                            </h2>
                            <div className="flex items-center text-slate-500 text-sm gap-2">
                                <MapPin className="w-4 h-4" />
                                <span>{property.address}</span>
                            </div>
                            {property.gnr && property.bnr && (
                              <div className="text-xs text-slate-400">
                                Gnr. {property.gnr} / Bnr. {property.bnr}
                              </div>
                            )}
                        </div>
                        <div className="flex items-center gap-3 text-slate-600 text-sm">
                            <div className="flex items-center gap-1 bg-slate-100 px-2 py-1 rounded">
                                <Building className="w-3 h-3" />
                                <span>{unitsCount} Enheter</span>
                            </div>
                            <div className="flex items-center gap-1 bg-slate-100 px-2 py-1 rounded">
                                <User className="w-3 h-3" />
                                <span>{rentedUnitsCount}/{unitsCount} Utleid</span>
                            </div>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-wrap gap-2 mb-6">
                        <Link href={`/dashboard/properties/${property.id}`}>
                            <Button variant="outline" size="sm" className="h-9 gap-2">
                                <Pen className="w-3 h-3" /> Administrer Eiendom
                            </Button>
                        </Link>
                        <Link href={`/dashboard/properties/${property.id}/units/new`}>
                            <Button variant="outline" size="sm" className="h-9 gap-2">
                                <Building className="w-3 h-3" /> Legg til utleieenhet
                            </Button>
                        </Link>
                    </div>

                    {/* Units Preview (if any) */}
                    {unitsCount > 0 && (
                      <div className="border rounded-md bg-slate-50/50 p-4">
                          <h3 className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-3">Utleieenheter</h3>
                          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                            {property.units.slice(0, 6).map((unit: any) => {
                              const activeContract = unit.leaseContracts[0];
                              const tenant = activeContract?.tenant;
                              return (
                                <Link key={unit.id} href={`/dashboard/units/${unit.id}`} className="block">
                                  <div className="bg-white p-3 rounded border hover:border-blue-400 transition-colors cursor-pointer">
                                    <div className="flex justify-between items-start mb-1">
                                      <span className="font-medium text-sm">{unit.name}</span>
                                      <Badge variant={unit.status === 'RENTED' ? 'secondary' : 'outline'} className="text-[10px] h-5 px-1.5">
                                        {unit.status === 'RENTED' ? 'Utleid' : 'Ledig'}
                                      </Badge>
                                    </div>
                                    <div className="text-xs text-slate-500 mb-1">
                                      {unit.roomCount} rom • {unit.sizeSqm} m²
                                    </div>
                                    {tenant && (
                                      <div className="flex items-center gap-1.5 text-xs text-green-600 mt-2">
                                        <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                                        {tenant.name}
                                      </div>
                                    )}
                                  </div>
                                </Link>
                              )
                            })}
                            {unitsCount > 6 && (
                              <Link href={`/dashboard/properties/${property.id}`} className="flex items-center justify-center bg-slate-100 rounded border border-dashed text-xs text-slate-500 hover:bg-slate-200 transition-colors">
                                +{unitsCount - 6} flere
                              </Link>
                            )}
                          </div>
                      </div>
                    )}

                    {unitsCount === 0 && (
                       <div className="border rounded-md bg-slate-50/50 p-6 text-center">
                          <p className="text-sm text-muted-foreground mb-3">Ingen utleieenheter registrert på denne eiendommen ennå.</p>
                          <Link href={`/dashboard/properties/${property.id}/units/new`}>
                              <Button size="sm" variant="default">Opprett første enhet</Button>
                          </Link>
                       </div>
                    )}
                </div>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
