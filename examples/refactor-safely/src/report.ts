import { clearCache, formatDateTime, formatMoneyShort, orderTotal, slug, summarize, type Order } from "./utils";

export function buildReport(title: string, orders: Order[], currency = "EUR") {
  clearCache();
  const grand = orders.reduce((acc, o) => acc + orderTotal(o), 0);
  const generated = formatDateTime(new Date().toISOString());
  return {
    filename: `${slug(title)}.txt`,
    headline: `${title} — ${formatMoneyShort(grand, currency)}`,
    body: `${summarize(orders, currency)}\nGenerated ${generated}`,
  };
}
