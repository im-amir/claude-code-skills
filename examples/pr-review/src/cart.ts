export type CartItem = { sku: string; name: string; unitPriceCents: number; qty: number | null };

export function itemTotal(item: CartItem): number {
  const qty = item.qty ?? 1;
  return qty * item.unitPriceCents;
}

export function cartTotal(items: CartItem[]): number {
  return items.reduce((sum, item) => sum + itemTotal(item), 0);
}
