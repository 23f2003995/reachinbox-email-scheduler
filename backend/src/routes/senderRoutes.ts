import { Router } from 'express';
import { SenderController } from '../controllers/senderController.js';

const router = Router();

router.get('/', SenderController.getSenders);
router.post('/', SenderController.createSender);

export default router;
