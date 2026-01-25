
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  try {
    const tasks = await prisma.locationTask.findMany({
      include: {
        items: true
      }
    });
    console.log("Tasks found:", tasks.length);
    console.log(JSON.stringify(tasks, null, 2));
  } catch (e) {
    console.error("Error fetching tasks:", e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
