import { db } from "../../../../lib/db";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const role = req.headers.get("x-user-role");
  const userId = req.headers.get("x-user-id");

  const order = await db.orders.findById(id);
  if (!order) return Response.json({ error: "Not found" }, { status: 404 });

  if (role !== "admin" && order.userId !== userId) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }
  return Response.json(order);
}
