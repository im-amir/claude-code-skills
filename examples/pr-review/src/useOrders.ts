import { useEffect, useState } from "react";

export type Order = { id: string; total: number };

export function useOrders(customerId: string) {
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/customers/${customerId}/orders`, { signal: controller.signal })
      .then((res) => res.json() as Promise<Order[]>)
      .then(setOrders)
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        throw error;
      });
    return () => controller.abort();
  }, [customerId]);

  return orders;
}
