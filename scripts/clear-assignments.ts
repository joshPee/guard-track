import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Starting to clear all daily assignments...')

  // Count existing assignments
  const count = await prisma.dailyDutyAssignment.count()
  console.log(`Found ${count} existing assignments`)

  if (count === 0) {
    console.log('No assignments to clear.')
    return
  }

  // Confirm before deleting
  console.log('\n⚠️  WARNING: This will delete ALL daily duty assignments!')
  console.log('This action cannot be undone.\n')

  // Delete all assignments
  const result = await prisma.dailyDutyAssignment.deleteMany({})
  console.log(`✓ Deleted ${result.count} assignments`)

  console.log('\nAll daily assignments have been cleared.')
}

main()
  .catch((e) => {
    console.error('Error clearing assignments:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
