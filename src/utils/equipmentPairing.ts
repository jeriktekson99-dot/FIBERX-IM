import { ItemCategory, InventoryItem, ITEM_CATEGORIES, HARDWARE_CATEGORY_CATALOG } from '../types';

/**
 * Telecom and Fiber ISP Equipment Compatibility Matrix:
 * Defines which equipment types physically and logically pair together
 * in customer installations across all hardware categories.
 */
export const COMPATIBILITY_RULES: Record<
  ItemCategory,
  {
    compatibleCategories: ItemCategory[];
    description: string;
    pairRole: string;
  }
> = {
  MODEM_ONT: {
    compatibleCategories: ['FIBER_CABLE', 'PATCH_CORD', 'SPLITTER', 'ACCESSORY'],
    description: 'Compatible with Fiber Drop Cables, SC/APC Patch Cords, Splitters & Terminal Mounts',
    pairRole: 'Premises Gateway / ONT',
  },
  FIBER_CABLE: {
    compatibleCategories: ['MODEM_ONT', 'PATCH_CORD', 'SPLITTER', 'ACCESSORY'],
    description: 'Compatible with Modems/ONTs, Fast-Con Patch Cords, Splitters & Aerial Clamps',
    pairRole: 'Outside Plant Drop Cable',
  },
  PATCH_CORD: {
    compatibleCategories: ['MODEM_ONT', 'FIBER_CABLE', 'SPLITTER', 'ACCESSORY'],
    description: 'Compatible with ONTs, Optical Rosettes, Drop Cables, Splitters & Rosette Boxes',
    pairRole: 'Interconnect Patch / Fast-Con',
  },
  SPLITTER: {
    compatibleCategories: ['MODEM_ONT', 'FIBER_CABLE', 'PATCH_CORD', 'ACCESSORY'],
    description: 'Compatible with Fiber Drop Cables, ONTs, Patch Jumpers & Distribution Enclosures',
    pairRole: 'Optical Distribution Splitter',
  },
  ACCESSORY: {
    compatibleCategories: ['MODEM_ONT', 'FIBER_CABLE', 'SPLITTER', 'PATCH_CORD'],
    description: 'Compatible with Fiber Drop Cables (Clamps), ONTs (Mounts), Terminal Boxes & Connectors',
    pairRole: 'Plant Hardware / Mounting Clamp',
  },
};

/**
 * Checks whether two items or categories are compatible companion equipment
 */
export function checkEquipmentCompatibility(
  categoryA: ItemCategory,
  categoryB: ItemCategory
): {
  isCompatible: boolean;
  relationTitle: string;
  badgeColor: string;
  recommendationNote: string;
} {
  const labelA = ITEM_CATEGORIES.find((c) => c.id === categoryA)?.label || categoryA;
  const labelB = ITEM_CATEGORIES.find((c) => c.id === categoryB)?.label || categoryB;

  if (categoryA === categoryB) {
    return {
      isCompatible: true,
      relationTitle: `${labelA} ↔ ${labelB} (Same Category Pair)`,
      badgeColor: 'bg-teal-100 text-teal-800 border-teal-300',
      recommendationNote: `Direct companion pairing between ${labelA} units`,
    };
  }

  const ruleA = COMPATIBILITY_RULES[categoryA];
  const isCompatible = ruleA?.compatibleCategories.includes(categoryB) ?? true;

  if (isCompatible) {
    return {
      isCompatible: true,
      relationTitle: `${labelA} ↔ ${labelB}`,
      badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-300',
      recommendationNote: `Verified field pairing: ${ruleA?.pairRole || labelA} with ${COMPATIBILITY_RULES[categoryB]?.pairRole || labelB}`,
    };
  }

  return {
    isCompatible: false,
    relationTitle: `${labelA} ↔ ${labelB}`,
    badgeColor: 'bg-slate-100 text-slate-600 border-slate-200',
    recommendationNote: 'Optional custom pairing link',
  };
}

/**
 * Filter items from candidates that are recommended compatible companions for a target item
 */
export function getRecommendedCompanions(
  targetItem: InventoryItem,
  candidateItems: InventoryItem[]
): {
  compatibleItems: InventoryItem[];
  otherItems: InventoryItem[];
} {
  const rule = COMPATIBILITY_RULES[targetItem.category];
  const compatibleCats = new Set(rule?.compatibleCategories || []);

  const compatibleItems: InventoryItem[] = [];
  const otherItems: InventoryItem[] = [];

  candidateItems.forEach((candidate) => {
    if (candidate.id === targetItem.id) return;
    if (compatibleCats.has(candidate.category)) {
      compatibleItems.push(candidate);
    } else {
      otherItems.push(candidate);
    }
  });

  return { compatibleItems, otherItems };
}

/**
 * Returns candidate equipment organized by all hardware categories for pairing
 */
export function getHardwareCategoriesPairingCatalog(
  targetItem: InventoryItem,
  candidateItems: InventoryItem[]
): {
  category: typeof HARDWARE_CATEGORY_CATALOG[number];
  items: InventoryItem[];
}[] {
  return HARDWARE_CATEGORY_CATALOG.map((catDef) => {
    const items = candidateItems.filter(
      (item) => item.id !== targetItem.id && item.category === catDef.id && !item.archived && item.quantity > 0
    );
    return {
      category: catDef,
      items,
    };
  });
}

/**
 * Checks whether an item represents a modem/ONT gateway
 */
export function isModemItem(item: { category?: string; name?: string }): boolean {
  if (item.category === 'MODEM_ONT') return true;
  const name = (item.name || '').toLowerCase();
  return name.includes('modem') || name.includes('ont') || name.includes('gpon') || name.includes('gateway');
}

/**
 * Standard installation materials automatically bundled when assigning a Modem/ONT:
 * - Patch Cord (Fiber patch jumper / SC fast connector)
 * - NIU (Network Interface Unit / Terminal Box / Optical Rosette)
 * - SC Connector (Mechanical connector / SC-APC fast-con)
 * - House Bracket (Drop wire wall mounting bracket)
 */
export interface AssociatedMaterialRequirement {
  key: 'PATCH_CORD' | 'NIU' | 'SC_CONNECTOR' | 'HOUSE_BRACKET';
  label: string;
  category: ItemCategory;
  defaultUnit: 'pcs' | 'meters' | 'boxes';
  defaultQtyPerModem: number;
  matcher: (item: InventoryItem) => boolean;
}

export const MODEM_ASSOCIATED_MATERIALS_SPECS: AssociatedMaterialRequirement[] = [
  {
    key: 'PATCH_CORD',
    label: 'Patch Cord',
    category: 'PATCH_CORD',
    defaultUnit: 'pcs',
    defaultQtyPerModem: 1,
    matcher: (item) => {
      const name = (item.name || '').toLowerCase();
      const sku = (item.sku || '').toLowerCase();
      const cat = item.category;
      return (
        name.includes('patch cord') ||
        name.includes('patch cords') ||
        (cat === 'PATCH_CORD' && (name.includes('patch') || name.includes('cord'))) ||
        sku.includes('patch')
      );
    },
  },
  {
    key: 'NIU',
    label: 'NIU (Terminal Box)',
    category: 'ACCESSORY',
    defaultUnit: 'pcs',
    defaultQtyPerModem: 1,
    matcher: (item) => {
      const name = (item.name || '').toLowerCase();
      const sku = (item.sku || '').toLowerCase();
      return (
        name.includes('niu') ||
        sku.includes('niu') ||
        name.includes('terminal box') ||
        name.includes('optical rosette') ||
        name.includes('rosette') ||
        name.includes('atb')
      );
    },
  },
  {
    key: 'SC_CONNECTOR',
    label: 'SC Connector',
    category: 'PATCH_CORD',
    defaultUnit: 'pcs',
    defaultQtyPerModem: 1,
    matcher: (item) => {
      const name = (item.name || '').toLowerCase();
      const sku = (item.sku || '').toLowerCase();
      return (
        name.includes('connector') ||
        sku.includes('connector') ||
        name.includes('fast-con') ||
        name.includes('mechanical') ||
        (name.includes('sc') && !name.includes('modem') && !name.includes('splitter'))
      );
    },
  },
  {
    key: 'HOUSE_BRACKET',
    label: 'House Bracket',
    category: 'ACCESSORY',
    defaultUnit: 'pcs',
    defaultQtyPerModem: 1,
    matcher: (item) => {
      const name = (item.name || '').toLowerCase();
      const sku = (item.sku || '').toLowerCase();
      return (
        name.includes('house bracket') ||
        sku.includes('house bracket') ||
        name.includes('bracket')
      );
    },
  },
];

/**
 * Finds available warehouse in-stock candidates for each required associated material
 */
export function findAvailableModemAssociatedMaterials(
  allInventory: InventoryItem[],
  alreadySelectedIds: Set<string> = new Set()
): {
  spec: AssociatedMaterialRequirement;
  matchedItem: InventoryItem | null;
}[] {
  const inStockCandidates = allInventory.filter(
    (item) =>
      !item.archived &&
      item.quantity > 0 &&
      (item.status === 'IN_STOCK' || item.lifecycleStatus === 'IN_STOCK')
  );

  const matchedIds = new Set<string>(alreadySelectedIds);

  return MODEM_ASSOCIATED_MATERIALS_SPECS.map((spec) => {
    // 1. Try finding an item matching the specific predicate
    let candidate = inStockCandidates.find(
      (item) => !matchedIds.has(item.id) && spec.matcher(item)
    );

    // 2. Fallback to any in-stock item within the matching category if available
    if (!candidate) {
      candidate = inStockCandidates.find(
        (item) => !matchedIds.has(item.id) && item.category === spec.category
      );
    }

    if (candidate) {
      matchedIds.add(candidate.id);
    }

    return {
      spec,
      matchedItem: candidate || null,
    };
  });
}


