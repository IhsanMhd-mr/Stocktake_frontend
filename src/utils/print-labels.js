export const A4_DIMENSIONS_CM = {
  portrait: { width: 21, height: 29.7 },
  landscape: { width: 29.7, height: 21 }
};

export function collectPreparationBins(preparation) {
  if (!preparation) return [];
  if (preparation.unitType === 'BASKET') {
    return [...(preparation.bins || [])].sort((a, b) => a.binNumber - b.binNumber).map((bin) => ({ ...bin, location: null }));
  }

  return (preparation.sides || []).flatMap((side) => {
    const locationByBin = new Map();
    const shelves = [
      ...(side.bays || []).flatMap((bay) => (bay.shelves || []).map((shelf) => ({ shelf, bay }))),
      ...(side.standaloneShelves || []).map((shelf) => ({ shelf, bay: null }))
    ];
    for (const { shelf, bay } of shelves) {
      const shelfCode = shelf.structuralCode || shelf.code;
      const location = [side.sideType, bay ? `${bay.code}-${shelfCode}` : shelfCode].filter(Boolean).join(' ');
      for (const mapping of shelf.binMappings || []) locationByBin.set(mapping.binId, location);
    }
    return [...(side.bins || [])].sort((a, b) => a.binNumber - b.binNumber).map((bin) => ({
      ...bin,
      sideOrder: side.displayOrder,
      location: locationByBin.get(bin.id) || side.sideType
    }));
  }).sort((a, b) => a.binNumber - b.binNumber || (a.sideOrder || 0) - (b.sideOrder || 0));
}

export function calculateLabelGrid({ orientation, marginCm, labelWidthCm, labelHeightCm, showHeader, headerHeightCm }) {
  const page = A4_DIMENSIONS_CM[orientation];
  const usableWidth = page.width - (2 * marginCm);
  const usableHeight = page.height - (2 * marginCm) - (showHeader ? headerHeightCm : 0);
  const columns = Math.floor((usableWidth + 0.0001) / labelWidthCm);
  const rows = Math.floor((usableHeight + 0.0001) / labelHeightCm);
  if (marginCm < 0 || labelWidthCm <= 0 || labelHeightCm <= 0 || (showHeader && headerHeightCm <= 0)) {
    return { error: 'Dimensions must be positive; margin may be zero.' };
  }
  if (usableWidth <= 0 || usableHeight <= 0 || columns < 1 || rows < 1) {
    return { error: 'The requested label, margin, and header dimensions do not fit on A4.' };
  }
  return { ...page, usableWidth, usableHeight, columns, rows, labelsPerPage: columns * rows };
}

export function buildPrintLabels(bins, suffixMode) {
  if (suffixMode === 'both') return bins.flatMap((bin) => [{ ...bin, suffix: 'START' }, { ...bin, suffix: 'END' }]);
  const suffix = suffixMode === 'none' ? null : suffixMode.toUpperCase();
  return bins.map((bin) => ({ ...bin, suffix }));
}

export function paginateLabels(labels, pageSize) {
  const pages = [];
  for (let index = 0; index < labels.length; index += pageSize) pages.push(labels.slice(index, index + pageSize));
  return pages;
}
