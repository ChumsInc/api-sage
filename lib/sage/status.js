import Debug from 'debug';
import fs from 'node:fs';
import path from 'node:path';
import {TABLES} from "./tables.js";

const debug = Debug('chums:lib:sage:transfer');
const log_path = '/var/www/intranet.chums.com/jobs/status';
const log_file = '%TABLE%.status';

const loadStatusFile = async ({table}) => {
    if (TABLES[table] === undefined) {
        return Promise.reject(new Error('Invalid table'));
    }
    const file = path.resolve(log_path, log_file.replace('%TABLE%', table));
    try {
        await fs.promises.access(file, fs.constants.W_OK | fs.constants.R_OK);
        // debug('loadStatusFile()', file, ok);
    } catch (err) {
        debug("loadStatusFile()", err.code, err.message);
        await fs.promises.writeFile(file, '');
    }
    try {
        const buffer = await fs.promises.readFile(file);
        return {file: table, status: Buffer.from(buffer).toString()}
    } catch (err) {
        debug("loadStatusFile()", err.code, err.message);
        return Promise.reject(err);
    }
};

const writeStatus = ({table, data}) => {
    if (TABLES[table] === undefined) {
        return Promise.reject(new Error('Invalid table'));
    }
    const file = path.resolve(log_path, log_file.replace('%TABLE%', table));
    return new Promise((resolve, reject) => {
        fs.writeFile(file, data, (err) => {
            if (err) {
                debug('writeStatusFile()', err);
                return reject(err);
            }
            resolve();
        });
    });
};

export const saveStatus = async ({company, table, action, notes}) => {
    if (TABLES[table] === undefined) {
        return Promise.reject(new Error('Invalid table'));
    }
    try {
        const data = await loadStatusFile({table});
        const companyNotes = (data[company] || {}).notes || '';
        debug('saveStatus()', {data});
        switch (action) {
        case 'submit':
            data.CHI = {submit: new Date()};
            data.BCS = {submit: new Date()};
            break;
        case 'start':
            data[company] = {...data[company], start: new Date(), notes};
            break;
        case 'receive':
            data[company] = {...data[company], receive: new Date(), notes: notes || companyNotes.notes};
            break;
        case 'import':
            data[company] = {...data[company], import: new Date(), notes: notes || companyNotes.notes};
            break;
        case 'complete':
            data[company] = {...data[company], complete: new Date(), notes: notes || companyNotes.notes};
            break;
        }
        await writeStatus({table, data: action});
        return data;
    } catch (err) {
        debug('saveStatus()', err.message);
        return Promise.reject(err);
    }
};

export async function readStatus(_table = null) {
    const tables = Object.keys(TABLES)
        .filter(table => !_table || table === _table)
        .map(table => loadStatusFile({table}));
    try {
        const status = await Promise.all(tables);
        let completed = true;
        const isComplete = /complete|missing|error/i;
        status.forEach(s => {
            completed = completed && isComplete.test(s.status);
        });
        const incomplete = status.filter(s => !isComplete.test(s.status));
        return {completed, status, incomplete};
    } catch (err) {
        debug("readStatus()", err.message);
        return Promise.reject(err);
    }
}

export const getStatus = async (req, res) => {
    try {
        const data = await loadStatusFile(req.params);
        res.json(data);
    } catch (err) {
        debug("getStatus()", err.message);
        res.json({error: err.message});
    }
};

export const getAllStatuses = async (req, res) => {
    try {
        debug('getAllStatuses()', req.profile.user.id);
        const result = await readStatus();
        res.json(result);
    } catch (err) {
        debug("getAllStatuses()", err.message);
        res.json({error: err.message});
    }
};

export const postStatus = async (req, res) => {
    try {
        const {company, table, action} = req.params;
        const {notes = ''} = req.query;
        const data = await saveStatus({company, table, action, notes});
        res.json(data);
    } catch (err) {
        debug("postStatus()", err.message);
        return res.json({error: err.message});
    }
};
