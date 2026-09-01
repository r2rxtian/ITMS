import type { ErrorRequestHandler, RequestHandler } from 'express';
import { ZodError } from 'zod';
import { ApiError } from '../utils/api-error.js';

export const notFound: RequestHandler = (request, _response, next) => next(new ApiError(404, `Route ${request.method} ${request.path} was not found.`));

export const errorHandler: ErrorRequestHandler = (error, _request, response, _next) => {
  if (error instanceof ZodError) return response.status(400).json({ success: false, message: 'Validation failed.', errors: error.flatten().fieldErrors });
  if (error instanceof ApiError) return response.status(error.status).json({ success: false, message: error.message, errors: error.errors });
  console.error('[server] unhandled request error', error);
  return response.status(500).json({ success: false, message: 'An unexpected server error occurred.', errors: [] });
};
