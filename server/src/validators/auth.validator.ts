import { z } from 'zod';
export const loginSchema = z.object({ body: z.object({ email: z.string().email().max(255), password: z.string().min(8).max(128) }), params: z.object({}), query: z.object({}) });
