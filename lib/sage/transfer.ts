import Debug from 'debug';
import fs from 'node:fs';
import process from 'node:process';
import {exec} from 'node:child_process';
import {handleUpload} from "chums-local-modules";
import {Request, Response} from 'express'
import {RequestWithSockets} from "./status-log.js";

const debug = Debug('chums:lib:sage:transfer');

const processFile = ({path, table}: {
    path: string;
    table?: string;
}) => {
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
};

const uploadFile = async (req:Request) => {
    try {
        const upload = await handleUpload(req, {uploadPath: '/var/tmp/chums', keepOriginalFilename: true});
        const newPath = `/var/tmp/chums/${upload.originalFilename || upload.newFilename}`;
        return {path: newPath, table: req.params.table};
    } catch (err) {
        if (err instanceof Error) {
            debug("uploadFile()", err.message);
            return Promise.reject(err);
        }
        debug("uploadFile()", err);
        return Promise.reject(new Error('Error in uploadFile()'));
    }
};


export const postFile = async (req:RequestWithSockets, res:Response) => {
    try {
        if (req.wsServer) {
            req.wsServer.clients.forEach(client => client.send(JSON.stringify(req.params)));
        }
        const {path, table} = await uploadFile(req);
        const result = await processFile({path, table});
        res.json({result});
    } catch(err:unknown) {
        if (err instanceof Error) {
            debug("postFile()", err.message);
            res.json({error: err.message, name: err.name});
            return;
        }
        res.json({error: 'unknown error in postFile'});
    }
};



