import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('Starting seed...')

  // ─── Users ────────────────────────────────────────────────────────────────

  const hashedPassword = await bcrypt.hash('admin123', 10)
  const supervisor = await prisma.user.upsert({
    where: { email: 'supervisor@pcc.gov.gh' },
    update: {},
    create: {
      name: 'Security Supervisor',
      email: 'supervisor@pcc.gov.gh',
      passwordHash: hashedPassword,
      role: 'SUPERVISOR',
      isActive: true,
    },
  })
  console.log('Created supervisor user:', supervisor.email)

  const viewerPassword = await bcrypt.hash('viewer123', 10)
  const viewer = await prisma.user.upsert({
    where: { email: 'viewer@pcc.gov.gh' },
    update: {},
    create: {
      name: 'Security Viewer',
      email: 'viewer@pcc.gov.gh',
      passwordHash: viewerPassword,
      role: 'VIEWER',
      isActive: true,
    },
  })
  console.log('Created viewer user:', viewer.email)

  // ─── Shifts ───────────────────────────────────────────────────────────────

  await prisma.shift.upsert({
    where: { id: 'day-shift' },
    update: {},
    create: { id: 'day-shift', name: 'DAY', startTime: '06:00', endTime: '18:00', graceMinutes: 10 },
  })
  await prisma.shift.upsert({
    where: { id: 'night-shift' },
    update: {},
    create: { id: 'night-shift', name: 'NIGHT', startTime: '18:00', endTime: '06:00', graceMinutes: 10 },
  })
  console.log('Created shifts')

  // ─── Zones ────────────────────────────────────────────────────────────────

  const zone1 = await prisma.zone.upsert({
    where: { id: 'zone-1' },
    update: {},
    create: { id: 'zone-1', name: 'Front/Gate Area' },
  })
  const zone2 = await prisma.zone.upsert({
    where: { id: 'zone-2' },
    update: {},
    create: { id: 'zone-2', name: 'Auditoriums' },
  })
  const zone3 = await prisma.zone.upsert({
    where: { id: 'zone-3' },
    update: {},
    create: { id: 'zone-3', name: 'PSTM Area' },
  })
  const zone4 = await prisma.zone.upsert({
    where: { id: 'zone-4' },
    update: {},
    create: { id: 'zone-4', name: 'Residential/Admin Cluster' },
  })
  console.log('Created 4 zones')

  // ─── Duty Points ──────────────────────────────────────────────────────────

  const dutyPoints = [
    { name: 'Abraham Tetteh Nartey Block', zoneId: zone4.id },
    { name: 'Lawrence Annor Nyarko Block(PSTM Hostel)*', zoneId: zone3.id },
    { name: 'John Bart Plange Block', zoneId: zone4.id },
    { name: 'David Yaw Anti Owusu Block', zoneId: zone4.id },
    { name: 'Patrick Asiamah (Block)', zoneId: zone4.id },
    { name: 'Main Gate', zoneId: zone1.id },
    { name: 'Fred Diabene Walker (Auditorium)', zoneId: zone2.id },
    { name: 'Stephen Henry Ankamah', zoneId: zone4.id },
    { name: 'James Gyimah Block', zoneId: zone4.id },
    { name: 'Joseph Egyir Paintsil', zoneId: zone2.id },
    { name: 'Perpetual Owusu', zoneId: zone4.id },
    { name: 'Samuel Richard Asomaning', zoneId: zone4.id },
    { name: 'George Alphonso Wood', zoneId: zone4.id },
    { name: 'Children Resource Center', zoneId: zone3.id },
    { name: 'David Mills Block(PSTM Administration Block)*', zoneId: zone3.id },
    { name: 'Lectures Block*', zoneId: zone3.id },
    { name: 'Eunice Addison Block', zoneId: zone2.id },
    { name: 'Josiah Coffie Quaye', zoneId: zone2.id },
    { name: 'Staff Quarters', zoneId: zone1.id },
    { name: 'Water Storage', zoneId: zone3.id },
    { name: "Center Manager's Quarters", zoneId: zone1.id },
  ]

  for (const dp of dutyPoints) {
    const slug = dp.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
    await prisma.dutyPoint.upsert({
      where: { id: slug },
      update: { name: dp.name, zoneId: dp.zoneId, isActive: true },
      create: { id: slug, name: dp.name, zoneId: dp.zoneId, isActive: true },
    })
  }
  console.log('Created/updated 21 duty points')

  // ─── Guards: clear old, insert fresh list ─────────────────────────────────

  // Delete all attendance records linked to existing guards first (FK safety)
  await prisma.attendanceRecord.deleteMany({})
  await prisma.guard.deleteMany({})
  console.log('Cleared existing guards and attendance records')

  const guardList = [
    { fullName: 'Ayitey Prince',          badgeId: 'GT-001' },
    { fullName: 'Martin Korang',           badgeId: 'GT-002' },
    { fullName: 'Fortunate Erzuah',        badgeId: 'GT-003' },
    { fullName: 'Emmanuel Cudjoe',         badgeId: 'GT-004' },
    { fullName: 'Belinda Semefa',          badgeId: 'GT-005' },
    { fullName: 'Stephen Benianah',        badgeId: 'GT-006' },
    { fullName: 'Richmond Ofosu',          badgeId: 'GT-007' },
    { fullName: 'Abigail Aidoo',           badgeId: 'GT-008' },
    { fullName: 'Vida Daboro',             badgeId: 'GT-009' },
    { fullName: 'Samuel Nii',              badgeId: 'GT-010' },
    { fullName: 'Justine Dotse',           badgeId: 'GT-011' },
    { fullName: 'Derrick Mills',           badgeId: 'GT-012' },
    { fullName: 'Francis Bintel Bichutab', badgeId: 'GT-013' },
    { fullName: 'Genevieve Akwensivie',    badgeId: 'GT-014' },
    { fullName: 'Divine Amevialor',        badgeId: 'GT-015' },
    { fullName: 'Justice Mensah',          badgeId: 'GT-016' },
    { fullName: 'Simon Peter',             badgeId: 'GT-017' },
    { fullName: 'Harrison Benard',         badgeId: 'GT-018' },
    { fullName: 'Oti Anthony',             badgeId: 'GT-019' },
    { fullName: 'Mawunyo Azumah',          badgeId: 'GT-020' },
    { fullName: 'Wilma Amuzu',             badgeId: 'GT-021' },
    { fullName: 'Godfred Adom',            badgeId: 'GT-022' },
    { fullName: 'Faustina Donkor',         badgeId: 'GT-023' },
    { fullName: 'Mariam Obeng',            badgeId: 'GT-024' },
    { fullName: 'Nathaniel Kumah',         badgeId: 'GT-025' },
    { fullName: 'Fredrick Akuffo',         badgeId: 'GT-026' },
    { fullName: 'Justice Akromah',         badgeId: 'GT-027' },
    { fullName: 'Akosua Asante Asare',     badgeId: 'GT-028' },
    { fullName: 'Emmanuel Amankwah',       badgeId: 'GT-029' },
    { fullName: 'Anita Sefakor Owusu',     badgeId: 'GT-030' },
    { fullName: 'Michael Ahiavor',         badgeId: 'GT-031' },
    { fullName: 'Ebenezer K. Arthur',      badgeId: 'GT-032' },
    { fullName: 'Kingsley Nartey',         badgeId: 'GT-033' },
    { fullName: 'Ujakpo Ebenezer',         badgeId: 'GT-034' },
    { fullName: 'Antwi Gabriel',           badgeId: 'GT-035' },
    { fullName: 'Agamah Gideon',           badgeId: 'GT-036' },
    { fullName: 'Obiri Ebenezer',          badgeId: 'GT-037' },
    { fullName: 'Amedu Sylvester',         badgeId: 'GT-038' },
    { fullName: 'Rejoice Kogbe',           badgeId: 'GT-039' },
    { fullName: 'Qahar Adizatu',           badgeId: 'GT-040' },
    { fullName: 'Richard Appiah',          badgeId: 'GT-041' },
    { fullName: 'Warlasi Enoch',           badgeId: 'GT-042' },
    { fullName: 'Badu Harrison',           badgeId: 'GT-043' },
    { fullName: 'Bright Osei Tutu',        badgeId: 'GT-044' },
    { fullName: 'Tetteh Justice',          badgeId: 'GT-045' },
    { fullName: 'Michael Appiah',          badgeId: 'GT-046' },
    { fullName: 'Boadu Osei Philip',       badgeId: 'GT-047' },
    { fullName: 'Asante Eric',             badgeId: 'GT-048' },
    { fullName: 'John Narh',               badgeId: 'GT-049' },
    { fullName: 'Ebenezer Yeboah',         badgeId: 'GT-050' },
    { fullName: 'Joyce Bezoro',            badgeId: 'GT-051' },
  ]

  for (const guard of guardList) {
    await prisma.guard.create({
      data: {
        fullName: guard.fullName,
        badgeId: guard.badgeId,
        status: 'ACTIVE',
      },
    })
  }
  console.log(`Created ${guardList.length} guards`)

  // ─── Settings ─────────────────────────────────────────────────────────────

  await prisma.setting.upsert({
    where: { key: 'organization_name' },
    update: {},
    create: { key: 'organization_name', value: 'PCC Security Department' },
  })
  console.log('Created settings')

  console.log('Seed completed successfully!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
