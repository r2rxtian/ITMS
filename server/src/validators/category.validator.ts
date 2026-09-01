import { z } from 'zod';
const categoryBody = z.object({ name: z.string().trim().min(2).max(100), description: z.string().trim().max(500).optional().nullable() });
export const createCategorySchema = z.object({ body: categoryBody, params: z.object({}), query: z.object({}) });
export const updateCategorySchema = z.object({ body: categoryBody.partial(), params: z.object({ id: z.coerce.number().int().positive() }), query: z.object({}) });
