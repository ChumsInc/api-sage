import Debug from 'debug';
import {mysql2Pool} from 'chums-local-modules';
import {NextFunction, Request, Response} from "express";
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
}

export interface TableStatusRow extends Omit<TableStatus, 'nightlyUpdate'|'hourlyUpdate'|'enabled'|'linked'>, RowDataPacket {
    nightlyUpdate: number;
    hourlyUpdate: number;
    enabled: number;
    linked: number;
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
        const sql = `SELECT Company,
                            SageTable,
                            dbTable,
                            dateUpdated,
                            dateCompleted,
                            status,
                            errorMessage,
                            duration,
                            numRows,
                            nightlyUpdate,
                            hourlyUpdate,
                            quickUpdate,
                            linked,
                            enabled,
                            timestamp
                     FROM c2.DB_UpdateStatus
                     WHERE Company = :company
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
                linked: !!row.hourlyUpdate,
            }
        });
    } catch(err:unknown) {
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
        server.clients.forEach((client:any) => {
            client.send(dbStatusJSON);
        })
        return dbStatus;
    } catch(err:unknown) {
        if (err instanceof Error) {
            debug("wsSendStatus()", err.message);
            return Promise.reject(err);
        }
        debug("wsSendStatus()", err);
        return Promise.reject(new Error('Error in wsSendStatus()'));
    }

}

export async function triggerSendStatus(req: RequestWithSockets, res: Response, next: NextFunction) {
    try {
        if (!req.wsServer) {
            return res.json({error: 'WebSocket service missing'});
        }

        const dbStatus = await wsSendStatus(req.wsServer, req.params);
        res.json({dbStatus});
    } catch(err:unknown) {
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
    } catch(err:unknown) {
        if (err instanceof Error) {
            debug("getStatusLog()", err.message);
            return Promise.reject(err);
        }
        debug("getStatusLog()", err);
        return Promise.reject(new Error('Error in getStatusLog()'));
    }
}
