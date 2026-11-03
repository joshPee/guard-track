import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Fixing shift assignments based on sign-in times...')

  // Get all attendance records with sign-in times
  const records = await prisma.attendanceRecord.findMany({
    where: {
      signInTime: { not: null },
    },
  })

  let fixedCount = 0

  for (const record of records) {
    if (!record.signInTime) continue

    const hours = record.signInTime.getHours()
    const correctShiftId = hours >= 6 && hours < 18 ? 'day-shift' : 'night-shift'

    if (record.shiftId !== correctShiftId) {
      console.log(`Fixing record ${record.id}: guard ${record.guardId} from ${record.shiftId} to ${correctShiftId}`)
      await prisma.attendanceRecord.update({
        where: { id: record.id },
        data: { shiftId: correctShiftId },
      })
      fixedCount++
    }
  }

  console.log(`Fixed ${fixedCount} records`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
