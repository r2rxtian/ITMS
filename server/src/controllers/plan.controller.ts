import type { Request, Response } from 'express';
import * as repository from '../repositories/plan.repository.js';
import { ApiError } from '../utils/api-error.js';

function getCurrentWeekAndYear(): { year: number; weekNumber: number } {
  const now = new Date();
  const target = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  target.setUTCDate(target.getUTCDate() + 4 - (target.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1));
  const weekNumber = Math.ceil((((target.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return { year: target.getUTCFullYear(), weekNumber };
}

export async function getSummary(req: Request, res: Response): Promise<void> {
  const current = getCurrentWeekAndYear();
  const warehouseId = Number(req.query.warehouseId) || 1;
  const year = Number(req.query.year) || current.year;
  const weekNumber = Number(req.query.weekNumber) || current.weekNumber;

  const data = await repository.getPlanSummary(warehouseId, year, weekNumber);
  res.json({ success: true, message: 'Plan summary retrieved.', data });
}

export async function getObjectives(req: Request, res: Response): Promise<void> {
  const current = getCurrentWeekAndYear();
  const warehouseId = Number(req.query.warehouseId) || 1;
  const year = Number(req.query.year) || current.year;
  const weekNumber = Number(req.query.weekNumber) || current.weekNumber;

  const data = await repository.listObjectives(warehouseId, year, weekNumber);
  res.json({ success: true, message: 'Objectives retrieved.', data });
}

export async function postObjective(req: Request, res: Response): Promise<void> {
  const current = getCurrentWeekAndYear();
  const { warehouseId, year, weekNumber, title, description, category, priority, targetDate } = req.body;

  if (!title || typeof title !== 'string' || title.trim().length === 0) {
    throw new ApiError(400, 'Objective title is required.');
  }

  const userId = req.session.user?.id || 1;
  const data = await repository.createObjective({
    warehouseId: Number(warehouseId) || 1,
    year: Number(year) || current.year,
    weekNumber: Number(weekNumber) || current.weekNumber,
    title: title.trim(),
    description: description?.trim() || undefined,
    category: category || 'GENERAL',
    priority: priority || 'NORMAL',
    targetDate: targetDate || undefined
  }, userId);

  res.status(201).json({ success: true, message: 'Objective created.', data });
}

export async function patchObjectiveStatus(req: Request, res: Response): Promise<void> {
  const id = Number(req.params.id);
  if (!id) throw new ApiError(400, 'Invalid objective ID.');

  const { status } = req.body;
  if (!status || !['PENDING', 'IN_PROGRESS', 'COMPLETED'].includes(status)) {
    throw new ApiError(400, 'Valid status (PENDING, IN_PROGRESS, COMPLETED) is required.');
  }

  await repository.updateObjectiveStatus(id, status);
  res.json({ success: true, message: `Objective marked as ${status}.` });
}

export async function putObjective(req: Request, res: Response): Promise<void> {
  const id = Number(req.params.id);
  if (!id) throw new ApiError(400, 'Invalid objective ID.');

  await repository.updateObjective(id, req.body);
  res.json({ success: true, message: 'Objective updated.' });
}

export async function deleteObjective(req: Request, res: Response): Promise<void> {
  const id = Number(req.params.id);
  if (!id) throw new ApiError(400, 'Invalid objective ID.');

  await repository.deleteObjective(id);
  res.json({ success: true, message: 'Objective deleted.' });
}

export async function getFloorLogs(req: Request, res: Response): Promise<void> {
  const warehouseId = Number(req.query.warehouseId) || 1;
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 50));

  const data = await repository.listFloorLogs(warehouseId, limit);
  res.json({ success: true, message: 'Floor logs retrieved.', data });
}

export async function postFloorLog(req: Request, res: Response): Promise<void> {
  const { warehouseId, locationId, logType, severity, content } = req.body;

  if (!content || typeof content !== 'string' || content.trim().length === 0) {
    throw new ApiError(400, 'Log content is required.');
  }

  const userId = req.session.user?.id || 1;
  const data = await repository.createFloorLog({
    warehouseId: Number(warehouseId) || 1,
    locationId: locationId ? Number(locationId) : undefined,
    logType: logType || 'HANDOVER',
    severity: severity || 'INFO',
    content: content.trim()
  }, userId);

  res.status(201).json({ success: true, message: 'Floor note logged.', data });
}

export async function deleteFloorLog(req: Request, res: Response): Promise<void> {
  const id = Number(req.params.id);
  if (!id) throw new ApiError(400, 'Invalid floor log ID.');

  await repository.deleteFloorLog(id);
  res.json({ success: true, message: 'Floor log deleted.' });
}
