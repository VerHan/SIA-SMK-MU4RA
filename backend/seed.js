const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const MOCK_ACADEMIC_YEARS = [
  { nama: '2024/2025', semester: 1, isActive: true, startDate: new Date('2024-07-15'), endDate: new Date('2024-12-20') },
  { nama: '2024/2025', semester: 2, isActive: false, startDate: new Date('2025-01-06'), endDate: new Date('2025-06-20') },
];

const MOCK_TEACHERS = [
  { nip: '198501012010011001', name: 'Ahmad Fauzi, S.Pd.', phone: '081234567890' },
  { nip: '198703152011012002', name: 'Siti Nurhaliza, S.Kom.', phone: '081234567891' },
  { nip: '199002202012011003', name: 'Budi Santoso, S.T.', phone: '081234567892' },
];

const MOCK_STUDENTS = [
  { nis: '20240001', nisn: '0012345601', name: 'Muhammad Rizki', gender: 'L', phone_parent: '081345678901', alamat: 'Jl. Merdeka No. 1, Bangsri', sekolah_asal: 'SMPN 1 Bangsri' },
  { nis: '20240002', nisn: '0012345602', name: 'Aisyah Putri', gender: 'P', phone_parent: '081345678902', alamat: 'Desa Kepuk RT 02 RW 01', sekolah_asal: 'MTsN 1 Jepara' },
  { nis: '20240003', nisn: '0012345603', name: 'Dimas Aditya', gender: 'L', phone_parent: '081345678903', alamat: 'Perumahan Griya Asri Blok B1', sekolah_asal: 'SMPN 2 Keling' },
];

const MOCK_SUBJECTS = [
  { kode: 'MTK', nama: 'Matematika', kelompok: 'Normatif' },
  { kode: 'PW', nama: 'Pemrograman Web', kelompok: 'Produktif' },
  { kode: 'JK', nama: 'Jaringan Komputer', kelompok: 'Produktif' },
];

const MOCK_USERS = [
  { username: 'admin', password: 'admin123', name: 'Administrator', role: 'admin' },
  { username: 'guru1', password: 'guru123', name: 'Ahmad Fauzi, S.Pd.', role: 'guru' },
  { username: 'siswa1', password: 'siswa123', name: 'Muhammad Rizki', role: 'siswa' },
];

async function main() {
  console.log('Wiping existing data...');
  await prisma.riwayatKelas.deleteMany();
  await prisma.kelas.deleteMany();
  await prisma.user.deleteMany();
  await prisma.mataPelajaran.deleteMany();
  await prisma.siswa.deleteMany();
  await prisma.guru.deleteMany();
  await prisma.tahunAjar.deleteMany();

  console.log('Seeding database...');
  
  // 1. Tahun Ajar
  for (const ta of MOCK_ACADEMIC_YEARS) {
    await prisma.tahunAjar.create({ data: ta });
  }
  const activeTa = await prisma.tahunAjar.findFirst({ where: { isActive: true } });
  
  // 2. Guru
  let guruList = [];
  for (const guru of MOCK_TEACHERS) {
    const created = await prisma.guru.create({ data: guru });
    guruList.push(created);
  }

  // 3. Siswa
  let siswaList = [];
  for (const siswa of MOCK_STUDENTS) {
    const created = await prisma.siswa.create({ data: siswa });
    siswaList.push(created);
  }

  // 4. Mapel
  for (const mapel of MOCK_SUBJECTS) {
    await prisma.mataPelajaran.create({ data: mapel });
  }

  // 5. User (Auth)
  for (const user of MOCK_USERS) {
    let relatedData = {};
    if (user.role === 'guru') {
      relatedData.guruId = guruList.find(g => g.nama === user.name)?.id;
    } else if (user.role === 'siswa') {
      relatedData.siswaId = siswaList.find(s => s.nama === user.name)?.id;
    }
    
    await prisma.user.create({
      data: {
        username: user.username,
        password: user.password,
        name: user.name,
        role: user.role,
        ...relatedData
      }
    });
  }

  const k1 = await prisma.kelas.create({
    data: { name: 'X TKJ 1', grade: 'X', major: 'TKJ', teacherId: guruList[2].id }
  });
  
  // 7. RiwayatKelas
  await prisma.riwayatKelas.create({
    data: {
      siswaId: siswaList[0].id,
      kelasId: k1.id,
      tahunAjarId: activeTa.id
    }
  });

  console.log('Seeding completed successfully!');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
