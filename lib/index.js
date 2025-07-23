import Debug from 'debug';
import {Router} from 'express';
import {router as wsRouter} from './websockets/index.js';
import {getStatusLog, triggerSendStatus} from "./sage/status-log.js";
import {getAllStatuses, getStatus} from "./sage/status.js";
import {postFile} from "./sage/transfer.js";
import {deprecationNotice, logPath, validateUser} from "chums-local-modules";

const debug = Debug('chums:lib');
const router = Router();

router.use(validateUser, logPath(debug));

router.post('/status/trigger/:table/:status.json', triggerSendStatus);
router.post('/status/trigger/:table.json', triggerSendStatus);
router.get('/status/trigger.json', triggerSendStatus);
router.get('/status/log.json', getStatusLog);
router.get('/status/log', deprecationNotice, getStatusLog);
router.get('/status/all.json', deprecationNotice, getAllStatuses);
router.get('/status/:table.json', deprecationNotice, getStatus);
router.post('/table/:table.sql', postFile);

router.use('/sockets', wsRouter);

export default router;
