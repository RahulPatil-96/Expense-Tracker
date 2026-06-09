import express from 'express';
import {
    addTransaction,
    getTransactions,
    updateTransactionStatus,
    deleteTransaction,
    getSummary,
    getPeople,
    getPersonDetails,
    getAiInsights,
    settleAllForPerson
} from '../controllers/borrowLendController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);

router.get('/', getTransactions);
router.post('/', addTransaction);
router.get('/summary', getSummary);
router.get('/people', getPeople);
router.get('/people/:name', getPersonDetails);
router.put('/people/:name/settle', settleAllForPerson);
router.put('/:id/status', updateTransactionStatus);
router.delete('/:id', deleteTransaction);
router.get('/insights', getAiInsights);

export default router;
