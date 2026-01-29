import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

export function signToken(payload: { userId: string; role: string }) {
  return jwt.sign(payload, env.jwtSecret, { expiresIn: '8h' });
}
