import Router from '../utils/Router.js';
import { getCustomers, getCustomerById, createCustomer, updateCustomer, deleteCustomer, getNextCode } from '../controllers/customer.controller.js';
import { protect } from '../middleware/auth.middleware.js';

const router = new Router();

router.get('/api/customers/next-code', protect, getNextCode);
router.get('/api/customers', protect, getCustomers);
router.get('/api/customers/:id', protect, getCustomerById);
router.post('/api/customers', protect, createCustomer);
router.put('/api/customers/:id', protect, updateCustomer);
router.delete('/api/customers/:id', protect, deleteCustomer);

export default router;
