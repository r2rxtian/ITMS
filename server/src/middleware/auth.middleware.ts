import type { RequestHandler } from 'express';
import { ApiError } from '../utils/api-error.js';

export const requireAuth: RequestHandler = (request, _response, next) => {
  if (!request.session.user) return next(new ApiError(401, 'Authentication required.'));
  next();
};

export const allowRoles = (...roles: Array<'ADMIN' | 'STAFF' | 'VIEWER'>): RequestHandler =>
  (request, _response, next) => {
    if (!request.session.user) return next(new ApiError(401, 'Authentication required.'));
    if (!roles.includes(request.session.user.role)) return next(new ApiError(403, 'You do not have permission to perform this action.'));
    next();
  };
