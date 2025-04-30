import Debug from 'debug';
import {Router} from 'express';
import {router as wsRouter} from './websockets/index.js';
import {getStatusLog, triggerSendStatus} from "./sage/status-log.js";
import {getAllStatuses, getStatus, postStatus} from "./sage/status.js";
import {postFile} from "./sage/transfer.js";
import {validateUser} from "chums-local-modules";

const debug = Debug('chums:lib');
const router = Router();

function logPath(req, res, next) {
    const user = res.locals.profile?.user?.email || res.locals.profile?.user?.id || '-';
    const {ip, method, originalUrl} = req;
    const referer = req.get('referer') || '';
    debug(ip, user, method, originalUrl, referer);
    next();
}

router.use(validateUser, logPath);

router.post('/status/trigger/:table/:status.json', triggerSendStatus);
router.post('/status/trigger/:table.json', triggerSendStatus);
router.get('/status/trigger.json', triggerSendStatus);
router.get('/status/log.json', getStatusLog);
router.get('/status/log', getStatusLog);
router.get('/status/all.json', getAllStatuses);
router.get('/status/:table.json', getStatus);
router.post('/table/:table.sql', postFile);

router.use('/sockets', wsRouter);

export default router;
