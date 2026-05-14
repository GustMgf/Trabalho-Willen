const express = require('express');
const messageController = require('../controllers/messageController');

const router = express.Router();

router.get('/:tradeId/messages', messageController.getMessagesByTrade);
router.post('/:tradeId/messages', messageController.createMessage);
router.get('/:trocaId/mensagens', messageController.getMessagesByTrade);
router.post('/:trocaId/mensagens', messageController.createMessage);

module.exports = router;
