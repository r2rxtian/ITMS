import session from 'express-session';
import { getPool, sql } from './database.js';

export class SqlSessionStore extends session.Store {
  override get(sid: string, callback: (error?: unknown, session?: session.SessionData | null) => void): void {
    void getPool().then(pool => pool.request().input('sid',sql.NVarChar(128),sid).query(`SELECT session_data FROM dbo.ims_sessions WHERE session_id=@sid AND expires_at>SYSUTCDATETIME()`)).then(result => {
      const value=result.recordset[0]?.session_data as string|undefined; callback(undefined,value?JSON.parse(value) as session.SessionData:null);
    }).catch(callback);
  }
  override set(sid: string, value: session.SessionData, callback?: (error?: unknown) => void): void {
    const expiry=value.cookie.expires??new Date(Date.now()+8*60*60_000);
    void getPool().then(pool=>pool.request().input('sid',sql.NVarChar(128),sid).input('data',sql.NVarChar(sql.MAX),JSON.stringify(value)).input('expires',sql.DateTime2,expiry).query(`MERGE dbo.ims_sessions AS target USING(SELECT @sid AS session_id) source ON target.session_id=source.session_id WHEN MATCHED THEN UPDATE SET session_data=@data,expires_at=@expires,updated_at=SYSUTCDATETIME() WHEN NOT MATCHED THEN INSERT(session_id,session_data,expires_at) VALUES(@sid,@data,@expires);`)).then(()=>callback?.()).catch(error=>callback?.(error));
  }
  override destroy(sid: string, callback?: (error?: unknown) => void): void { void getPool().then(pool=>pool.request().input('sid',sql.NVarChar(128),sid).query(`DELETE dbo.ims_sessions WHERE session_id=@sid`)).then(()=>callback?.()).catch(error=>callback?.(error)); }
  override touch(sid: string, value: session.SessionData, callback?: () => void): void { const expiry=value.cookie.expires??new Date(Date.now()+8*60*60_000);void getPool().then(pool=>pool.request().input('sid',sql.NVarChar(128),sid).input('expires',sql.DateTime2,expiry).query(`UPDATE dbo.ims_sessions SET expires_at=@expires,updated_at=SYSUTCDATETIME() WHERE session_id=@sid`)).finally(()=>callback?.()); }
}
