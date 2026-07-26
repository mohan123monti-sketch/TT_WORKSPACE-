import { CustomerService } from '../services/customer.service.js';
import { sendSuccess, sendError } from '../utils/responseFormatter.js';

export const getCustomers = async (req, res) => {
  const customers = await CustomerService.getAll(req.query);
  sendSuccess(res, 200, 'Customers retrieved successfully', customers);
};

export const getNextCode = async (req, res) => {
  const nextCode = await CustomerService.getNextCustomerCode();
  sendSuccess(res, 200, 'Next customer code retrieved', { code: nextCode });
};

export const getCustomerById = async (req, res) => {
  const customer = await CustomerService.getById(req.params.id);
  if (!customer) {
    return sendError(res, 404, 'Customer not found');
  }
  sendSuccess(res, 200, 'Customer retrieved successfully', customer);
};

export const createCustomer = async (req, res) => {
  const { name, email } = req.body;
  if (!name || !email) {
    return sendError(res, 400, 'Name and email are required');
  }
  
  const newCustomer = await CustomerService.create(req.body);
  sendSuccess(res, 201, 'Customer created successfully', newCustomer);
};

export const updateCustomer = async (req, res) => {
  const updatedCustomer = await CustomerService.update(req.params.id, req.body);
  if (!updatedCustomer) {
    return sendError(res, 404, 'Customer not found');
  }
  sendSuccess(res, 200, 'Customer updated successfully', updatedCustomer);
};

export const deleteCustomer = async (req, res) => {
  const success = await CustomerService.delete(req.params.id);
  if (!success) {
    return sendError(res, 404, 'Customer not found');
  }
  sendSuccess(res, 200, 'Customer deleted successfully');
};
