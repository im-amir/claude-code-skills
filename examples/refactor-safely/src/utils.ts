// utils - misc helpers used by reports

export type LineItem = { sku: string; qty: number; price: number; taxRate?: number; discount?: number };
export type Order = { id: string; items: LineItem[]; createdAt: string; customer?: { name?: string; country?: string } };

var cache: any = {};

export function formatMoney(cents: number, currency?: string) {
  if (currency == undefined) currency = "EUR";
  var neg = false;
  if (cents < 0) { neg = true; cents = -cents; }
  var whole = Math.floor(cents / 100);
  var frac = cents % 100;
  var fracStr = frac < 10 ? "0" + frac : "" + frac;
  var wholeStr = "" + whole;
  var out = "";
  var count = 0;
  for (var i = wholeStr.length - 1; i >= 0; i--) {
    out = wholeStr[i] + out;
    count++;
    if (count % 3 == 0 && i != 0) out = "," + out;
  }
  if (currency == "EUR") return (neg ? "-" : "") + "€" + out + "." + fracStr;
  if (currency == "USD") return (neg ? "-" : "") + "$" + out + "." + fracStr;
  if (currency == "GBP") return (neg ? "-" : "") + "£" + out + "." + fracStr;
  return (neg ? "-" : "") + out + "." + fracStr + " " + currency;
}

export function formatMoneyShort(cents: number, currency?: string) {
  if (currency == undefined) currency = "EUR";
  var neg = false;
  if (cents < 0) { neg = true; cents = -cents; }
  var whole = Math.round(cents / 100);
  var wholeStr = "" + whole;
  var out = "";
  var count = 0;
  for (var i = wholeStr.length - 1; i >= 0; i--) {
    out = wholeStr[i] + out;
    count++;
    if (count % 3 == 0 && i != 0) out = "," + out;
  }
  if (currency == "EUR") return (neg ? "-" : "") + "€" + out;
  if (currency == "USD") return (neg ? "-" : "") + "$" + out;
  if (currency == "GBP") return (neg ? "-" : "") + "£" + out;
  return (neg ? "-" : "") + out + " " + currency;
}

export function lineTotal(item: LineItem) {
  var t = item.qty * item.price;
  if (item.discount) {
    if (item.discount > 0) {
      if (item.discount < 1) {
        t = t - t * item.discount;
      } else {
        t = t - item.discount;
        if (t < 0) t = 0;
      }
    }
  }
  if (item.taxRate) {
    t = t + t * item.taxRate;
  } else {
    t = t + t * 0.25;
  }
  return Math.round(t);
}

export function orderTotal(order: Order) {
  if (cache[order.id] != undefined) return cache[order.id];
  var total = 0;
  for (var i = 0; i < order.items.length; i++) {
    total = total + lineTotal(order.items[i]);
  }
  if (order.customer && order.customer.country && order.customer.country != "HR") {
    if (total > 10000) total = total - 500;
  }
  cache[order.id] = total;
  return total;
}

export function clearCache() {
  cache = {};
}

export function formatDate(iso: string) {
  var d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  var day = d.getUTCDate();
  var month = d.getUTCMonth() + 1;
  var year = d.getUTCFullYear();
  return (day < 10 ? "0" + day : "" + day) + "." + (month < 10 ? "0" + month : "" + month) + "." + year + ".";
}

export function formatDateTime(iso: string) {
  var d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  var day = d.getUTCDate();
  var month = d.getUTCMonth() + 1;
  var year = d.getUTCFullYear();
  var h = d.getUTCHours();
  var m = d.getUTCMinutes();
  return (day < 10 ? "0" + day : "" + day) + "." + (month < 10 ? "0" + month : "" + month) + "." + year + ". " + (h < 10 ? "0" + h : "" + h) + ":" + (m < 10 ? "0" + m : "" + m);
}

export function customerLabel(order: Order) {
  var name = "Guest";
  if (order.customer) {
    if (order.customer.name) {
      if (order.customer.name.trim() != "") {
        name = order.customer.name.trim();
        if (name.length > 20) {
          name = name.substring(0, 20) + "…";
        }
      }
    }
  }
  return name;
}

export function summarize(orders: Order[], currency?: string) {
  var lines: string[] = [];
  var sum = 0;
  for (var i = 0; i < orders.length; i++) {
    var o = orders[i];
    var t = orderTotal(o);
    sum = sum + t;
    lines.push(formatDate(o.createdAt) + " " + customerLabel(o) + " " + formatMoney(t, currency));
  }
  lines.push("TOTAL " + formatMoney(sum, currency));
  return lines.join("\n");
}

export function slug(s: string) {
  var out = s.toLowerCase();
  out = out.replace(/č/g, "c").replace(/ć/g, "c").replace(/š/g, "s").replace(/ž/g, "z").replace(/đ/g, "d");
  out = out.replace(/[^a-z0-9]+/g, "-");
  out = out.replace(/^-+/, "").replace(/-+$/, "");
  return out;
}

export function truncate(s: string, n: number) {
  if (s.length > n) {
    return s.substring(0, n) + "…";
  } else {
    return s;
  }
}
