import bcrypt from 'bcrypt';
import { findUserByEmail } from '../repositories/auth.repository.js';
import { ApiError } from '../utils/api-error.js';

export async function authenticate(email: string, password: string) {
  const user = await findUserByEmail(email.toLowerCase());
  if (!user || !(await bcrypt.compare(password, user.password_hash))) throw new ApiError(401, 'Invalid email or password.');
  return { id: user.user_id, email: user.email, name: user.display_name, role: user.role_name };
}
