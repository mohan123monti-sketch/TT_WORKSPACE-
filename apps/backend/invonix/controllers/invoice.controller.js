import { InvoiceService } from '../services/invoice.service.js';
import { sendSuccess, sendError } from '../utils/responseFormatter.js';

export const getInvoices = async (req, res) => {
  const invoices = await InvoiceService.getAll(req.query);
  sendSuccess(res, 200, 'Invoices retrieved successfully', invoices);
};

export const getNextNumber = async (req, res) => {
  const nextNum = await InvoiceService.getNextInvoiceNumber();
  sendSuccess(res, 200, 'Next invoice number retrieved', { invoiceNumber: nextNum });
};

export const getInvoiceById = async (req, res) => {
  try {
    const invoice = await InvoiceService.getById(req.params.id);
    if (!invoice) {
      return sendError(res, 404, 'Invoice not found');
    }
    sendSuccess(res, 200, 'Invoice retrieved successfully', invoice);
  } catch (error) {
    console.error('Error fetching invoice:', error);
    return sendError(res, 500, 'Error fetching invoice');
  }
};

export const createInvoice = async (req, res) => {
  try {
    const newInvoice = await InvoiceService.create(req.body);
    sendSuccess(res, 201, 'Invoice created successfully', newInvoice);
  } catch (err) {
    if (err.status === 400) {
      return sendError(res, 400, err.message);
    }
    // For other unexpected errors, pass to standard error handling or just return 500
    console.error("Error creating invoice:", err);
    return sendError(res, 500, 'Failed to create invoice');
  }
};

export const updateInvoice = async (req, res) => {
  const updatedInvoice = await InvoiceService.update(req.params.id, req.body);
  if (!updatedInvoice) {
    return sendError(res, 404, 'Invoice not found');
  }
  sendSuccess(res, 200, 'Invoice updated successfully', updatedInvoice);
};

export const deleteInvoice = async (req, res) => {
  const success = await InvoiceService.delete(req.params.id);
  if (!success) {
    return sendError(res, 404, 'Invoice not found');
  }
  sendSuccess(res, 200, 'Invoice deleted successfully');
};
