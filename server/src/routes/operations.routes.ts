import{Router}from'express';import*as controller from'../controllers/operations.controller.js';import{allowRoles,requireAuth}from'../middleware/auth.middleware.js';import{asyncHandler}from'../utils/async-handler.js';
export const transactionRouter=Router();transactionRouter.use(requireAuth);transactionRouter.get('/',asyncHandler(controller.transactions));
export const movementRouter=Router();movementRouter.use(requireAuth);movementRouter.get('/',asyncHandler(controller.movements));
export const alertRouter=Router();alertRouter.use(requireAuth);alertRouter.get('/',asyncHandler(controller.alerts));alertRouter.patch('/:id/resolve',allowRoles('ADMIN','STAFF'),asyncHandler(controller.resolveAlert));
export const reportRouter=Router();reportRouter.use(requireAuth);reportRouter.get('/inventory-summary',asyncHandler(controller.summary));reportRouter.get('/category-breakdown',asyncHandler(controller.categories));
export const auditRouter=Router();auditRouter.use(requireAuth,allowRoles('ADMIN'));auditRouter.get('/',asyncHandler(controller.auditLogs));
