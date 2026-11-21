import { neon } from '@neondatabase/serverless'

// Read-only clients for the sibling security portals' Neon databases.
// Used for the unified "Campus-Wide" monitoring strip on the dashboard.

const vmsUrl = process.env.VMS_DATABASE_URL
const psecUrl = process.env.PSEC_DATABASE_URL

export const vmsSql = vmsUrl ? neon(vmsUrl) : null
export const psecSql = psecUrl ? neon(psecUrl) : null

export interface PortalOverview {
  visitors: {
    onSite: number | null
    checkedInToday: number | null
    openIncidents: number | null
  } | null
  equipment: {
    issuedItems: number | null
    damagedActive: number | null
    missingActive: number | null
    totalEquipment: number | null
  } | null
}

async function safe<T>(fn: () => Promise<T>): Promise<T | null> {
  try {
    return await fn()
  } catch (error) {
    console.error('[portal-overview] query failed:', error)
    return null
  }
}

export async function getPortalOverview(): Promise<PortalOverview> {
  const accraToday = new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Accra' })

  const visitors = await safe(async () => {
    if (!vmsSql) return null
    const [onSiteRows, todayRows, incidentRows] = await Promise.all([
      vmsSql`
        SELECT COUNT(*)::int AS c
        FROM check_ins ci
        LEFT JOIN check_outs co ON co.participant_id = ci.participant_id
        WHERE co.participant_id IS NULL
      `,
      vmsSql`
        SELECT COUNT(*)::int AS c
        FROM check_ins
        WHERE (check_in_time AT TIME ZONE 'Africa/Accra')::date = ${accraToday}::date
      `,
      vmsSql`
        SELECT COUNT(*)::int AS c
        FROM incidents
        WHERE status IS NULL OR UPPER(status) NOT IN ('RESOLVED', 'CLOSED', 'CANCELLED')
      `,
    ])
    return {
      onSite: onSiteRows[0]?.c ?? 0,
      checkedInToday: todayRows[0]?.c ?? 0,
      openIncidents: incidentRows[0]?.c ?? 0,
    }
  })

  const equipment = await safe(async () => {
    if (!psecSql) return null
    const [issuedRows, damagedRows, missingRows, totalRows] = await Promise.all([
      psecSql`SELECT COUNT(*)::int AS c FROM equipment_issue_items WHERE "quantityOutstanding" > 0`,
      psecSql`SELECT COUNT(*)::int AS c FROM damaged_equipment_records WHERE status = 'ACTIVE'`,
      psecSql`SELECT COUNT(*)::int AS c FROM missing_equipment_records WHERE status = 'ACTIVE'`,
      psecSql`SELECT COUNT(*)::int AS c FROM equipment`,
    ])
    return {
      issuedItems: issuedRows[0]?.c ?? 0,
      damagedActive: damagedRows[0]?.c ?? 0,
      missingActive: missingRows[0]?.c ?? 0,
      totalEquipment: totalRows[0]?.c ?? 0,
    }
  })

  return { visitors, equipment }
}
