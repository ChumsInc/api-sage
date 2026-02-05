import Debug from 'debug';
import fs from 'node:fs';
import process from 'node:process';
import {exec} from 'node:child_process';
import {handleUpload} from "chums-local-modules";
import {Request, Response} from 'express'
import {RequestWithSockets} from "./status-log.js";
import {ProcessFileResult, UploadFile} from "./sage-transfer-types.js";

const debug = Debug('chums:lib:sage:transfer');

function processFile({path, table}: UploadFile): Promise<ProcessFileResult> {
    // debug('processFile()', path, table);
    const params = `--defaults-file=${process.cwd()}/.my.cnf`;
    return new Promise((resolve, reject) => {
        exec(`mysql ${params} c2 < ${path}`, (err, stdout, stderr) => {
            if (err) {
                debug('processFile()', table, err);
                return reject(err);
            }
            fs.unlink(path, (err) => {
                if (err) {
                    debug('processFile() unable to unlink file', path, table, err);
                    return reject(err);
                }
                return resolve({stdout, stderr});
            })
        })
    })
}

async function uploadFile(req: Request): Promise<UploadFile> {
    try {
        const table = req.params.table as string;
        const upload = await handleUpload(req, {uploadPath: '/var/tmp/chums', keepOriginalFilename: true});
        const newPath = `/var/tmp/chums/${upload.originalFilename || upload.newFilename}`;
        return {path: newPath, table};
    } catch (err) {
        if (err instanceof Error) {
            debug("uploadFile()", err.message);
            return Promise.reject(err);
        }
        debug("uploadFile()", err);
        return Promise.reject(new Error('Error in uploadFile()'));
    }
}


export async function postFile(req: RequestWithSockets, res: Response) {
    try {
        if (req.wsServer) {
            req.wsServer.clients.forEach(client => client.send(JSON.stringify(req.params)));
        }
        const {path, table} = await uploadFile(req);
        const result = await processFile({path, table});
        res.json({result});
    } catch (err: unknown) {
        if (err instanceof Error) {
            debug("postFile()", err.message);
            res.json({error: err.message, name: err.name});
            return;
        }
        res.json({error: 'unknown error in postFile'});
    }
}

