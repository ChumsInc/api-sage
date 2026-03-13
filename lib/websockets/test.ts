import Debug from "debug";
import {WebSocketServer, type WebSocket} from "ws";
import {RequestWithSockets} from "../sage/status-log.js";
import type {Duplex} from "node:stream";
import {Response} from "express";

const debug = Debug('chums:lib:websockets:test');

export const wsServer = new WebSocketServer({noServer: true});
const checkAliveInterval = 10000;

function checkAlive() {

    wsServer.clients.forEach((client:WebSocket) => {
        if (client.readyState === client.OPEN) {
            client.ping(null, false, (err) => {
                if (err) {
                    debug('wsServer.clients.ping()', err.message);
                }
            });
        }
    })
    setTimeout(checkAlive, checkAliveInterval);
}

setTimeout(checkAlive, checkAliveInterval);

wsServer.on('connection', (ws) => {
    debug('wsServer.onConnection()');
    ws
        .on('message', (message) => {
            debug('wsServer.onMessage()', message);
        })
        .on('error', (ev) => {
            debug('wsServer.onError()', ev)
        })
        .on('close', (ev) => {
            debug('wsServer.onClose()', ev)
        })
        .on('ping', (ev) => {
            debug('wsServer.onPing()', ev)
        })
        .on('pong', (ev) => {
            debug('wsServer.onPong()', ev)
        })
        .on('unexpected-response', (ev) => {
            debug('wsServer.onUnexpectedResponse()', ev)
        });
})


export function onUpgrade(request:RequestWithSockets, socket:Duplex, head:Buffer<ArrayBuffer>) {
    wsServer.handleUpgrade(request, socket, head, (ws) => {
        wsServer.emit('connection', ws, request);
    })
}

export const connectionTest = async (req:RequestWithSockets, res:Response):Promise<void> => {
    try {
        wsServer.clients.forEach(client => {
            client.send(JSON.stringify('got /test'));
        })
        res.json({hello: 'world', clients: wsServer.clients.size});
    } catch(err:unknown) {
        if (err instanceof Error) {
            debug("connectionTest()", err.message);
            res.status(500).json({error: err.message, name: err.name});
            return;
        }
        res.status(500).json({error: 'unknown error in connectionTest'});
    }
}
