import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function addDemoAccounts() {
  console.log('Adding demo accounts...');
  
  const teachers = [
    { nip: '198703152011012002', name: 'Siti Nurhaliza, S.Kom.', phone: '081234567891' },
    { nip: '199002202012011003', name: 'Budi Santoso, S.T.', phone: '081234567892' },
  ];

  for (const teacherData of teachers) {
    // 1. Create or find Guru
    let guru = await prisma.guru.findUnique({ where: { nip: teacherData.nip } });
    if (!guru) {
      guru = await prisma.guru.create({ data: teacherData });
      console.log(`Created Guru: ${guru.name}`);
    }

    // 2. Create User linked to Guru
    // Generate username like guru2, guru3 based on some logic, or just explicitly check
    const username = teacherData.name.includes('Siti') ? 'guru2' : 'guru3';
    
    let user = await prisma.user.findUnique({ where: { username } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          username,
          password: 'guru123',
          name: teacherData.name,
          role: 'guru',
          teacherId: guru.id
        }
      });
      console.log(`Created User: ${user.username}`);
    } else {
      // Update link if missing
      await prisma.user.update({
        where: { id: user.id },
        data: { teacherId: guru.id }
      });
      console.log(`Updated User: ${user.username}`);
    }
  }

  // Fix existing guru1
  console.log('Fixing guru1 link...');
  const guru1 = await prisma.guru.findFirst({ where: { name: 'Ahmad Fauzi, S.Pd.' } });
  if (guru1) {
    const user1 = await prisma.user.findUnique({ where: { username: 'guru1' } });
    if (user1) {
      await prisma.user.update({
        where: { id: user1.id },
        data: { teacherId: guru1.id }
      });
      console.log('guru1 is now linked correctly!');
    }
  }

  console.log('Done!');
  await prisma.$disconnect();
}

addDemoAccounts();
