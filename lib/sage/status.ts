import Debug from 'debug';
import fs from 'node:fs/promises';
import path from 'node:path';
import {TABLES} from "./tables.js";
import {Request, Response} from "express";
import {ValidatedUser} from "chums-local-modules";

const debug = Debug('chums:lib:sage:transfer');
const log_path = '/var/www/intranet.chums.com/jobs/status';
const log_file = '%TABLE%.status';

export interface LoadStatusFileResponse {
    file: string;
    status: string;
}

export interface LoadStatusFileProps {
    table: string;
}

async function loadStatusFile(table: string): Promise<LoadStatusFileResponse> {
    if (TABLES[table] === undefined) {
        return Promise.reject(new Error(`Invalid table: ${table}`));
    }
    const file = path.resolve(log_path, log_file.replace('%TABLE%', table));
    try {
        await fs.access(file, fs.constants.W_OK | fs.constants.R_OK);
        // debug('loadStatusFile()', file, ok);
    } catch (err: unknown) {
        if (err instanceof Error) {
            debug("loadStatusFile()", err.message);
        }
        await fs.writeFile(file, '');
    }
    try {
        const buffer = await fs.readFile(file);
        return {file: table, status: Buffer.from(buffer).toString()}
    } catch (err: unknown) {
        if (err instanceof Error) {
            debug("loadStatusFile()", err.message);
        }
        return Promise.reject(err);
    }
}


export interface ReadStatusResponse {
    completed: boolean;
    status: LoadStatusFileResponse[];
    incomplete: LoadStatusFileResponse[];
}

export async function readStatus(table = null): Promise<ReadStatusResponse> {
    const tablePromises = Object.keys(TABLES)
        .filter(t => !table || t === table)
        .map(t => loadStatusFile(t));

    try {
        const status = await Promise.all(tablePromises);
        let completed = true;
        const isComplete = /complete|missing|error/i;
        status.forEach(s => {
            completed = completed && isComplete.test(s.status);
        });
        const incomplete = status.filter(s => !isComplete.test(s.status));
        return {completed, status, incomplete};
    } catch (err: unknown) {
        if (err instanceof Error) {
            console.debug("readStatus()", err.message);
            return Promise.reject(err);
        }
        console.debug("readStatus()", err);
        return Promise.reject(new Error('Error in readStatus()'));
    }
}

export const getStatus = async (req: Request, res: Response) => {
    try {
        const data = await loadStatusFile(req.params.table ?? 'N/A');
        res.json(data);
    } catch (err: unknown) {
        if (err instanceof Error) {
            debug("getStatus()", err.message);
            res.json({error: err.message, name: err.name});
            return;
        }
        res.json({error: 'unknown error in getStatus'});
    }
};

export const getAllStatuses = async (req: Request, res: Response<unknown, ValidatedUser>) => {
    try {
        debug('getAllStatuses()', res.locals.auth.profile.user.id);
        const result = await readStatus();
        res.json(result);
    } catch (err: unknown) {
        if (err instanceof Error) {
            debug("getAllStatuses()", err.message);
            res.json({error: err.message, name: err.name});
            return;
        }
        res.json({error: 'unknown error in getAllStatuses'});
    }
}

