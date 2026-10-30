import jwt from "jsonwebtoken";
import { config } from "../config";

export type UserDomain = "client" | "provider" | "bi";

export interface AuthTokenPayload {
  userId: number;
  domain: UserDomain;
}

function secret(): string {
  if (!config.jwtSecret) throw new Error("JWT_SECRET is not set. Add it to backend/.env.");
  return config.jwtSecret;
}

export function signAuthToken(payload: AuthTokenPayload, expiresInSeconds: number): string {
  return jwt.sign(payload, secret(), { expiresIn: expiresInSeconds });
}

export function verifyAuthToken(token: string): AuthTokenPayload {
  return jwt.verify(token, secret()) as unknown as AuthTokenPayload;
}
