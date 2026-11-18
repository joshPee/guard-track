import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('--- UPDATING ROSTER STATUS ---')

  // 1. Ensure "Outside Deployment" Duty Point exists
  const outsideDutyPoint = await prisma.dutyPoint.upsert({
    where: { id: 'outside-deployment' },
    update: { name: 'Outside Deployment', isActive: true },
    create: {
      id: 'outside-deployment',
      name: 'Outside Deployment',
      zoneId: 'zone-1',
      isActive: true,
    },
  })
  console.log(`✓ Duty Point ready: ${outsideDutyPoint.name} (id: ${outsideDutyPoint.id})`)

  // 2. Re-instate Nathaniel Kumah (GT-025)
  const nathaniel = await prisma.guard.upsert({
    where: { badgeId: 'GT-025' },
    update: {
      fullName: 'Nathaniel Kumah',
      status: 'ACTIVE',
      defaultDutyPointId: outsideDutyPoint.id,
    },
    create: {
      fullName: 'Nathaniel Kumah',
      badgeId: 'GT-025',
      status: 'ACTIVE',
      shiftType: 'BOTH',
      defaultDutyPointId: outsideDutyPoint.id,
    },
  })
  console.log(`✓ Reinstated guard: ${nathaniel.fullName} (${nathaniel.badgeId})`)

  // 3. Update Godfred Adom (GT-022) and Divine Amevialor (GT-015)
  const godfred = await prisma.guard.findFirst({
    where: {
      OR: [
        { badgeId: 'GT-022' },
        { fullName: { contains: 'Godfred', mode: 'insensitive' } },
      ],
    },
  })

  if (godfred) {
    await prisma.guard.update({
      where: { id: godfred.id },
      data: {
        status: 'ACTIVE',
        defaultDutyPointId: outsideDutyPoint.id,
      },
    })
    console.log(`✓ Updated ${godfred.fullName} (${godfred.badgeId}) -> default: Outside Deployment`)
  }

  const divine = await prisma.guard.findFirst({
    where: {
      OR: [
        { badgeId: 'GT-015' },
        { fullName: { contains: 'Divine', mode: 'insensitive' } },
      ],
    },
  })

  if (divine) {
    await prisma.guard.update({
      where: { id: divine.id },
      data: {
        status: 'ACTIVE',
        defaultDutyPointId: outsideDutyPoint.id,
      },
    })
    console.log(`✓ Updated ${divine.fullName} (${divine.badgeId}) -> default: Outside Deployment`)
  }

  // 4. Remove Jecynta Ayisah and Simon Peter (Off Days)
  const offGuards = await prisma.guard.findMany({
    where: {
      OR: [
        { fullName: { contains: 'Jecynta', mode: 'insensitive' } },
        { fullName: { contains: 'Simon Peter', mode: 'insensitive' } },
        { badgeId: 'JA001' },
        { badgeId: 'GT-017' },
      ],
    },
  })

  for (const og of offGuards) {
    // Delete any active assignments
    const deleted = await prisma.dailyDutyAssignment.deleteMany({
      where: { guardId: og.id },
    })
    // Mark inactive (off day)
    await prisma.guard.update({
      where: { id: og.id },
      data: { status: 'INACTIVE' },
    })
    console.log(`✓ Removed ${og.fullName} (${og.badgeId}): set to INACTIVE (Off Day), cleared ${deleted.count} assignments`)
  }

  // 5. Assign Godfred, Nathaniel, and Divine to "Outside Deployment" for existing daily assignment dates
  const outsideGuardIds = [
    godfred?.id,
    nathaniel.id,
    divine?.id,
  ].filter(Boolean) as string[]

  // Find all distinct assignment dates and shifts
  const existingAssignments = await prisma.dailyDutyAssignment.findMany({
    select: { date: true, shiftId: true },
    distinct: ['date', 'shiftId'],
  })

  const targetDates = existingAssignments.length > 0
    ? existingAssignments
    : [{ date: new Date(), shiftId: 'day-shift' }]

  for (const { date, shiftId } of targetDates) {
    for (const guardId of outsideGuardIds) {
      await prisma.dailyDutyAssignment.upsert({
        where: {
          guardId_shiftId_date: {
            guardId,
            shiftId,
            date,
          },
        },
        update: {
          dutyPointId: outsideDutyPoint.id,
        },
        create: {
          guardId,
          shiftId,
          dutyPointId: outsideDutyPoint.id,
          date,
        },
      })
    }
  }

  console.log(`✓ Assigned Godfred, Nathaniel, and Divine to Outside Deployment across ${targetDates.length} assignment shifts/dates`)

  // Verification Summary
  const activeCount = await prisma.guard.count({ where: { status: 'ACTIVE' } })
  const inactiveCount = await prisma.guard.count({ where: { status: 'INACTIVE' } })
  const outsideCount = await prisma.dailyDutyAssignment.count({
    where: { dutyPointId: outsideDutyPoint.id },
  })
  console.log('\n--- SUMMARY ---')
  console.log(`Active Guards: ${activeCount}`)
  console.log(`Inactive Guards: ${inactiveCount}`)
  console.log(`Guards Assigned to Outside Deployment: ${outsideCount}`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
