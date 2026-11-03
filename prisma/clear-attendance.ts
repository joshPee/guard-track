import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function clearAttendanceRecords() {
  try {
    console.log('Starting to clear all attendance records...')

    // First, delete all attendance audit logs (they depend on attendance records)
    const deletedAudits = await prisma.attendanceAudit.deleteMany({})
    console.log(`Deleted ${deletedAudits.count} attendance audit logs`)

    // Then, delete all attendance records
    const deletedRecords = await prisma.attendanceRecord.deleteMany({})
    console.log(`Deleted ${deletedRecords.count} attendance records`)

    console.log('Successfully cleared all attendance records and audit logs')
  } catch (error) {
    console.error('Error clearing attendance records:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

clearAttendanceRecords()
