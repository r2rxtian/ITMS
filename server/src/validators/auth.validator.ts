import { z } from 'zod';

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email().max(255),
    password: z.string().min(8).max(128)
  }),
  params: z.object({}),
  query: z.object({})
});

export const changePasswordSchema = z.object({
  body: z.object({
    currentPassword: z.string().min(1, 'Current password is required.').max(128),
    newPassword: z.string().min(8, 'New password must be at least 8 characters.').max(128),
    confirmPassword: z.string().min(8, 'Confirm password must be at least 8 characters.').max(128)
  }).refine(data => data.newPassword === data.confirmPassword, {
    message: 'New password and confirm password do not match.',
    path: ['confirmPassword']
  }),
  params: z.object({}),
  query: z.object({})
});
