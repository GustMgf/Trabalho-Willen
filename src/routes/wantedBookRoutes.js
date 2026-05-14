const express = require('express');
const wantedBookController = require('../controllers/wantedBookController');

const router = express.Router();

router.get('/', wantedBookController.getWantedBooks);
router.get('/:id', wantedBookController.getWantedBookById);
router.post('/', wantedBookController.createWantedBook);
router.put('/:id', wantedBookController.updateWantedBook);
router.delete('/:id', wantedBookController.deleteWantedBook);

module.exports = router;
