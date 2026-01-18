import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../prisma/client.js';
import { env } from '../config/env.js';

export interface AuthRequest extends Request {
  user?: { id: string; role: string };
}

export async function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ message: 'Missing authorization header.' });
  }
  const [scheme, token] = authHeader.split(' ');
  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ message: 'Invalid authorization header.' });
  }
  try {
    const decoded = jwt.verify(token, env.jwtSecret) as { userId: string; role: string };
    const user = await prisma.user.findUnique({ where: { id: decoded.userId }, include: { userType: true } });
    if (!user || !user.isActive) {
      return res.status(401).json({ message: 'User inactive.' });
    }
    req.user = { id: user.id, role: user.userType.code };
    return next();
  } catch {
    return res.status(401).json({ message: 'Invalid token.' });
  }
}

export function requireRole(roles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Forbidden.' });
    }
    return next();
  };
}
