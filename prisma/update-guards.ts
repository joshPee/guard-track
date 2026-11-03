import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function updateGuards() {
  try {
    console.log('Starting guard updates...')

    // Remove Nathaniel Kumah
    const deletedGuard = await prisma.guard.deleteMany({
      where: {
        fullName: 'Nathaniel Kumah'
      }
    })
    console.log(`Deleted ${deletedGuard.count} guard(s) named Nathaniel Kumah`)

    // Add Kingsford Aggrey
    const newGuard = await prisma.guard.upsert({
      where: { badgeId: 'KF001' },
      update: {},
      create: {
        fullName: 'Kingsford Aggrey',
        badgeId: 'KF001',
        status: 'ACTIVE'
      }
    })
    console.log(`Created new guard: ${newGuard.fullName} (Badge ID: ${newGuard.badgeId})`)

    // Add Jecynta Ayisah
    const guard2 = await prisma.guard.upsert({
      where: { badgeId: 'JA001' },
      update: {},
      create: {
        fullName: 'Jecynta Ayisah',
        badgeId: 'JA001',
        status: 'ACTIVE'
      }
    })
    console.log(`Created new guard: ${guard2.fullName} (Badge ID: ${guard2.badgeId})`)

    // Add Boonaa Francis
    const guard3 = await prisma.guard.upsert({
      where: { badgeId: 'BF001' },
      update: {},
      create: {
        fullName: 'Boonaa Francis',
        badgeId: 'BF001',
        status: 'ACTIVE'
      }
    })
    console.log(`Created new guard: ${guard3.fullName} (Badge ID: ${guard3.badgeId})`)

    // Add Francisca Tetteh
    const guard4 = await prisma.guard.upsert({
      where: { badgeId: 'FT001' },
      update: {},
      create: {
        fullName: 'Francisca Tetteh',
        badgeId: 'FT001',
        status: 'ACTIVE'
      }
    })
    console.log(`Created new guard: ${guard4.fullName} (Badge ID: ${guard4.badgeId})`)

    console.log('Successfully updated guards')
  } catch (error) {
    console.error('Error updating guards:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

updateGuards()
