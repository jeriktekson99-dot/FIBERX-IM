import { InventoryItem, ItemCategory, HARDWARE_CATEGORY_CATALOG } from '../types';

/**
 * Matches an inventory item against a subcategory name based on item SKU, name,
 * description, model, and standard telecommunications hardware keywords.
 */
export function matchItemSubCategory(item: InventoryItem, subCategoryName: string): boolean {
  if (!subCategoryName || subCategoryName === 'ALL') return true;

  const target = subCategoryName.trim().toLowerCase();
  const itemName = (item.name || '').toLowerCase();
  const itemDesc = (item.description || '').toLowerCase();
  const itemModel = (item.modelName || '').toLowerCase();
  const itemSku = (item.sku || '').toLowerCase();

  // Direct exact/partial string inclusion
  if (
    itemName.includes(target) ||
    itemDesc.includes(target) ||
    itemModel.includes(target) ||
    itemSku.includes(target)
  ) {
    return true;
  }

  // Domain catalog mapping
  switch (subCategoryName) {
    case 'Modems & ONTs':
      return (
        item.category === 'MODEM_ONT' ||
        itemSku.includes('ont') ||
        itemSku.includes('f670') ||
        itemSku.includes('hg8145') ||
        itemSku.includes('an5506') ||
        itemSku.includes('f6600') ||
        itemName.includes('ont') ||
        itemName.includes('modem') ||
        itemName.includes('gateway')
      );

    case 'Fiber Drop Cables':
      return (
        item.category === 'FIBER_CABLE' &&
        (itemSku.includes('1km') ||
          itemSku.includes('spool') ||
          itemSku.includes('bulk') ||
          itemName.includes('spool') ||
          itemName.includes('meterage') ||
          itemDesc.includes('spool') ||
          itemDesc.includes('loose') ||
          !itemName.toLowerCase().includes('pre-terminated'))
      );

    case 'Drop FOC, 1 Core':
      return (
        itemSku.includes('pre-150m') ||
        itemSku.includes('drp') ||
        itemSku.includes('foc') ||
        itemName.includes('150m') ||
        itemName.includes('drop foc') ||
        itemDesc.includes('1-core') ||
        itemDesc.includes('single mode') ||
        itemModel.includes('bow-type') ||
        itemModel.includes('fast-drop')
      );

    case 'Optical Splitters':
      return (
        item.category === 'SPLITTER' ||
        itemSku.includes('splt') ||
        itemSku.includes('plc') ||
        itemName.includes('splitter') ||
        itemModel.includes('plc')
      );

    case 'Patch Cords & Fast-Con':
      return (
        itemSku.includes('pc-sc') ||
        itemSku.includes('patch') ||
        itemName.includes('patch cord') ||
        itemName.includes('simplex') ||
        itemDesc.includes('jumper')
      );

    case 'Connector, Mechanical':
      return (
        itemSku.includes('con-fast') ||
        itemSku.includes('fast-con') ||
        itemSku.includes('connector') ||
        itemName.includes('fast connector') ||
        itemName.includes('mechanical') ||
        itemModel.includes('esc250d') ||
        itemDesc.includes('cold-splice')
      );

    case 'Accessories & Clamps':
      return (
        item.category === 'ACCESSORY' &&
        (itemSku.includes('clamp') ||
          itemName.includes('clamp') ||
          itemSku.includes('acc') ||
          itemDesc.includes('stainless steel'))
      );

    case 'Terminal Box':
      return (
        itemSku.includes('rosette') ||
        itemSku.includes('box') ||
        itemName.includes('rosette') ||
        itemName.includes('outlet') ||
        itemName.includes('terminal box') ||
        itemDesc.includes('faceplate')
      );

    case 'House Bracket':
      return (
        itemSku.includes('bracket') ||
        itemSku.includes('hook') ||
        itemName.includes('bracket') ||
        itemName.includes('hook') ||
        itemDesc.includes('bracket')
      );

    case 'Clamp, Mid-Span':
      return (
        itemSku.includes('mid-span') ||
        itemSku.includes('tension') ||
        itemName.includes('mid-span') ||
        itemName.includes('tension clamp') ||
        itemDesc.includes('dead-end')
      );

    case 'Tie, Cable':
      return (
        itemSku.includes('tie') ||
        itemName.includes('tie') ||
        itemDesc.includes('cable tie')
      );

    case 'Clamp Anchor':
      return (
        itemSku.includes('anchor') ||
        itemName.includes('anchor') ||
        itemDesc.includes('anchor')
      );

    case 'Tape, Double Side':
      return (
        itemSku.includes('tape') ||
        itemName.includes('tape') ||
        itemDesc.includes('tape')
      );

    default:
      return itemName.includes(target) || itemDesc.includes(target);
  }
}

/**
 * Detects the most specific subcategory for an inventory item.
 */
export function detectItemSubCategory(item: InventoryItem): string | null {
  const cat = HARDWARE_CATEGORY_CATALOG.find((c) => c.id === item.category);
  if (!cat) return null;

  // Try to match specific subcategories first (skipping the generic category name if there are multiple)
  for (let i = cat.subItems.length - 1; i >= 0; i--) {
    const sub = cat.subItems[i];
    if (matchItemSubCategory(item, sub)) {
      return sub;
    }
  }

  return cat.subItems[0] || null;
}
