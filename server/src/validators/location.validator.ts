import { z } from 'zod';
const locationBody=z.object({code:z.string().trim().min(1).max(40).regex(/^[A-Za-z0-9-]+$/),name:z.string().trim().min(2).max(120),parentLocationId:z.number().int().positive().optional().nullable(),maximumCapacity:z.number().nonnegative(),locationType:z.enum(['WAREHOUSE','SECTION','SLOT','STORAGE']),description:z.string().max(500).optional().nullable()});
export const createLocationSchema=z.object({body:locationBody,params:z.object({}),query:z.object({})});
export const updateLocationSchema=z.object({body:locationBody.partial(),params:z.object({id:z.coerce.number().int().positive()}),query:z.object({})});
