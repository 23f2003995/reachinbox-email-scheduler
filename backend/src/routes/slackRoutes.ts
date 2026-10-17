import { Router } from 'express';
import { SlackController } from '../controllers/slackController.js';

const router = Router();

router.get('/status', SlackController.getStatus);
router.post('/connect', SlackController.connectWebhook);
router.delete('/disconnect', SlackController.disconnect);
router.get('/oauth/start', SlackController.startOAuth);
router.get('/oauth/callback', SlackController.oauthCallback);
router.post('/test-alert', SlackController.testAlert);

export default router;
