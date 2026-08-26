import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function seedKelompok() {
  console.log('Seeding KelompokMapel...');
  
  const groups = ['Normatif', 'Adaptif', 'Produktif'];

  for (const name of groups) {
    let group = await prisma.kelompokMapel.findUnique({ where: { nama: name } });
    if (!group) {
      await prisma.kelompokMapel.create({ data: { nama: name } });
      console.log(`Created Kelompok: ${name}`);
    } else {
      console.log(`Kelompok ${name} already exists.`);
    }
  }

  console.log('Seeding Mapel done!');
  await prisma.$disconnect();
}

seedKelompok();
