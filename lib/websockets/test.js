import Debug from "debug";
import { WebSocketServer } from "ws";
const debug = Debug('chums:lib:websockets:test');
export const wsServer = new WebSocketServer({ noServer: true });
const checkAliveInterval = 10000;
function checkAlive() {
    wsServer.clients.forEach((client) => {
        if (client.readyState === client.OPEN) {
            client.ping(null, false, (err) => {
                if (err) {
                    debug('wsServer.clients.ping()', err.message);
                }
            });
        }
    });
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
        debug('wsServer.onError()', ev);
    })
        .on('close', (ev) => {
        debug('wsServer.onClose()', ev);
    })
        .on('ping', (ev) => {
        debug('wsServer.onPing()', ev);
    })
        .on('pong', (ev) => {
        debug('wsServer.onPong()', ev);
    })
        .on('unexpected-response', (ev) => {
        debug('wsServer.onUnexpectedResponse()', ev);
    });
});
export function onUpgrade(request, socket, head) {
    wsServer.handleUpgrade(request, socket, head, (ws) => {
        wsServer.emit('connection', ws, request);
    });
}
export const connectionTest = async (req, res) => {
    try {
        wsServer.clients.forEach(client => {
            client.send(JSON.stringify('got /test'));
        });
        res.json({ hello: 'world', clients: wsServer.clients.size });
    }
    catch (err) {
        if (err instanceof Error) {
            debug("connectionTest()", err.message);
            res.status(500).json({ error: err.message, name: err.name });
            return;
        }
        res.status(500).json({ error: 'unknown error in connectionTest' });
    }
};
