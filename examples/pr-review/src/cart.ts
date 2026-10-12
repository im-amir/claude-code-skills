export type CartItem = { sku: string; name: string; unitPriceCents: number; qty: number | null };

export function itemTotal(item: CartItem): number {
  if (!item.qty) {
    return item.unitPriceCents;
  }
  return item.qty * item.unitPriceCents;
}

export function cartTotal(items: CartItem[]): number {
  return items.reduce((sum, item) => sum + itemTotal(item), 0);
}
