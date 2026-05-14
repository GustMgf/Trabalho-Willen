const express = require('express');
const tradeController = require('../controllers/tradeController');

const router = express.Router();

router.get('/', tradeController.getTrades);
router.get('/:id', tradeController.getTradeById);
router.post('/', tradeController.createTrade);
router.put('/:id/status', tradeController.updateTradeStatus);
router.delete('/:id', tradeController.deleteTrade);

module.exports = router;
