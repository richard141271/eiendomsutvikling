
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkTestProjects() {
  try {
    const projects = await prisma.project.findMany({
      where: { title: 'Test Legal Report Project' },
      include: {
        reportInstances: true,
        evidenceItems: true,
        sequence: true
      }
    });

    console.log(`Fant ${projects.length} testprosjekter.`);
    
    projects.forEach(p => {
      console.log(`\nProsjekt ID: ${p.id}`);
      console.log(`- Rapporter: ${p.reportInstances.length}`);
      p.reportInstances.forEach(r => {
        console.log(`  - Rapport v${r.versionNumber}: PDF=${!!r.pdfUrl}, Snapshot=${!!r.contentSnapshot}, Bevis=${r.totalEvidenceCount}`);
      });
      console.log(`- Bevis: ${p.evidenceItems.length}`);
      console.log(`- Sekvens: ${p.sequence ? p.sequence.nextEvidenceNumber : 'Mangler'}`);
    });
  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

checkTestProjects();
