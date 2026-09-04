import bcrypt from 'bcrypt';
import { findUserByEmail, findUserById, updateUserPassword } from '../repositories/auth.repository.js';
import { ApiError } from '../utils/api-error.js';

export async function authenticate(email: string, password: string) {
  const user = await findUserByEmail(email.toLowerCase());
  if (!user || !(await bcrypt.compare(password, user.password_hash))) throw new ApiError(401, 'Invalid email or password.');
  return { id: user.user_id, email: user.email, name: user.display_name, role: user.role_name };
}

export async function changePassword(userId: number, currentPassword: string, newPassword: string) {
  const user = await findUserById(userId);
  if (!user) throw new ApiError(404, 'User account not found.');

  const isCurrentValid = await bcrypt.compare(currentPassword, user.password_hash);
  if (!isCurrentValid) throw new ApiError(400, 'Current password is incorrect.');

  const isSamePassword = await bcrypt.compare(newPassword, user.password_hash);
  if (isSamePassword) throw new ApiError(400, 'New password must be different from your current password.');

  const newHash = await bcrypt.hash(newPassword, 12);
  await updateUserPassword(userId, newHash);
}
