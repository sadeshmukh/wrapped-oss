import { SignJWT, jwtVerify } from "jose";

const SECRET_KEY = new TextEncoder().encode(
  process.env.JWT_SECRET ||
    process.env.SLACK_CLIENT_SECRET ||
    "default-dev-secret-do-not-use-in-prod-or-bad-things-will-happen-please-trust-me-i-know-what-i-am-doing"
);

export async function signSession(payload: { sub: string; name?: string }) {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(SECRET_KEY);
}

export async function verifySession(token: string) {
  try {
    const { payload } = await jwtVerify(token, SECRET_KEY);
    return payload;
  } catch (e) {
    return null;
  }
}
