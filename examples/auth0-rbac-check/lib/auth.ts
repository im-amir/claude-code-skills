import { createRemoteJWKSet, jwtVerify, type JWTPayload } from "jose";

const ISSUER = `https://${process.env.AUTH0_DOMAIN}/`;
const AUDIENCE = process.env.AUTH0_AUDIENCE;
const JWKS = createRemoteJWKSet(new URL(`${ISSUER}.well-known/jwks.json`));

const HASURA_CLAIMS = "https://hasura.io/jwt/claims";

type HasuraClaims = {
  "x-hasura-allowed-roles": string[];
  "x-hasura-default-role": string;
  "x-hasura-user-id": string;
};

export type Session = { userId: string; roles: string[] };

export class AuthError extends Error {
  constructor(public status: 401 | 403, message: string) {
    super(message);
  }
}

export async function requireSession(req: Request): Promise<Session> {
  const header = req.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) throw new AuthError(401, "Missing bearer token");

  let payload: JWTPayload;
  try {
    ({ payload } = await jwtVerify(header.slice(7), JWKS, {
      issuer: ISSUER,
      audience: AUDIENCE,
      algorithms: ["RS256"],
    }));
  } catch {
    throw new AuthError(401, "Invalid token");
  }

  const claims = payload[HASURA_CLAIMS] as HasuraClaims | undefined;
  if (!payload.sub || !claims) throw new AuthError(401, "Token has no user claims");

  return { userId: payload.sub, roles: claims["x-hasura-allowed-roles"] };
}

export async function requireRole(req: Request, role: string): Promise<Session> {
  const session = await requireSession(req);
  if (!session.roles.includes(role)) throw new AuthError(403, `Requires role ${role}`);
  return session;
}

export function toErrorResponse(error: unknown): Response {
  if (error instanceof AuthError) {
    return Response.json({ error: error.message }, { status: error.status });
  }
  return Response.json({ error: "Internal error" }, { status: 500 });
}
