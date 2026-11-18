import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('--- ENSURING OFF DUTY DUTY POINT ---')
  
  // 1. Upsert 'Off Duty' duty point
  const offDutyPoint = await prisma.dutyPoint.upsert({
    where: { id: 'off-duty' },
    update: { name: 'Off Duty', isActive: true },
    create: {
      id: 'off-duty',
      name: 'Off Duty',
      zoneId: 'zone-1',
      isActive: true,
    },
  })
  console.log(`✓ Duty Point ready: ${offDutyPoint.name} (${offDutyPoint.id})`)

  // 2. Ensure Jecynta & Simon Peter are INACTIVE and have NO daily assignments
  const leftGuards = await prisma.guard.findMany({
    where: {
      OR: [
        { badgeId: 'JA001' },
        { badgeId: 'GT-017' },
        { fullName: { contains: 'Jecynta', mode: 'insensitive' } },
        { fullName: { contains: 'Simon Peter', mode: 'insensitive' } },
      ],
    },
  })

  for (const g of leftGuards) {
    await prisma.guard.update({
      where: { id: g.id },
      data: {
        status: 'INACTIVE',
        defaultDutyPointId: null,
      },
    })
    const del = await prisma.dailyDutyAssignment.deleteMany({
      where: { guardId: g.id },
    })
    console.log(`✓ Guard ${g.fullName} (${g.badgeId}) confirmed INACTIVE (stopped work), cleared ${del.count} assignments`)
  }

  // 3. Check current duty points
  const allDps = await prisma.dutyPoint.findMany({
    where: { isActive: true },
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  })
  console.log(`\nTotal Active Duty Points: ${allDps.length}`)
  console.log('Includes Off Duty?', allDps.some((d) => d.id === 'off-duty'))
  console.log('Includes Outside Deployment?', allDps.some((d) => d.id === 'outside-deployment'))
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
