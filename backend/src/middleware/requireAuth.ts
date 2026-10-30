import { Request, Response, NextFunction } from "express";
import { verifyAuthToken, AuthTokenPayload, UserDomain } from "../utils/jwt";

declare global {
  namespace Express {
    interface Request {
      auth?: AuthTokenPayload;
    }
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies?.authToken;
  if (!token) {
    return res.status(401).json({ error: "unauthenticated", message: "Not signed in." });
  }
  try {
    req.auth = verifyAuthToken(token);
    next();
  } catch {
    return res.status(401).json({ error: "unauthenticated", message: "Your session expired. Sign in again." });
  }
}

/** Use after requireAuth: limits a route to accounts of one workspace. */
export function requireDomain(domain: UserDomain) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (req.auth?.domain !== domain) return res.status(403).json({ error: "forbidden", message: "This account can't use this workspace." });
    next();
  };
}
