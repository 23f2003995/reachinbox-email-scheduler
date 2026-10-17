import { Router } from 'express';
import { EmailController } from '../controllers/emailController.js';

const router = Router();

router.post('/schedule', EmailController.scheduleEmails);
router.get('/scheduled', EmailController.getScheduledEmails);
router.get('/sent', EmailController.getSentEmails);
router.get('/search', EmailController.searchEmails);
router.get('/stats', EmailController.getStats);

export default router;
