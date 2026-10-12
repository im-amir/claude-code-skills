import { requireSession, toErrorResponse } from "../../../lib/auth";
import { db } from "../../../lib/db";

export async function GET(req: Request) {
  try {
    const session = await requireSession(req);
    const user = await db.users.findById(session.userId);
    if (!user) return Response.json({ error: "Not found" }, { status: 404 });
    return Response.json(user);
  } catch (error) {
    return toErrorResponse(error);
  }
}
