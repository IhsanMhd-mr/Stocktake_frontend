function withCoverage(bin, coverageByBin) {
  const coverage = coverageByBin?.get(bin.id) || null;
  return {
    ...bin,
    stockStatus: bin.stockStatus || coverage?.stockStatus || 'PENDING',
    stockItemCount: bin.stockItemCount ?? coverage?.stockItemCount ?? 0,
    assignment: coverage?.assignedUnitId ? {
      id: coverage.assignedUnitId,
      code: coverage.assignedUnitCode,
      name: coverage.assignedUnitName,
      status: coverage.assignedUnitStatus,
      memo: coverage.assignedUnitStatusMemo,
      leader: coverage.leaderId ? { id: coverage.leaderId, username: coverage.leaderUsername } : null
    } : null
  };
}

function normalizeShelf(shelf, binsById, coverageByBin) {
  const bins = [...(shelf.binMappings || [])]
    .sort((a, b) => a.positionNumber - b.positionNumber)
    .map((mapping) => withCoverage({
      ...(binsById.get(mapping.binId) || {}),
      id: mapping.binId,
      code: mapping.binCode || binsById.get(mapping.binId)?.code,
      stockStatus: mapping.stockStatus,
      stockItemCount: mapping.stockItemCount,
      positionNumber: mapping.positionNumber
    }, coverageByBin));
  return { ...shelf, bins };
}

export function normalizeVisualUnit(source, coverageRows = []) {
  if (!source) return null;
  const unit = source.unit || source;
  const unitType = source.unitType || unit.unitType;
  const coverageByBin = new Map(coverageRows.map((row) => [row.binId, row]));
  if (unitType === 'BASKET') {
    const rawBins = source.bins || source.structure?.bins || [];
    return { unit, unitType, bins: [...rawBins].sort((a, b) => a.binNumber - b.binNumber).map((bin) => withCoverage(bin, coverageByBin)) };
  }
  const rawSides = source.sides || source.structure?.sides || [];
  const sides = rawSides.map((side) => {
    const binsById = new Map((side.bins || []).map((bin) => [bin.id, bin]));
    const bays = [...(side.bays || [])].sort((a, b) => a.bayNumber - b.bayNumber).map((bay) => ({
      ...bay,
      shelves: [...(bay.shelves || [])].sort((a, b) => b.shelfNumber - a.shelfNumber).map((shelf) => normalizeShelf(shelf, binsById, coverageByBin))
    }));
    const standaloneShelves = [...(side.standaloneShelves || [])]
      .sort((a, b) => b.shelfNumber - a.shelfNumber)
      .map((shelf) => normalizeShelf(shelf, binsById, coverageByBin));
    const unmappedBins = (side.bins || []).filter((bin) => !bin.assignedShelfId).sort((a, b) => a.binNumber - b.binNumber).map((bin) => withCoverage(bin, coverageByBin));
    return { ...side, bays, standaloneShelves, unmappedBins };
  });
  return { unit, unitType: 'RACK', sides };
}

export function filterVisualUnit(model, predicate) {
  if (!model || !predicate) return model;
  if (model.unitType === 'BASKET') return { ...model, bins: model.bins.filter(predicate) };
  return {
    ...model,
    sides: model.sides.map((side) => ({
      ...side,
      bays: side.bays.map((bay) => ({ ...bay, shelves: bay.shelves.map((shelf) => ({ ...shelf, bins: shelf.bins.filter(predicate) })) })),
      standaloneShelves: side.standaloneShelves.map((shelf) => ({ ...shelf, bins: shelf.bins.filter(predicate) })),
      unmappedBins: side.unmappedBins.filter(predicate)
    }))
  };
}
