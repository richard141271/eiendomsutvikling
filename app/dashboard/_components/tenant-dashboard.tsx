"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle, FileText, Home, CreditCard, CheckCircle2 } from "lucide-react"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { ContributionSection } from "./contribution-section"

interface TenantDashboardProps {
  user: any;
  activeContract: any;
  certificate: any;
  maintenanceRequests?: any[];
  viewings?: any[];
  contributions?: any[];
}

export function TenantDashboard({ user, activeContract, certificate, maintenanceRequests = [], viewings = [], contributions = [] }: TenantDashboardProps) {
  const score = certificate ? certificate.totalScore : 10;
  const statusMap: Record<string, string> = {
    REPORTED: "Registrert",
    IN_PROGRESS: "Under arbeid",
    COMPLETED: "Fullført",
  };
  
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Hei, {user.name}</h1>
        <p className="text-muted-foreground">Her er oversikten over ditt leieforhold.</p>
      </div>

      {/* Notifications */}
      <div className="space-y-4">
        <Alert variant="destructive" className="bg-amber-50 border-amber-200 text-amber-800">
            <AlertCircle className="h-4 w-4 text-amber-800" />
            <AlertTitle>Betalingspåminnelse</AlertTitle>
            <AlertDescription>
            NB! Betal leien i dag for å unngå at ratingen på ditt leietakerbevis vil synke, samt unngå gebyrer og andre kostnader.
            </AlertDescription>
        </Alert>

        {score < 10 && (
            <Alert className="bg-blue-50 border-blue-200 text-blue-800">
                <CheckCircle2 className="h-4 w-4 text-blue-800" />
                <AlertTitle>Rating Tips</AlertTitle>
                <AlertDescription>
                Alle kan gjøre feil, men din rating vil bygge seg oppover igjen, om du fortsetter å være en god leieboer.
                </AlertDescription>
            </Alert>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Leietakerbevis Card */}
        <Card>
          <CardHeader>
            <CardTitle>Ditt Leietakerbevis</CardTitle>
            <CardDescription>Din rating som leietaker. Hold denne høy for gode referanser!</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Total Score</span>
              <span className="text-2xl font-bold text-green-600">{score}/10</span>
            </div>
            <Progress value={score * 10} className="h-3" />
            <div className="grid grid-cols-2 gap-4 text-sm mt-4">
              <div>
                <p className="text-muted-foreground">Betaling</p>
                <p className="font-medium">{certificate?.paymentScore || 10}/10</p>
              </div>
              <div>
                <p className="text-muted-foreground">Oppførsel</p>
                <p className="font-medium">{certificate?.behaviorScore || 10}/10</p>
              </div>
              <div>
                <p className="text-muted-foreground">Lydnivå</p>
                <p className="font-medium">{certificate?.noiseScore || 10}/10</p>
              </div>
              <div>
                <p className="text-muted-foreground">Renhold</p>
                <p className="font-medium">{certificate?.cleaningScore || 10}/10</p>
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button variant="outline" className="w-full" asChild>
                <Link href="/dashboard/certificate">Se detaljer</Link>
            </Button>
          </CardFooter>
        </Card>

        {/* Leieforhold Card */}
        <Card>
          <CardHeader>
            <CardTitle>Ditt Leieforhold</CardTitle>
            <CardDescription>Informasjon om boligen du leier.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {activeContract ? (
              <>
                <div className="space-y-4">
                    <div className="flex items-center gap-3">
                    <Home className="h-5 w-5 text-muted-foreground" />
                    <div>
                        <p className="font-medium">{activeContract.unit.property.name}</p>
                        <p className="text-sm text-muted-foreground">{activeContract.unit.property.address} - {activeContract.unit.name}</p>
                    </div>
                    </div>
                    <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                    <div>
                        <p className="font-medium">Leiekontrakt</p>
                        <p className="text-sm text-muted-foreground">Signert: {new Date(activeContract.signedAt || activeContract.createdAt).toLocaleDateString("no-NO")}</p>
                    </div>
                    </div>
                    <div className="flex items-center gap-3">
                    <CreditCard className="h-5 w-5 text-muted-foreground" />
                    <div>
                        <p className="font-medium">{activeContract.rentAmount.toLocaleString("no-NO")} NOK</p>
                        <p className="text-sm text-muted-foreground">Per måned</p>
                    </div>
                    </div>
                </div>
              </>
            ) : (
              <p>Du har ingen aktive leiekontrakter.</p>
            )}
          </CardContent>
          <CardFooter className="flex gap-2">
             {activeContract && (
                <>
                    <Button className="flex-1" variant="default">
                    Betal Leie
                    </Button>
                    <Button className="flex-1" variant="outline" asChild>
                        <Link href={`/dashboard/contracts/${activeContract.id}`}>Vis Kontrakt</Link>
                    </Button>
                </>
             )}
          </CardFooter>
        </Card>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Dine planlagte visninger</CardTitle>
          <CardDescription>Oversikt over kommende visninger av din bolig.</CardDescription>
        </CardHeader>
        <CardContent>
          {viewings.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Ingen planlagte visninger.
            </p>
          ) : (
            <div className="space-y-3">
              {viewings.map((viewing: any) => (
                <div
                  key={viewing.id}
                  className="flex items-center justify-between border-b pb-2 last:border-0 last:pb-0"
                >
                  <div>
                    <p className="font-medium text-sm">
                      {new Date(viewing.date).toLocaleString("no-NO")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {viewing.notes || "Ingen notater"}
                    </p>
                  </div>
                  {viewing.confirmed ? (
                    <Badge variant="default">
                      Bekreftet
                    </Badge>
                  ) : (
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/dashboard/viewings/${viewing.id}/confirm`}>
                        Bekreft tilstedeværelse
                      </Link>
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Vedlikehold i boligen</CardTitle>
          <CardDescription>Her ser du saker du har meldt inn.</CardDescription>
        </CardHeader>
        <CardContent>
          {maintenanceRequests.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Du har ingen registrerte vedlikeholdssaker.
            </p>
          ) : (
            <div className="space-y-3">
              {maintenanceRequests.map((request: any) => (
                <div
                  key={request.id}
                  className="flex items-center justify-between border-b pb-2 last:border-0 last:pb-0"
                >
                  <div>
                    <p className="font-medium text-sm">{request.title}</p>
                    <p className="text-xs text-muted-foreground">
                      Rapportert{" "}
                      {new Date(request.createdAt).toLocaleDateString("no-NO")}{" "}
                      – {request.Unit.property.name} - {request.Unit.name}
                    </p>
                  </div>
                  <Badge
                    variant={
                      request.status === "COMPLETED"
                        ? "secondary"
                        : request.status === "IN_PROGRESS"
                        ? "default"
                        : "destructive"
                    }
                  >
                    {statusMap[request.status] || request.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Forslag og Bidrag Section */}
      {activeContract && (
        <ContributionSection 
          unitId={activeContract.unitId} 
          contributions={contributions} 
        />
      )}
    </div>
  );
}
