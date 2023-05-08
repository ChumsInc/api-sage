import Debug from 'debug';
import {Router} from 'express';
import {router as wsRouter} from './websockets/index.js';
import {getStatusLog, triggerSendStatus} from "./sage/status-log.js";
import {getAllStatuses, getStatus, postStatus} from "./sage/status.js";
import {postFile} from "./sage/transfer.js";

const debug = Debug('chums:lib');
const router = Router();

function logPath(req, res, next) {
    const user = res.locals.profile?.user?.email || res.locals.profile?.user?.id || '-';
    const {ip, method, originalUrl} = req;
    const referer = req.get('referer') || '';
    debug(ip, user, method, originalUrl, referer);
    next();
}

router.use(logPath);

router.post('/status/trigger/:table?/:status?', triggerSendStatus);
router.get('/status/trigger', triggerSendStatus);
router.get('/status/log', getStatusLog);
router.get('/status/all', getAllStatuses);
router.get('/status/:table', getStatus);
router.post('/table/:table', postFile);
router.get('/set-status/:company(CHI|BCS)/:table/:action(submit|start|receive|import|complete)', postStatus);

router.use('/sockets', wsRouter);

export default router;
