export interface LocationNode {
  id: number;
  code: string;
  name: string;
  parentLocationId: number | null;
  parentName?: string | null;
  locationType: string;
  maximumCapacity: number;
  currentUsage: number;
  skuCount?: number;
  childCount?: number;
  status: string;
}

export interface LocationHierarchy {
  locations: LocationNode[];
  warehouses: LocationNode[];
  getSections: (warehouseId: number) => LocationNode[];
  getSlots: (sectionId: number) => LocationNode[];
  findLocation: (id: number) => LocationNode | undefined;
}

export function buildLocationHierarchy(locations: LocationNode[]): LocationHierarchy {
  const activeLocations = (locations || []).filter(l => l.status === 'ACTIVE');
  const warehouses = activeLocations.filter(
    l => l.locationType === 'WAREHOUSE' || l.parentLocationId === null
  );

  const getSections = (warehouseId: number): LocationNode[] => {
    return activeLocations.filter(l => l.parentLocationId === warehouseId);
  };

  const getSlots = (sectionId: number): LocationNode[] => {
    return activeLocations.filter(l => l.parentLocationId === sectionId);
  };

  const findLocation = (id: number): LocationNode | undefined => {
    return activeLocations.find(l => l.id === id);
  };

  return {
    locations: activeLocations,
    warehouses,
    getSections,
    getSlots,
    findLocation
  };
}

export function renderCapacityPillHtml(location: LocationNode, incomingQuantity = 0): { html: string; isOverflow: boolean } {
  const current = Number(location.currentUsage || 0);
  const max = Number(location.maximumCapacity || 0);
  const qty = Number(incomingQuantity || 0);
  const projected = current + qty;
  const pct = max > 0 ? Math.round((current / max) * 100) : 0;
  const projectedPct = max > 0 ? Math.round((projected / max) * 100) : 0;
  const available = Math.max(0, max - projected);
  const isOverflow = max > 0 && projected > max;

  let tierClass = 'optimal';
  let label = 'Optimal Capacity';
  let icon = '●';

  if (isOverflow) {
    tierClass = 'overflow';
    label = 'Capacity Exceeded';
    icon = '⚠️';
  } else if (projectedPct >= 90) {
    tierClass = 'critical';
    label = 'Near Capacity';
    icon = '●';
  } else if (projectedPct >= 70) {
    tierClass = 'moderate';
    label = 'Moderate Load';
    icon = '●';
  }

  const meterWidth = Math.min(100, Math.max(0, projectedPct));

  const html = `
    <div class="capacity-pill-card ${tierClass}" role="status" aria-live="polite">
      <div class="capacity-pill-top">
        <span class="capacity-pill-badge ${tierClass}">
          <i class="capacity-dot">${icon}</i>
          <b>${label}</b>
        </span>
        <span class="capacity-pill-figures">
          <strong>${projected.toLocaleString()}</strong> / ${max.toLocaleString()} units
          <span class="capacity-pill-pct">(${projectedPct}%)</span>
        </span>
      </div>
      <div class="capacity-pill-meter">
        <div class="capacity-pill-meter-bar ${tierClass}" style="width: ${meterWidth}%"></div>
      </div>
      <div class="capacity-pill-sub">
        ${isOverflow
          ? `<span class="capacity-warning">Exceeds limit by <b>${(projected - max).toLocaleString()} units</b>! Please choose another slot or lower quantity.</span>`
          : `<span>Remaining Headroom: <b>${available.toLocaleString()} units</b> available</span>`
        }
        ${qty > 0 && !isOverflow ? `<span class="projected-tag">+${qty} incoming simulated</span>` : ''}
      </div>
    </div>
  `;

  return { html, isOverflow };
}

export function renderLocationBreadcrumbHtml(
  warehouse?: LocationNode | null,
  zone?: LocationNode | null,
  slot?: LocationNode | null
): string {
  if (!warehouse && !zone && !slot) {
    return `<div class="location-breadcrumb-bar empty">
      <span class="breadcrumb-prompt">Select facility hierarchy below to map stock placement</span>
    </div>`;
  }

  return `
    <div class="location-breadcrumb-bar">
      ${warehouse ? `
        <div class="breadcrumb-segment tier-warehouse" title="Facility / Warehouse">
          <span class="tier-pill-badge tier-badge-warehouse">1. Facility</span>
          <span class="segment-name">${warehouse.name}</span>
          <span class="segment-code">${warehouse.code}</span>
        </div>
      ` : ''}
      ${warehouse && zone ? `<span class="breadcrumb-divider">➔</span>` : ''}
      ${zone ? `
        <div class="breadcrumb-segment tier-zone" title="Zone / Aisle / Shelf">
          <span class="tier-pill-badge tier-badge-zone">2. Zone</span>
          <span class="segment-name">${zone.name}</span>
          <span class="segment-code">${zone.code}</span>
        </div>
      ` : ''}
      ${zone && slot ? `<span class="breadcrumb-divider">➔</span>` : ''}
      ${slot ? `
        <div class="breadcrumb-segment tier-slot" title="Target Storage Bin / Slot">
          <span class="tier-pill-badge tier-badge-slot">3. Pick Point</span>
          <span class="segment-name">${slot.name}</span>
          <span class="segment-code">${slot.code}</span>
        </div>
      ` : ''}
    </div>
  `;
}

export interface CascadingChainConfig {
  hierarchy: LocationHierarchy;
  warehouseSelect: HTMLSelectElement;
  zoneSelect: HTMLSelectElement;
  locationSelect: HTMLSelectElement;
  breadcrumbContainer?: HTMLElement | null;
  pillContainer?: HTMLElement | null;
  quantityInput?: HTMLInputElement | null;
  submitButton?: HTMLButtonElement | null;
  initialWarehouseId?: number;
  initialLocationId?: number;
  onSelectionChange?: (selected: {
    warehouse?: LocationNode;
    zone?: LocationNode;
    slot?: LocationNode;
    isOverflow: boolean;
  }) => void;
}

export function setupCascadingLocationChain(config: CascadingChainConfig) {
  const {
    hierarchy,
    warehouseSelect,
    zoneSelect,
    locationSelect,
    breadcrumbContainer,
    pillContainer,
    quantityInput,
    submitButton,
    onSelectionChange
  } = config;

  let currentWarehouse: LocationNode | undefined;
  let currentZone: LocationNode | undefined;
  let currentSlot: LocationNode | undefined;
  let isCurrentOverflow = false;

  const updateBreadcrumb = () => {
    if (breadcrumbContainer) {
      breadcrumbContainer.innerHTML = renderLocationBreadcrumbHtml(
        currentWarehouse,
        currentZone,
        currentSlot
      );
    }
  };

  const updateCapacityPill = () => {
    if (!pillContainer) return;
    if (!currentSlot && !currentZone) {
      pillContainer.innerHTML = '';
      pillContainer.hidden = true;
      isCurrentOverflow = false;
      if (submitButton) submitButton.disabled = false;
      return;
    }

    const target = currentSlot || currentZone;
    const qty = quantityInput ? Number(quantityInput.value || 0) : 0;
    const { html, isOverflow } = renderCapacityPillHtml(target!, qty);

    pillContainer.innerHTML = html;
    pillContainer.hidden = false;
    isCurrentOverflow = isOverflow;

    if (submitButton) {
      submitButton.disabled = isOverflow;
      if (isOverflow) {
        submitButton.title = 'Cannot save item: Target location capacity exceeded.';
      } else {
        submitButton.title = '';
      }
    }

    onSelectionChange?.({
      warehouse: currentWarehouse,
      zone: currentZone,
      slot: currentSlot,
      isOverflow
    });
  };

  // Populate Warehouses (Tier 1)
  warehouseSelect.innerHTML = [
    `<option value="">Select Facility / Warehouse…</option>`,
    ...hierarchy.warehouses.map(w =>
      `<option value="${w.id}">${w.name} (${w.code}) — Cap: ${Number(w.maximumCapacity).toLocaleString()} units</option>`
    )
  ].join('');

  const populateZones = (warehouseId: number) => {
    const zones = hierarchy.getSections(warehouseId);
    if (!zones.length) {
      zoneSelect.innerHTML = `<option value="">No zones found in facility</option>`;
      zoneSelect.disabled = true;
      return;
    }

    zoneSelect.innerHTML = [
      `<option value="">Select Zone / Aisle…</option>`,
      ...zones.map(z =>
        `<option value="${z.id}">${z.name} (${z.code}) — ${z.currentUsage}/${z.maximumCapacity} units</option>`
      )
    ].join('');
    zoneSelect.disabled = false;
  };

  const populateLocations = (zoneId: number) => {
    const slots = hierarchy.getSlots(zoneId);
    if (!slots.length) {
      // Zone has no sub-slots, allow direct zone assignment
      const zoneNode = hierarchy.findLocation(zoneId);
      if (zoneNode) {
        locationSelect.innerHTML = [
          `<option value="">Select Target Location…</option>`,
          `<option value="${zoneNode.id}">[Direct Zone Pick Point] ${zoneNode.name} (${zoneNode.code}) — ${zoneNode.currentUsage}/${zoneNode.maximumCapacity} units</option>`
        ].join('');
        locationSelect.disabled = false;
      } else {
        locationSelect.innerHTML = `<option value="">No sub-locations</option>`;
        locationSelect.disabled = true;
      }
      return;
    }

    locationSelect.innerHTML = [
      `<option value="">Select Storage Bin / Shelf Location…</option>`,
      ...slots.map(s => {
        const available = Math.max(0, Number(s.maximumCapacity) - Number(s.currentUsage));
        return `<option value="${s.id}">${s.name} (${s.code}) — ${s.currentUsage}/${s.maximumCapacity} units (${available} free)</option>`;
      })
    ].join('');
    locationSelect.disabled = false;
  };

  warehouseSelect.onchange = () => {
    const whId = Number(warehouseSelect.value);
    currentWarehouse = hierarchy.findLocation(whId);
    currentZone = undefined;
    currentSlot = undefined;

    zoneSelect.value = '';
    locationSelect.value = '';
    locationSelect.disabled = true;
    locationSelect.innerHTML = `<option value="">Select Zone first…</option>`;

    if (currentWarehouse) {
      populateZones(whId);
    } else {
      zoneSelect.innerHTML = `<option value="">Select Warehouse first…</option>`;
      zoneSelect.disabled = true;
    }

    updateBreadcrumb();
    updateCapacityPill();
  };

  zoneSelect.onchange = () => {
    const zId = Number(zoneSelect.value);
    currentZone = hierarchy.findLocation(zId);
    currentSlot = undefined;

    locationSelect.value = '';

    if (currentZone) {
      populateLocations(zId);
    } else {
      locationSelect.innerHTML = `<option value="">Select Zone first…</option>`;
      locationSelect.disabled = true;
    }

    updateBreadcrumb();
    updateCapacityPill();
  };

  locationSelect.onchange = () => {
    const locId = Number(locationSelect.value);
    currentSlot = hierarchy.findLocation(locId);

    updateBreadcrumb();
    updateCapacityPill();
  };

  if (quantityInput) {
    quantityInput.addEventListener('input', updateCapacityPill);
  }

  // Handle optional initial preselection
  if (config.initialLocationId) {
    const targetLoc = hierarchy.findLocation(config.initialLocationId);
    if (targetLoc) {
      // Trace parent hierarchy
      if (targetLoc.parentLocationId) {
        const parent = hierarchy.findLocation(targetLoc.parentLocationId);
        if (parent && parent.parentLocationId) {
          // targetLoc is Slot, parent is Zone, grandparent is Warehouse
          warehouseSelect.value = String(parent.parentLocationId);
          currentWarehouse = hierarchy.findLocation(parent.parentLocationId);
          populateZones(parent.parentLocationId);

          zoneSelect.value = String(parent.id);
          currentZone = parent;
          populateLocations(parent.id);

          locationSelect.value = String(targetLoc.id);
          currentSlot = targetLoc;
        } else if (parent) {
          // targetLoc is Zone, parent is Warehouse
          warehouseSelect.value = String(parent.id);
          currentWarehouse = parent;
          populateZones(parent.id);

          zoneSelect.value = String(targetLoc.id);
          currentZone = targetLoc;
          populateLocations(targetLoc.id);
        }
      }
      updateBreadcrumb();
      updateCapacityPill();
    }
  } else if (config.initialWarehouseId) {
    warehouseSelect.value = String(config.initialWarehouseId);
    currentWarehouse = hierarchy.findLocation(config.initialWarehouseId);
    if (currentWarehouse) {
      populateZones(config.initialWarehouseId);
    }
    updateBreadcrumb();
  }

  return {
    getSelected: () => ({
      warehouse: currentWarehouse,
      zone: currentZone,
      slot: currentSlot,
      isOverflow: isCurrentOverflow
    }),
    refreshPill: updateCapacityPill
  };
}
