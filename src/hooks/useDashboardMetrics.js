import { useMemo } from 'react';

export function useDashboardMetrics(units, assignedUnits, coverage) {
  return useMemo(() => {
    const zoneIds = new Set(units.map((unit) => unit.zone?.id).filter(Boolean));
    const totalBins = units.reduce((sum, unit) => sum + Number(unit.progress?.totalBins || 0), 0);
    const completedBins = units.reduce((sum, unit) => sum + Number(unit.progress?.completedBins || 0), 0);
    const active = assignedUnits.filter((unit) => unit.lifecycleStatus === 'ACTIVE');
    const statuses = Object.fromEntries(['PENDING', 'IN_PROGRESS', 'DONE', 'RECHECK'].map((status) => [status, active.filter((unit) => unit.assignedUnitStatus === status).length]));
    return { zones: zoneIds.size, units: units.length, totalBins, completedBins, pendingBins: totalBins - completedBins, assignedBins: coverage.summary.assignedBins, unassignedBins: coverage.summary.unassignedBins, activeAssignedUnits: active.length, statuses, activeLeaders: new Set(active.map((unit) => unit.leader?.id).filter(Boolean)).size, withoutLeader: active.filter((unit) => !unit.leader).length };
  }, [units, assignedUnits, coverage]);
}
