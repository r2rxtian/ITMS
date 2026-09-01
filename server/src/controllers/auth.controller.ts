import type { Request, Response } from 'express';
import { writeAudit } from '../repositories/audit.repository.js';
import { authenticate } from '../services/auth.service.js';

export async function login(request: Request, response: Response) {
  const user = await authenticate(request.body.email, request.body.password);
  request.session.user = user;
  await writeAudit({ userId: user.id, action: 'LOGIN', entityType: 'SESSION', description: `${user.email} signed in.`, ipAddress: request.ip });
  response.json({ success: true, message: 'Signed in successfully.', data: { user } });
}

export async function logout(request: Request, response: Response) {
  const user = request.session.user;
  if (user) await writeAudit({ userId: user.id, action: 'LOGOUT', entityType: 'SESSION', description: `${user.email} signed out.`, ipAddress: request.ip });
  request.session.destroy(error => error ? response.status(500).json({ success: false, message: 'Could not end the session.', errors: [] }) : response.clearCookie('stockhub.sid').json({ success: true, message: 'Signed out successfully.', data: null }));
}

export function currentUser(request: Request, response: Response) {
  response.json({ success: true, message: 'Current session retrieved.', data: { user: request.session.user } });
}
