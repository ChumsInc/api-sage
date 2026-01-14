import Debug from 'debug';
import {mysql2Pool} from 'chums-local-modules';
import {Request, Response} from "express";
import {WebSocketServer} from "ws";
import {RowDataPacket} from "mysql2";

const debug = Debug('chums:lib:sage:status-log');

export interface RequestWithSockets extends Request {
    wsServer: WebSocketServer
}

export interface TableStatus {
    Company: 'chums' | 'bc',
    SageTable: string,
    dbTable: string,
    dateUpdated: string,
    dateCompleted: string,
    status: string,
    errorMessage: string,
    duration: number,
    numRows: number,
    nightlyUpdate: boolean,
    hourlyUpdate: boolean,
    quickUpdate: boolean,
    linked: boolean,
    enabled: boolean,
    parentEnabled: boolean|null,
    timestamp: string;
}

export interface TableStatusRow extends Omit<TableStatus, 'nightlyUpdate' | 'hourlyUpdate' | 'enabled' | 'linked'|'parentEnabled'>, RowDataPacket {
    nightlyUpdate: number;
    hourlyUpdate: number;
    enabled: number;
    linked: number;
    parentEnabled: number|null;
}


interface LoadStatusProps {
    company?: string,
    sageTable?: string
}

export async function loadStatus({company, sageTable}: LoadStatusProps): Promise<TableStatus[]> {
    try {
        if (!company) {
            company = 'chums';
        }
        const sql = `SELECT db.Company,
                            db.SageTable,
                            db.dbTable,
                            db.dateUpdated,
                            db.dateCompleted,
                            db.status,
                            db.errorMessage,
                            db.duration,
                            db.numRows,
                            db.nightlyUpdate,
                            db.hourlyUpdate,
                            db.quickUpdate,
                            db.linked,
                            db.enabled,
                            (select enabled FROM c2.DB_UpdateStatus where Company = 'chums' and SageTable = db.linkedToTable) as  parentEnabled,
                            db.timestamp
                     FROM c2.DB_UpdateStatus db                    
                     WHERE Company = 'chums'
                       AND (IFNULL(:sageTable, '') = '' OR SageTable = :sageTable)
                     ORDER BY Company, SageTable
        `;
        const params = {company, sageTable};
        const [rows] = await mysql2Pool.query<TableStatusRow[]>(sql, params);
        if (!rows || !Array.isArray(rows)) {
            return [];
        }
        return rows.map(row => {
            return {
                ...row,
                nightlyUpdate: !!row.nightlyUpdate,
                hourlyUpdate: !!row.hourlyUpdate,
                enabled: !!row.enabled,
                linked: !!row.linked,
                parentEnabled: row.parentEnabled === 1,
            }
        });
    } catch (err: unknown) {
        if (err instanceof Error) {
            debug("loadStatus()", err.message);
            return Promise.reject(err);
        }
        debug("loadStatus()", err);
        return Promise.reject(new Error('Error in loadStatus()'));
    }
}


export async function wsSendStatus(server: WebSocketServer, params: { table?: string, status?: string }) {
    try {
        const dbStatus = await loadStatus({company: 'chums'});
        const dbStatusJSON = JSON.stringify({dbStatus, current: params});
        server.clients.forEach((client: any) => {
            client.send(dbStatusJSON);
        })
        return dbStatus;
    } catch (err: unknown) {
        if (err instanceof Error) {
            debug("wsSendStatus()", err.message);
            return Promise.reject(err);
        }
        debug("wsSendStatus()", err);
        return Promise.reject(new Error('Error in wsSendStatus()'));
    }

}

export async function triggerSendStatus(req: RequestWithSockets, res: Response) {
    try {
        if (!req.wsServer) {
            return res.json({error: 'WebSocket service missing'});
        }

        const dbStatus = await wsSendStatus(req.wsServer, req.params);
        res.json({dbStatus});
    } catch (err: unknown) {
        if (err instanceof Error) {
            debug("triggerSendStatus()", err.message);
            return Promise.reject(err);
        }
        debug("triggerSendStatus()", err);
        return Promise.reject(new Error('Error in triggerSendStatus()'));
    }
}

export async function getStatusLog(req: Request, res: Response) {
    try {
        const dbStatus = await loadStatus(req.params);
        res.json({dbStatus});
    } catch (err: unknown) {
        if (err instanceof Error) {
            debug("getStatusLog()", err.message);
            return Promise.reject(err);
        }
        debug("getStatusLog()", err);
        return Promise.reject(new Error('Error in getStatusLog()'));
    }
}
