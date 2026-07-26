import Router from '../utils/Router.js';
import { getInvoices, getInvoiceById, createInvoice, updateInvoice, deleteInvoice, getNextNumber } from '../controllers/invoice.controller.js';
import { protect } from '../middleware/auth.middleware.js';

const router = new Router();

router.get('/api/invoices/next-number', protect, getNextNumber);
router.get('/api/invoices', protect, getInvoices);
router.get('/api/invoices/:id', protect, getInvoiceById);
router.post('/api/invoices', protect, createInvoice);
router.put('/api/invoices/:id', protect, updateInvoice);
router.delete('/api/invoices/:id', protect, deleteInvoice);

export default router;
