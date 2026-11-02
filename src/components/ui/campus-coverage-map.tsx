'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  MapPin,
  Building,
  ShieldCheck,
  AlertTriangle,
  Users,
  Layers,
  CheckCircle2,
  Clock,
  ArrowRight
} from 'lucide-react'
import Link from 'next/link'

export interface MappedDutyPoint {
  id: string
  name: string
  zoneName: string
  isCovered: boolean
  assignedGuardName?: string
  assignedGuardBadge?: string
  signInTime?: string
  status?: string
}

interface CampusCoverageMapProps {
  dutyPoints: MappedDutyPoint[]
  totalPoints?: number
  coveredCount?: number
  className?: string
}

const ZONE_COLORS: Record<string, { bg: string; border: string; text: string; headerBg: string }> = {
  'Front/Gate Area': {
    bg: 'bg-amber-50/70 dark:bg-amber-950/20',
    border: 'border-amber-200 dark:border-amber-900/60',
    text: 'text-amber-800 dark:text-amber-300',
    headerBg: 'bg-amber-100/60 dark:bg-amber-950/40',
  },
  'Auditoriums': {
    bg: 'bg-blue-50/70 dark:bg-blue-950/20',
    border: 'border-blue-200 dark:border-blue-900/60',
    text: 'text-blue-800 dark:text-blue-300',
    headerBg: 'bg-blue-100/60 dark:bg-blue-950/40',
  },
  'PSTM Area': {
    bg: 'bg-purple-50/70 dark:bg-purple-950/20',
    border: 'border-purple-200 dark:border-purple-900/60',
    text: 'text-purple-800 dark:text-purple-300',
    headerBg: 'bg-purple-100/60 dark:bg-purple-950/40',
  },
  'Residential/Admin Cluster': {
    bg: 'bg-emerald-50/70 dark:bg-emerald-950/20',
    border: 'border-emerald-200 dark:border-emerald-900/60',
    text: 'text-emerald-800 dark:text-emerald-300',
    headerBg: 'bg-emerald-100/60 dark:bg-emerald-950/40',
  },
}

export function CampusCoverageMap({
  dutyPoints,
  totalPoints = 21,
  coveredCount = 0,
  className,
}: CampusCoverageMapProps) {
  const [activeZoneFilter, setActiveZoneFilter] = useState<string>('ALL')
  const [selectedPost, setSelectedPost] = useState<MappedDutyPoint | null>(null)

  const zones = [
    'Front/Gate Area',
    'Auditoriums',
    'PSTM Area',
    'Residential/Admin Cluster',
  ]

  const coveragePercent = totalPoints > 0
    ? Math.round((coveredCount / totalPoints) * 100)
    : 0

  const filteredPoints = activeZoneFilter === 'ALL'
    ? dutyPoints
    : dutyPoints.filter((dp) => dp.zoneName === activeZoneFilter)

  // Group by zone
  const groupedZones = zones.map((z) => ({
    name: z,
    points: filteredPoints.filter((dp) => dp.zoneName === z),
    totalInZone: dutyPoints.filter((dp) => dp.zoneName === z).length,
    coveredInZone: dutyPoints.filter((dp) => dp.zoneName === z && dp.isCovered).length,
  })).filter((gz) => gz.points.length > 0)

  return (
    <Card className={`border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden ${className || ''}`}>
      {/* Header with Coverage Meter */}
      <CardHeader className="border-b border-slate-200 dark:border-slate-800 pb-4 bg-white dark:bg-slate-900/80">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-base font-semibold text-slate-900 dark:text-white">
              <MapPin className="h-4 w-4 text-teal-600" />
              Campus Duty Post Visual Map & Patrol Grid
            </CardTitle>
            <p className="text-xs text-slate-500 mt-0.5">
              Real-time guard deployment across Pentecost Convention Centre security sectors
            </p>
          </div>

          <div className="flex items-center gap-4 text-xs shrink-0">
            <div className="text-right">
              <p className="text-[11px] font-medium text-slate-500">Live Coverage</p>
              <p className="text-sm font-bold text-slate-900 dark:text-white">
                {coveredCount} / {totalPoints} Posts ({coveragePercent}%)
              </p>
            </div>
            <div className="w-24 bg-slate-100 dark:bg-slate-800 rounded-full h-2.5 overflow-hidden">
              <div
                className={`h-2.5 rounded-full transition-all duration-500 ${
                  coveragePercent >= 80 ? 'bg-emerald-500' : coveragePercent >= 50 ? 'bg-amber-500' : 'bg-rose-500'
                }`}
                style={{ width: `${coveragePercent}%` }}
              />
            </div>
          </div>
        </div>

        {/* Zone Tabs & Legend */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-hide">
            <button
              onClick={() => setActiveZoneFilter('ALL')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                activeZoneFilter === 'ALL'
                  ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              Whole Campus ({totalPoints})
            </button>
            {zones.map((z) => (
              <button
                key={z}
                onClick={() => setActiveZoneFilter(z)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                  activeZoneFilter === z
                    ? 'bg-teal-600 text-white font-semibold shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {z}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3 text-xs text-slate-500">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Manned Post
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-400" />
              Vacant / Unstaffed
            </span>
          </div>
        </div>
      </CardHeader>

      {/* Visual Campus Grid */}
      <CardContent className="p-4 sm:p-5 bg-slate-50/50 dark:bg-slate-950/40">
        <div className="space-y-6">
          {groupedZones.map((gz) => {
            const zStyle = ZONE_COLORS[gz.name] || {
              bg: 'bg-slate-50/70 dark:bg-slate-900/40',
              border: 'border-slate-200 dark:border-slate-700',
              text: 'text-slate-800 dark:text-slate-200',
              headerBg: 'bg-slate-100 dark:bg-slate-800',
            }

            return (
              <div
                key={gz.name}
                className={`rounded-2xl border ${zStyle.border} ${zStyle.bg} p-4 transition-all duration-200 shadow-sm`}
              >
                {/* Sector Header */}
                <div className="flex items-center justify-between mb-3.5">
                  <div className="flex items-center gap-2">
                    <span className="p-1.5 rounded-lg bg-white dark:bg-slate-900 border shadow-xs text-slate-700 dark:text-slate-300">
                      <Layers className="h-3.5 w-3.5" />
                    </span>
                    <h4 className={`text-sm font-bold ${zStyle.text}`}>{gz.name}</h4>
                  </div>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-white/80 dark:bg-slate-900/80 border text-slate-700 dark:text-slate-300">
                    {gz.coveredInZone} / {gz.totalInZone} Manned
                  </span>
                </div>

                {/* Duty Posts in this Sector */}
                <div className="grid gap-2.5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                  {gz.points.map((dp) => {
                    const isManned = dp.isCovered
                    const isSelected = selectedPost?.id === dp.id

                    return (
                      <div
                        key={dp.id}
                        onClick={() => setSelectedPost(isSelected ? null : dp)}
                        className={`cursor-pointer rounded-xl border p-3 transition-all duration-200 ${
                          isSelected
                            ? 'ring-2 ring-teal-500 bg-white dark:bg-slate-900 shadow-md'
                            : 'bg-white/90 dark:bg-slate-900/90 hover:bg-white dark:hover:bg-slate-800/90 border-slate-200/80 dark:border-slate-800 shadow-2xs hover:shadow-sm'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-start gap-2.5 min-w-0">
                            <span
                              className={`mt-0.5 p-1 rounded-md shrink-0 ${
                                isManned
                                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                                  : 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                              }`}
                            >
                              <Building className="h-3.5 w-3.5" />
                            </span>
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-slate-900 dark:text-white truncate" title={dp.name}>
                                {dp.name}
                              </p>
                              {isManned ? (
                                <p className="text-[11px] text-emerald-700 dark:text-emerald-300 font-medium truncate mt-0.5 flex items-center gap-1">
                                  <ShieldCheck className="h-3 w-3 shrink-0" />
                                  <span>{dp.assignedGuardName || 'Assigned Guard'}</span>
                                </p>
                              ) : (
                                <p className="text-[11px] text-rose-600 dark:text-rose-400 font-medium mt-0.5 flex items-center gap-1">
                                  <AlertTriangle className="h-3 w-3 shrink-0" />
                                  <span>Vacant / Unstaffed</span>
                                </p>
                              )}
                            </div>
                          </div>

                          <span
                            className={`shrink-0 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold border ${
                              isManned
                                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                                : 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border-rose-200 dark:border-rose-800'
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                isManned ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'
                              }`}
                            />
                            {isManned ? 'Manned' : 'Vacant'}
                          </span>
                        </div>

                        {/* Expanded details when clicked */}
                        {isSelected && (
                          <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 space-y-1 animate-fade-in-up">
                            {isManned ? (
                              <>
                                <p>
                                  Badge ID: <strong className="font-mono text-slate-700 dark:text-slate-300">{dp.assignedGuardBadge || 'GT-001'}</strong>
                                </p>
                                {dp.signInTime && (
                                  <p>
                                    Checked In: <strong className="text-slate-700 dark:text-slate-300">{dp.signInTime}</strong>
                                  </p>
                                )}
                              </>
                            ) : (
                              <p className="text-rose-600 dark:text-rose-400">
                                No guard checked in for this post today.
                              </p>
                            )}
                            <div className="pt-1 flex items-center justify-between">
                              <Link
                                href="/attendance"
                                className="text-teal-600 hover:text-teal-700 font-semibold flex items-center gap-0.5"
                              >
                                <span>Record Attendance</span>
                                <ArrowRight className="h-3 w-3" />
                              </Link>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
