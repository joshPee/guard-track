import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const dayShiftGuards = [
  'Ayitey Prince',
  'Martin Korang',
  'Fortunate Erzuah',
  'Emmanuel Cudjoe',
  'Belinda Semefa',
  'Stephen Benianah',
  'Richmond Ofosu',
  'Abigail Aidoo',
  'Vida Daboro',
  'Justine Dotse',
  'Francis Bintel Bichutab',
  'Genevieve Akwensivie',
  'Justice Mensah',
  'Wilma Amuzu',
  'Anita Sefakor Owusu',
  'Kingsford Aggrey',
  'Agamah Gideon',
  'Obiri Ebenezer',
  'Qahar Adizatu',
  'John Narh',
  'Ebenezer Yeboah',
  'Joyce Bezoro',
  'Antwi Gabriel',
  'Francisca Tetteh',
]

const nightShiftGuards = [
  'Samuel Nii',
  'Derrick Mills',
  'Harrison Benard',
  'Oti Anthony',
  'Mawunyo Azumah',
  'Faustina Donkor',
  'Mariam Obeng',
  'Fredrick Akuffo',
  'Justice Akromah',
  'Akosua Asante Asare',
  'Emmanuel Amankwah',
  'Michael Ahiavor',
  'Ebenezer K. Arthur',
  'Kingsley Nartey',
  'Ujakpo Ebenezer',
  'Rejoice Kogbe',
  'Richard Appiah',
  'Warlasi Enoch',
  'Bright Osei Tutu',
  'Tetteh Justice',
  'Michael Appiah',
  'Asante Eric',
  'Boonaa Francis',
]

const exitedGuards = [
  'Boadu Osei Philip',
  'Badu Harrison',
]

async function main() {
  console.log('Starting guard database update...')

  // Get all guards
  const allGuards = await prisma.guard.findMany()
  console.log(`Found ${allGuards.length} guards in database`)

  // Create a map for quick lookup
  const guardMap = new Map(allGuards.map(g => [g.fullName.toLowerCase(), g]))

  // Update exited guards to INACTIVE
  for (const name of exitedGuards) {
    const guard = guardMap.get(name.toLowerCase())
    if (guard) {
      await prisma.guard.update({
        where: { id: guard.id },
        data: { status: 'INACTIVE' },
      })
      console.log(`✓ Marked ${name} as INACTIVE (exited)`)
    } else {
      console.log(`⚠ Guard not found: ${name}`)
    }
  }

  // Update day shift guards
  for (const name of dayShiftGuards) {
    const guard = guardMap.get(name.toLowerCase())
    if (guard) {
      await prisma.guard.update({
        where: { id: guard.id },
        data: {
          shiftType: 'DAY',
          status: 'ACTIVE',
        },
      })
      console.log(`✓ Updated ${name} to DAY shift (ACTIVE)`)
    } else {
      console.log(`⚠ Guard not found: ${name}`)
    }
  }

  // Update night shift guards
  for (const name of nightShiftGuards) {
    const guard = guardMap.get(name.toLowerCase())
    if (guard) {
      await prisma.guard.update({
        where: { id: guard.id },
        data: {
          shiftType: 'NIGHT',
          status: 'ACTIVE',
        },
      })
      console.log(`✓ Updated ${name} to NIGHT shift (ACTIVE)`)
    } else {
      console.log(`⚠ Guard not found: ${name}`)
    }
  }

  console.log('\nGuard database update completed!')
  console.log('\nSummary:')
  console.log(`- Day shift guards: ${dayShiftGuards.length}`)
  console.log(`- Night shift guards: ${nightShiftGuards.length}`)
  console.log(`- Exited guards marked: ${exitedGuards.length}`)
}

main()
  .catch((e) => {
    console.error('Error updating guards:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
