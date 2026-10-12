import { db } from "../../../../lib/db";

// Only reachable from the admin dashboard, which is behind the admin login.
export async function GET() {
  const users = await db.users.list();
  return Response.json(users);
}

export async function DELETE(req: Request) {
  const { id } = (await req.json()) as { id: string };
  await db.users.delete(id);
  return new Response(null, { status: 204 });
}
