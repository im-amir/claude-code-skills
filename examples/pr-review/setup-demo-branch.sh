#!/usr/bin/env bash
# Creates branch demo/pr-review with 3 planted bugs in examples/pr-review/src.
# Run from anywhere inside the repo; the working tree must be clean.
set -euo pipefail

ROOT=$(git rev-parse --show-toplevel)
BRANCH=demo/pr-review
BASE=${1:-main}
cd "$ROOT"

if [ -n "$(git status --porcelain)" ]; then
  echo "Working tree is not clean; commit or stash first." >&2
  exit 1
fi

git checkout -q "$BASE"
git branch -D "$BRANCH" 2>/dev/null || true
git checkout -q -b "$BRANCH"

SRC=examples/pr-review/src

cat > "$SRC/cart.ts" <<'TS'
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
TS

cat > "$SRC/useOrders.ts" <<'TS'
import { useEffect, useState } from "react";

export type Order = { id: string; total: number };

export function useOrders(customerId: string) {
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    fetch(`/api/customers/${customerId}/orders`)
      .then((res) => res.json())
      .then((data: any) => setOrders(data));
  }, [customerId]);

  return orders;
}
TS

cat > "$SRC/api.ts" <<'TS'
export async function fetchWithAuth(url: string, token: string): Promise<Response> {
  console.log("fetching", url, "with token", token);
  return fetch(url, { headers: { Authorization: `Bearer ${token}` } });
}
TS

git add "$SRC"
git commit -q -m "feat(cart): simplify qty handling and orders fetching"
git checkout -q "$BASE"
echo "Created $BRANCH. Try: git checkout $BRANCH && claude, then /pr-review $BASE"
