import { z } from 'zod';
const stockBody=z.object({itemId:z.number().int().positive(),quantity:z.number().positive(),referenceNumber:z.string().trim().max(100).optional().nullable(),reason:z.string().trim().min(3).max(1000)});
export const stockOperationSchema=z.object({body:stockBody,params:z.object({}),query:z.object({})});
export const movementSchema=z.object({body:z.object({itemId:z.number().int().positive(),toLocationId:z.number().int().positive(),reason:z.string().trim().min(3).max(1000)}),params:z.object({}),query:z.object({})});
