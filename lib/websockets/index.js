import Debug from 'debug';
import {Router} from 'express';
import {validateUser} from 'chums-local-modules';
import {WebSocketServer} from 'ws';

const debug = Debug('chums:lib:websockets');
export const router = Router();


export const wsServer = new WebSocketServer({noServer: true});

wsServer.on('connection', (ws, message) => {
    ws.isAlive = true;

    ws.on('message', (message) => {
        ws.isAlive = true;
        debug('wsServer.onMessage', message);
    });

    ws.on('pong', (ev) => {
        ws.isAlive = true;
    });

    ws.on('close', (ev) => {
        debug('wsServer.onClose()', ev);
    });

    ws.on('error', (ev) => {
        debug('wsServer.onError()', ev);
    });
})

setInterval(() => {
    wsServer.clients.forEach((ws) => {
        if (!ws.isAlive) {
            return ws.terminate();
        }

        ws.isAlive = false;
        ws.ping(null, false, (err) => {
            if (err) {
                debug('wsServer.clients.ping()', err.message);
            }
        });
    })
}, 10000);

export const onUpgrade = (request, socket, head) => {
    // debug(' server.onUpgrade()', request);
    wsServer.handleUpgrade(request, socket, head, (ws) => {
        wsServer.emit('connection', ws, request);
    })
}

router.get('/test', (req, res) => {
    debug('router.get /test ()', req.wsServer.clients.size);
    wsServer.clients.forEach(client => client.send(JSON.stringify('got /test')));
    res.json({hello: 'world', clients: wsServer.clients.size});
})
