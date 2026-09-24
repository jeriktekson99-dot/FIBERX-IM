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

