import { randomBytes, scryptSync, timingSafeEqual, createHash } from 'node:crypto';
export function hashPassword(password) { const salt=randomBytes(16).toString('hex'); return `${salt}:${scryptSync(password,salt,64).toString('hex')}`; }
export function verifyPassword(password,encoded) { const [salt,hash]=encoded.split(':'); return timingSafeEqual(Buffer.from(hash,'hex'),scryptSync(password,salt,64)); }
export const digest = token => createHash('sha256').update(token).digest('hex');
export const newToken = () => randomBytes(32).toString('hex');
