"use server"

import { createClient } from "@/lib/supabase-server";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { FikenClient } from "@/lib/fiken";

async function syncContractToFiken(contractId: string) {
  try {
    const contract = await prisma.leaseContract.findUnique({
      where: { id: contractId },
      include: {
        tenant: true,
        unit: {
          include: {
            property: {
              include: {
                owner: true,
              },
            },
          },
        },
      },
    });

    if (!contract) return;

    const owner = contract.unit.property.owner;
    if (!owner.fikenApiToken || !owner.fikenCompanySlug) {
      console.log("Fiken not configured for owner");
      return;
    }

    console.log("Starting Fiken sync for contract:", contractId);
    const fiken = new FikenClient(owner.fikenApiToken);

    // 1. Create/Get Contact
    const tenant = contract.tenant as any;
    const contactUrl = await fiken.createContact(owner.fikenCompanySlug, {
      name: tenant.name,
      email: tenant.email,
      address: tenant.address || undefined,
      city: tenant.city || undefined,
      postCode: tenant.postalCode || undefined,
    });

    if (!contactUrl) {
      console.error("Could not get Fiken contact URL");
      return;
    }

    // 2. Get Bank Account
    const bankAccounts = await fiken.getBankAccounts(owner.fikenCompanySlug);
    const bankAccountUrl = bankAccounts.length > 0 ? bankAccounts[0].href : undefined;

    // 3. Create Invoice (First month rent)
    const invoicePayload = {
      issueDate: new Date().toISOString().split("T")[0],
      dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      lines: [
        {
          netAmount: contract.rentAmount,
          vatAmount: 0,
          grossAmount: contract.rentAmount,
          description: `Husleie ${contract.unit.property.name} - ${contract.unit.name}`,
          vatType: "EXEMPT",
        },
      ],
      customer: {
        url: contactUrl,
      },
      bankAccountUrl: bankAccountUrl,
      invoiceText: `Første husleie. Kontrakt signert ${new Date().toLocaleDateString("no-NO")}`,
    };

    // Include deposit if specified and not zero
    if (contract.depositAmount > 0) {
      invoicePayload.lines.push({
        netAmount: contract.depositAmount,
        vatAmount: 0,
        grossAmount: contract.depositAmount,
        description: "Depositum",
        vatType: "EXEMPT",
      });
    }

    await fiken.createInvoice(owner.fikenCompanySlug, invoicePayload);
    console.log("Fiken invoice created successfully");
    
    // Ideally we would save the Fiken Invoice ID back to the contract, 
    // but the create-invoice-service response parsing needs more work to get the ID reliable.
    // For now, we trust it worked.

  } catch (error) {
    console.error("Fiken sync failed:", error);
    // Don't throw, so we don't block the contract signing flow
  }
}

export async function sendContract(contractId: string) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      throw new Error("Unauthorized");
    }

    // Verify ownership
    const contract = await prisma.leaseContract.findUnique({
      where: { id: contractId },
      include: {
        unit: {
          include: {
            property: true
          }
        }
      }
    });

    if (!contract) {
      throw new Error("Contract not found");
    }

    // Check if user is the owner
    const isOwner = contract.unit.property.ownerId === user.id; // Note: user.id might need mapping to dbUser.id if they differ, but syncUser aligns authId. 
    // Actually, ownerId in Property is the DB User ID.
    // We need to find the DB User for the current Auth User.
    
    // @ts-ignore
    const dbUser = await prisma.user.findFirst({
        where: { authId: user.id } as any
    });

    if (!dbUser || contract.unit.property.ownerId !== dbUser.id) {
         // Allow if admin/manager? For now just owner.
         throw new Error("Unauthorized: Not the property owner");
    }

    await prisma.leaseContract.update({
      where: { id: contractId },
      data: { status: "SENT" },
    });

    revalidatePath(`/dashboard/contracts/${contractId}`);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function signContract(contractId: string) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      throw new Error("Unauthorized");
    }

    const dbUser = await prisma.user.findFirst({
        where: { authId: user.id } as any
    });

    if (!dbUser) {
        throw new Error("User not found");
    }

    const contract = await prisma.leaseContract.findUnique({
      where: { id: contractId },
    });

    if (!contract) {
      throw new Error("Contract not found");
    }

    // Check if user is the tenant
    if (contract.tenantId !== dbUser.id) {
         throw new Error("Unauthorized: You are not the tenant for this contract");
    }

    await prisma.leaseContract.update({
      where: { id: contractId },
      data: { status: "SIGNED" },
    });

    // Trigger Fiken integration
    await syncContractToFiken(contractId);

    revalidatePath(`/dashboard/contracts/${contractId}`);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function markAsSigned(contractId: string) {
    // Same as sendContract, but sets status to SIGNED (manual override by owner)
    return sendContract(contractId).then(async (res) => {
        if (res.success) {
             await prisma.leaseContract.update({
                where: { id: contractId },
                data: { status: "SIGNED" },
              });

              // Trigger Fiken integration
              await syncContractToFiken(contractId);

              revalidatePath(`/dashboard/contracts/${contractId}`);
              return { success: true };
        }
        return res;
    });
}
