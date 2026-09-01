import type{Request,Response}from'express';
import*as repository from'../repositories/operations.repository.js';
import{writeAudit}from'../repositories/audit.repository.js';
import{ApiError}from'../utils/api-error.js';

const pagination=(request:Request)=>({page:Math.max(1,Number(request.query.page)||1),limit:Math.min(100,Math.max(1,Number(request.query.limit)||10))});
export async function transactions(request:Request,response:Response){const{page,limit}=pagination(request);const search=String(request.query.search??'').slice(0,200);const type=String(request.query.type??'all').slice(0,30);response.json({success:true,message:'Stock transactions retrieved.',data:await repository.listTransactions(page,limit,search,type)});}
export async function movements(request:Request,response:Response){const{page,limit}=pagination(request);response.json({success:true,message:'Item movements retrieved.',data:await repository.listMovements(page,limit)});}
export async function alerts(_request:Request,response:Response){response.json({success:true,message:'Alerts retrieved.',data:await repository.listAlerts()});}
export async function resolveAlert(request:Request,response:Response){const data=await repository.resolveAlert(Number(request.params.id),request.session.user!.id);if(!data)throw new ApiError(404,'Open alert not found.');await writeAudit({userId:request.session.user!.id,action:'ALERT_RESOLVED',entityType:'ALERT',entityId:data.id,description:'Resolved inventory alert.',ipAddress:request.ip});response.json({success:true,message:'Alert resolved.',data});}
export async function summary(_request:Request,response:Response){response.json({success:true,message:'Inventory summary retrieved.',data:await repository.inventorySummary()});}
export async function categories(_request:Request,response:Response){response.json({success:true,message:'Category report retrieved.',data:await repository.categoryBreakdown()});}
export async function auditLogs(request:Request,response:Response){const{page,limit}=pagination(request);response.json({success:true,message:'Audit logs retrieved.',data:await repository.listAuditLogs(page,limit)});}
