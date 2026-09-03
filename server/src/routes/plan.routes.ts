import { Router } from 'express';
import * as controller from '../controllers/plan.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { asyncHandler } from '../utils/async-handler.js';

export const planRouter = Router();
planRouter.use(requireAuth);

planRouter.get('/summary', asyncHandler(controller.getSummary));
planRouter.get('/objectives', asyncHandler(controller.getObjectives));
planRouter.post('/objectives', asyncHandler(controller.postObjective));
planRouter.patch('/objectives/:id/status', asyncHandler(controller.patchObjectiveStatus));
planRouter.put('/objectives/:id', asyncHandler(controller.putObjective));
planRouter.delete('/objectives/:id', asyncHandler(controller.deleteObjective));

planRouter.get('/logs', asyncHandler(controller.getFloorLogs));
planRouter.post('/logs', asyncHandler(controller.postFloorLog));
planRouter.delete('/logs/:id', asyncHandler(controller.deleteFloorLog));
