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
