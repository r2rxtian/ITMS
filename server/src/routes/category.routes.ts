import { Router } from 'express';
import * as controller from '../controllers/category.controller.js';
import { allowRoles, requireAuth } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { asyncHandler } from '../utils/async-handler.js';
import { createCategorySchema, updateCategorySchema } from '../validators/category.validator.js';
export const categoryRouter=Router();
categoryRouter.use(requireAuth);categoryRouter.get('/',asyncHandler(controller.list));categoryRouter.post('/',allowRoles('ADMIN'),validate(createCategorySchema),asyncHandler(controller.create));categoryRouter.put('/:id',allowRoles('ADMIN'),validate(updateCategorySchema),asyncHandler(controller.update));categoryRouter.delete('/:id',allowRoles('ADMIN'),asyncHandler(controller.archive));
