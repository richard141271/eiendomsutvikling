import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";
import { nb } from "date-fns/locale";
import { Mail, Phone, MapPin, AlertTriangle, FileText, CheckCircle } from "lucide-react";

interface TenantPageProps {
  params: {
    id: string;
  };
}

const contractStatusMap: Record<string, string> = {
  DRAFT: "Utkast",
  SENT: "Sendt",
  SIGNED: "Signert",
  TERMINATED: "Avsluttet",
};

export default async function TenantPage({ params }: TenantPageProps) {
  const tenant = await prisma.user.findUnique({
    where: { id: params.id },
    include: {
      leaseContracts: {
        include: {
          unit: {
            include: { property: true }
          }
        },
        orderBy: { createdAt: "desc" }
      },
      receivedCertificates: {
        orderBy: { createdAt: "desc" },
        include: { issuer: true }
      },
      tenantWarnings: {
        orderBy: { sentAt: "desc" },
        include: { unit: true }
      },
      // messages: true, // TODO: Implement messages view
    },
  });

  if (!tenant) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{tenant.name}</h1>
          <p className="text-muted-foreground">Leietaker ID: {tenant.id.slice(0, 8)}</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Mail className="h-4 w-4" /> E-post
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-medium">{tenant.email}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Phone className="h-4 w-4" /> Telefon
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-medium">{tenant.phone || "-"}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <MapPin className="h-4 w-4" /> Adresse
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-medium">
              {tenant.address ? `${tenant.address}, ${tenant.postalCode} ${tenant.city}` : "-"}
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="contracts" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="contracts">Kontrakter</TabsTrigger>
          <TabsTrigger value="protocols">Protokoller</TabsTrigger>
          <TabsTrigger value="warnings">Varsler & Purringer</TabsTrigger>
          <TabsTrigger value="messages">Meldinger</TabsTrigger>
        </TabsList>

        <TabsContent value="contracts" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Leiekontrakter</CardTitle>
            </CardHeader>
            <CardContent>
              {tenant.leaseContracts.length === 0 ? (
                <p className="text-muted-foreground">Ingen kontrakter funnet.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Eiendom / Enhet</TableHead>
                      <TableHead>Periode</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Leie</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tenant.leaseContracts.map((contract) => (
                      <TableRow key={contract.id}>
                        <TableCell>
                          <div className="font-medium">{contract.unit.name}</div>
                          <div className="text-xs text-muted-foreground">{contract.unit.property.name}</div>
                        </TableCell>
                        <TableCell>
                          {contract.startDate ? format(contract.startDate, 'dd.MM.yyyy') : '-'} 
                          {' - '}
                          {contract.endDate ? format(contract.endDate, 'dd.MM.yyyy') : 'Løpende'}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{contractStatusMap[contract.status] || contract.status}</Badge>
                        </TableCell>
                        <TableCell className="text-right">{contract.rentAmount} NOK</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="protocols" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Overtagelsesprotokoller & Attester</CardTitle>
            </CardHeader>
            <CardContent>
              {tenant.receivedCertificates.length === 0 ? (
                <p className="text-muted-foreground">Ingen protokoller eller attester registrert.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Dato</TableHead>
                      <TableHead>Total Score</TableHead>
                      <TableHead>Kommentar</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tenant.receivedCertificates.map((cert) => (
                      <TableRow key={cert.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-green-500" />
                            <span>Leieattest</span>
                          </div>
                        </TableCell>
                        <TableCell>{format(cert.createdAt, 'dd.MM.yyyy', { locale: nb })}</TableCell>
                        <TableCell>
                          <Badge variant={cert.totalScore >= 8 ? "default" : cert.totalScore >= 5 ? "secondary" : "destructive"}>
                            {cert.totalScore}/10
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-md truncate">{cert.comment || "-"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="warnings" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Varsler & Purringer</CardTitle>
            </CardHeader>
            <CardContent>
              {tenant.tenantWarnings.length === 0 ? (
                <p className="text-muted-foreground">Ingen varsler registrert.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Dato</TableHead>
                      <TableHead>Enhet</TableHead>
                      <TableHead>Melding</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tenant.tenantWarnings.map((warning) => (
                      <TableRow key={warning.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4 text-amber-500" />
                            <span>{warning.type}</span>
                          </div>
                        </TableCell>
                        <TableCell>{format(warning.sentAt, 'dd.MM.yyyy', { locale: nb })}</TableCell>
                        <TableCell>{warning.unit?.name || "-"}</TableCell>
                        <TableCell className="max-w-md truncate">{warning.message}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="messages" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Meldinger</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Meldingslogg kommer her.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
