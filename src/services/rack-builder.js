import { preparationApi } from '../api/preparation.api.js';

export async function clearSideStructure(side) {
  if (!side) return;
  const shelves = [...(side.bays || []).flatMap(b => b.shelves), ...(side.standaloneShelves || [])];
  
  // 1. Unassign all bins from all shelves
  for (const shelf of shelves) {
    if (shelf.binMappings?.length > 0) {
      await preparationApi.assignShelfBins(shelf.id, []);
    }
  }
  
  // 2. Delete all bins
  for (const bin of side.bins || []) {
    await preparationApi.deleteBin(bin.id);
  }
  
  // 3. Delete shelves
  for (const shelf of shelves) {
    await preparationApi.deleteShelf(shelf.id);
  }
  
  // 4. Delete bays
  for (const bay of side.bays || []) {
    await preparationApi.deleteBay(bay.id);
  }
}

export async function applySideDesign(unitId, existingSide, config) {
  const { sideType, displayOrder, arrangement, bays, shelvesPerBay, binsPerShelf, shelves: standaloneShelvesCount } = config;
  
  await clearSideStructure(existingSide);
  
  let sideId;
  if (!existingSide) {
    const newSide = await preparationApi.createSide(unitId, { sideType, displayOrder });
    sideId = newSide.id;
  } else {
    sideId = existingSide.id;
  }
  
  const createdShelves = [];
  
  if (arrangement === 'BAYS') {
    for (let i = 1; i <= bays; i++) {
      const bay = await preparationApi.createBay(sideId, { bayNumber: i, displayOrder: i });
      for (let j = 1; j <= shelvesPerBay; j++) {
        const shelf = await preparationApi.createShelf(sideId, { shelfScope: 'BAY', bayId: bay.id, shelfNumber: j, displayOrder: j });
        createdShelves.push(shelf);
      }
    }
  } else {
    for (let i = 1; i <= standaloneShelvesCount; i++) {
      const shelf = await preparationApi.createShelf(sideId, { shelfScope: 'STANDALONE', shelfNumber: i, displayOrder: i });
      createdShelves.push(shelf);
    }
  }
  
  const totalBins = createdShelves.length * binsPerShelf;
  if (totalBins > 0) {
    const response = await preparationApi.generateSideBins(sideId, totalBins);
    const bins = response.bins || [];
    
    // Sort bins to assign them in order
    bins.sort((a, b) => a.binNumber - b.binNumber);
    
    let binIndex = 0;
    for (const shelf of createdShelves) {
      const shelfBinIds = [];
      for (let i = 0; i < binsPerShelf; i++) {
        if (bins[binIndex]) {
          shelfBinIds.push(bins[binIndex].id);
          binIndex++;
        }
      }
      await preparationApi.assignShelfBins(shelf.id, shelfBinIds);
    }
  }
}

export async function addCustomBins(unitId, arg2, arg3, arg4) {
  let existingSide, sideType, count;
  if (typeof arg2 === 'string') {
    existingSide = null;
    sideType = arg2;
    count = arg3;
    const prep = await preparationApi.getPreparation(unitId);
    existingSide = prep.sides.find(s => s.sideType === sideType) || null;
  } else {
    existingSide = arg2;
    sideType = arg3;
    count = arg4;
  }
  
  let sideId;
  if (!existingSide) {
    const displayOrder = ['FRONT', 'RIGHT', 'BACK', 'LEFT'].indexOf(sideType);
    const newSide = await preparationApi.createSide(unitId, { sideType, displayOrder: displayOrder >= 0 ? displayOrder : 0 });
    sideId = newSide.id;
  } else {
    sideId = existingSide.id;
  }
  await preparationApi.generateSideBins(sideId, count);
}
