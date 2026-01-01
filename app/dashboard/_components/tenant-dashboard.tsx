import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle, FileText, Home, CreditCard } from "lucide-react"
import Link from "next/link"

interface TenantDashboardProps {
  user: any;
  activeContract: any;
  certificate: any;
}

export function TenantDashboard({ user, activeContract, certificate }: TenantDashboardProps) {
  const score = certificate ? certificate.totalScore : 10;
  
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Hei, {user.name}</h1>
        <p className="text-muted-foreground">Her er oversikten over ditt leieforhold.</p>
      </div>

      {/* Notification Area - Mocked logic for now */}
      <Alert variant="destructive" className="bg-amber-50 border-amber-200 text-amber-800">
        <AlertCircle className="h-4 w-4 text-amber-800" />
        <AlertTitle>Betalingspåminnelse</AlertTitle>
        <AlertDescription>
          NB! Betal leien i dag for å unngå at ratingen på ditt leietakerbevis vil synke, samt unngå gebyrer og andre kostnader.
        </AlertDescription>
      </Alert>

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
                <Link href="/dashboard/leietakerbevis">Se detaljer</Link>
            </Button>
          </CardFooter>
        </Card>

        {/* Leieforhold Card */}
        <Card>
          <CardHeader>
            <CardTitle>Ditt Leieforhold</CardTitle>
            <CardDescription>Informasjon om boligen du leier.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {activeContract ? (
              <>
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
    </div>
  );
}
