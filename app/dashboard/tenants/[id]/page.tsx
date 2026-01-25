import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";
import { nb } from "date-fns/locale";
import { Mail, Phone, MapPin, FileText, CheckCircle, ExternalLink, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GenerateCertificateDialog } from "@/components/generate-certificate-dialog";
import { createClient } from "@/lib/supabase-server";

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
  // Verify auth and role
  const supabase = createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();

  if (!authUser) {
    // Redirect or show error, but layout usually handles this.
    // For safety:
    return <div>Du må være logget inn.</div>;
  }

  const tenant = await prisma.user.findUnique({
    where: { id: params.id },
    include: {
      leaseContracts: {
        include: {
          unit: {
            include: { property: true }
          },
          InspectionProtocol: true
        },
        orderBy: { createdAt: "desc" }
      },
      receivedCertificates: {
        orderBy: { createdAt: "desc" },
        include: { issuer: true }
      },
      tenantWarnings: {
        orderBy: { sentAt: "desc" },
        include: { Unit: true }
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
        <GenerateCertificateDialog tenantId={tenant.id} tenantName={tenant.name} />
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
                      <TableHead>Leie</TableHead>
                      <TableHead className="text-right">Kontrakt</TableHead>
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
                          {contract.startDate ? format(contract.startDate, "dd.MM.yyyy") : "-"}{" "}
                          {" - "}
                          {contract.endDate ? format(contract.endDate, "dd.MM.yyyy") : "Løpende"}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {contractStatusMap[contract.status] || contract.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{contract.rentAmount} NOK</TableCell>
                        <TableCell className="text-right">
                          <Button variant="outline" size="sm" asChild>
                            <Link href={`/dashboard/contracts/${contract.id}`}>Vis kontrakt</Link>
                          </Button>
                        </TableCell>
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
            <CardContent className="space-y-6">
              <div>
                <h3 className="text-sm font-medium mb-2">Overtakelsesprotokoller</h3>
                {tenant.leaseContracts.flatMap((contract: any) =>
                  contract.InspectionProtocol?.map((protocol: any) => ({
                    protocol,
                    contract,
                  })) || []
                ).length === 0 ? (
                  <p className="text-muted-foreground text-sm">
                    Ingen overtakelsesprotokoller registrert.
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Type</TableHead>
                        <TableHead>Dato</TableHead>
                        <TableHead>Eiendom / Enhet</TableHead>
                        <TableHead className="text-right">Handling</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {tenant.leaseContracts.flatMap((contract: any) =>
                        contract.InspectionProtocol?.map((protocol: any) => (
                          <TableRow key={protocol.id}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <FileText className="h-4 w-4 text-muted-foreground" />
                                <span>
                                  {protocol.type === "MOVE_IN" ? "Innflytting" : "Utflytting"}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              {format(protocol.date, "dd.MM.yyyy", { locale: nb })}
                            </TableCell>
                            <TableCell>
                              <div className="font-medium">{contract.unit.name}</div>
                              <div className="text-xs text-muted-foreground">
                                {contract.unit.property.name}
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button variant="outline" size="sm" asChild>
                                <Link
                                  href={`/dashboard/contracts/${contract.id}/inspection/${protocol.id}`}
                                >
                                  Åpne
                                </Link>
                              </Button>
                            </TableCell>
                          </TableRow>
                        )) || []
                      )}
                    </TableBody>
                  </Table>
                )}
              </div>

              <div>
                <h3 className="text-sm font-medium mb-2">Leieattester</h3>
                {tenant.receivedCertificates.length === 0 ? (
                  <p className="text-muted-foreground text-sm">Ingen attester registrert.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Type</TableHead>
                        <TableHead>Dato</TableHead>
                        <TableHead>Total Score</TableHead>
                        <TableHead>Kommentar</TableHead>
                        <TableHead className="text-right">PDF</TableHead>
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
                          <TableCell>
                            {format(cert.createdAt, "dd.MM.yyyy", { locale: nb })}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                cert.totalScore >= 8
                                  ? "default"
                                  : cert.totalScore >= 5
                                  ? "secondary"
                                  : "destructive"
                              }
                            >
                              {cert.totalScore}/10
                            </Badge>
                          </TableCell>
                          <TableCell className="max-w-md truncate">
                            {cert.comment || "-"}
                          </TableCell>
                          <TableCell className="text-right">
                            {cert.pdfUrl ? (
                              <Button variant="outline" size="sm" asChild>
                                <a href={`/api/certificates/${cert.id}/pdf`} target="_blank" rel="noopener noreferrer">
                                  <FileText className="h-4 w-4 mr-2" />
                                  Vis PDF
                                </a>
                              </Button>
                            ) : (
                              <span className="text-xs text-muted-foreground">Ingen PDF</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="warnings" className="space-y-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium">Varsler & Purringer</h3>
            {/* <Button size="sm" variant="outline" className="gap-2">
              <AlertTriangle className="h-4 w-4" />
              Opprett varsel
            </Button> */}
          </div>
          
          <Card>
            <CardContent className="p-0">
              {tenant.tenantWarnings.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  Ingen varsler registrert på denne leietakeren.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Dato</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Melding</TableHead>
                      <TableHead>Enhet</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tenant.tenantWarnings.map((warning) => (
                      <TableRow key={warning.id}>
                        <TableCell>{format(warning.sentAt, "dd.MM.yyyy", { locale: nb })}</TableCell>
                        <TableCell>
                          <Badge variant="destructive">{warning.type}</Badge>
                        </TableCell>
                        <TableCell>{warning.message}</TableCell>
                        <TableCell>
                          {warning.Unit ? (
                            <div className="flex flex-col">
                              <span className="font-medium">{warning.Unit.name}</span>
                            </div>
                          ) : "-"}
                        </TableCell>
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
