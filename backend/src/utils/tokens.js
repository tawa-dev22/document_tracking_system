import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

export function signAccessToken(user) {
  return jwt.sign(
    { sub: user._id.toString(), role: user.role, version: user.tokenVersion },
    env.jwtAccessSecret,
    { expiresIn: env.accessTokenExpiresIn }
  );
}

export function signRefreshToken(user) {
  return jwt.sign(
    { sub: user._id.toString(), version: user.tokenVersion },
    env.jwtRefreshSecret,
    { expiresIn: env.refreshTokenExpiresIn }
  );
}
