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

// This is a Server Component
export default async function PropertiesPage() {
  // Fetch properties from DB
  // Note: We need to handle the case where DB is not reachable gracefully if possible,
  // but for MVP we assume connection works.
  let properties: any[] = [];
  try {
     properties = await prisma.property.findMany({
      include: {
        units: true,
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
  } catch (e) {
    console.error("Failed to fetch properties:", e);
    // return <div>Error loading properties. Please check database connection.</div>
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Eiendommer</h1>
        <Link href="/dashboard/properties/new">
          <Button>Legg til Eiendom</Button>
        </Link>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Navn</TableHead>
              <TableHead>Adresse</TableHead>
              <TableHead>Enheter</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Handlinger</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {properties.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  Ingen eiendommer funnet.
                </TableCell>
              </TableRow>
            ) : (
              properties.map((property) => (
                <TableRow key={property.id}>
                  <TableCell className="font-medium">
                     <Link href={`/dashboard/properties/${property.id}`} className="hover:underline">
                        {property.name}
                     </Link>
                  </TableCell>
                  <TableCell>{property.address}</TableCell>
                  <TableCell>{property.units.length}</TableCell>
                  <TableCell>{property.status}</TableCell>
                  <TableCell className="text-right">
                    <Link href={`/dashboard/properties/${property.id}`}>
                      <Button variant="ghost" size="sm">
                        Vis
                      </Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
