import { db } from '../config/db.js';
import { CustomerService } from './customer.service.js';
import { SettingsService } from './settings.service.js';

const mapInvoiceToCamelCase = (row) => ({
  id: row.id,
  invoiceNumber: row.invoice_number,
  invoiceDate: row.invoice_date ? new Date(row.invoice_date).toISOString().split('T')[0] : null,
  purchaseDate: row.purchase_date ? new Date(row.purchase_date).toISOString().split('T')[0] : null,
  dueDate: row.due_date ? new Date(row.due_date).toISOString().split('T')[0] : null,
  customerId: row.customer_id,
  customerName: row.customer_name,
  companyName: row.company_name,
  customerAddress: row.customer_address,
  phone: row.phone,
  email: row.email,
  gstNumber: row.gst_number,
  paymentMode: row.payment_mode,
  orderMode: row.order_mode,
  status: row.status,
  notes: row.notes,
  termsConditions: row.terms_conditions,
  subscriptionStatus: row.subscription_status,
  latePaymentNotice: Boolean(row.late_payment_notice),
  subtotal: Number(row.subtotal),
  discount: Number(row.total_discount),
  tax: Number(row.total_tax),
  grandTotal: Number(row.grand_total),
  amount: Number(row.grand_total),
  createdAt: row.created_at,
  updatedAt: row.updated_at
});

const mapItemToCamelCase = (row) => ({
  id: row.id,
  invoiceId: row.invoice_id,
  itemName: row.item_name,
  description: row.description,
  quantity: row.quantity,
  unitPrice: Number(row.unit_price),
  discount: Number(row.discount),
  taxPercentage: Number(row.tax_percentage),
  taxAmount: Number(row.tax_amount),
  amount: Number(row.amount),
  rowTotal: Number(row.line_total)
});

export const InvoiceService = {
  async getAll(query) {
    let sql = `
      SELECT * FROM invoices
    `;
    const params = [];
    let hasWhere = false;

    if (query?.status) {
      sql += ' WHERE status = ?';
      params.push(query.status);
      hasWhere = true;
    }
    
    if (query?.customerId && query?.customerId !== 'all') {
      sql += hasWhere ? ' AND customer_id = ?' : ' WHERE customer_id = ?';
      params.push(query.customerId);
      hasWhere = true;
    }

    if (query?.startDate) {
      sql += hasWhere ? ' AND invoice_date >= ?' : ' WHERE invoice_date >= ?';
      params.push(query.startDate);
      hasWhere = true;
    }

    if (query?.endDate) {
      sql += hasWhere ? ' AND invoice_date <= ?' : ' WHERE invoice_date <= ?';
      params.push(query.endDate);
    }
    
    sql += ' ORDER BY created_at DESC';
    
    const [rows] = await db.query(sql, params);
    return rows.map(mapInvoiceToCamelCase);
  },

  async getNextInvoiceNumber() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const prefix = `INV-${year}-${month}-`;

    const [rows] = await db.query(
      "SELECT invoice_number FROM invoices WHERE invoice_number LIKE ? ORDER BY id DESC LIMIT 1",
      [`${prefix}%`]
    );

    if (rows.length === 0 || !rows[0].invoice_number) {
      return `${prefix}001`;
    }

    const lastNumber = rows[0].invoice_number;
    const numberPart = parseInt(lastNumber.replace(prefix, ''), 10);

    if (isNaN(numberPart)) return `${prefix}001`;

    return `${prefix}${String(numberPart + 1).padStart(3, '0')}`;
  },

  async getById(id) {
    const [invoiceRows] = await db.query(`
      SELECT * FROM invoices WHERE id = ? OR invoice_number = ?
    `, [id, id]);

    if (invoiceRows.length === 0) return null;
    const invoice = mapInvoiceToCamelCase(invoiceRows[0]);
    const rawInvoice = invoiceRows[0];

    invoice.customerDetails = {
      id: invoice.customerId,
      name: invoice.customerName,
      company: invoice.companyName,
      email: invoice.email,
      phone: invoice.phone,
      address: invoice.customerAddress,
      gstNumber: invoice.gstNumber,
      subscription: invoice.subscriptionStatus
    };

    invoice.companyDetails = {
      companyName: rawInvoice.company_name_snapshot,
      logo: rawInvoice.company_logo_snapshot,
      address: rawInvoice.company_address_snapshot,
      phone: rawInvoice.company_phone_snapshot,
      email: rawInvoice.company_email_snapshot,
      gstNumber: rawInvoice.company_gst_snapshot
    };

    const [itemsSQL] = await db.query(`
      SELECT * FROM invoice_items WHERE invoice_id = ?
    `, [invoice.id]);

    invoice.items = itemsSQL.map(mapItemToCamelCase);
    
    // Maintain invoiceData format for UI compatibility
    invoice.invoiceData = {
      invoiceNumber: invoice.invoiceNumber,
      invoiceDate: invoice.invoiceDate,
      purchaseDate: invoice.purchaseDate,
      dueDate: invoice.dueDate,
      customerName: invoice.customerName,
      companyName: invoice.companyName,
      contactPerson: invoice.customerName,
      address: invoice.customerAddress,
      phone: invoice.phone,
      email: invoice.email,
      gstNumber: invoice.gstNumber,
      orderMode: invoice.orderMode,
      paymentMode: invoice.paymentMode,
      note: invoice.notes
    };

    return invoice;
  },

  async create(data) {
    if (!data.customerId) {
      const err = new Error('Invalid customer.');
      err.status = 400;
      throw err;
    }

    const customer = await CustomerService.getById(data.customerId);
    if (!customer) {
      const err = new Error('Invalid customer.');
      err.status = 400;
      throw err;
    }
    
    const settings = await SettingsService.getSettings();

    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();
      
      const invoiceNumber = await this.getNextInvoiceNumber();
      const isSubscription = customer.subscription === 'Yes';
      
      const [invResult] = await conn.query(`
        INSERT INTO invoices (
          invoice_number, invoice_date, purchase_date, due_date, customer_id, 
          customer_name, company_name, customer_address, phone, email, gst_number, 
          payment_mode, order_mode, status, notes, terms_conditions, 
          subscription_status, late_payment_notice, subtotal, total_discount, total_tax, grand_total,
          company_name_snapshot, company_logo_snapshot, company_address_snapshot, 
          company_phone_snapshot, company_email_snapshot, company_gst_snapshot
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        invoiceNumber, 
        data.invoiceData?.invoiceDate || data.date,
        data.invoiceData?.purchaseDate || data.date,
        data.invoiceData?.dueDate || data.date, 
        data.customerId,
        data.invoiceData?.customerName || customer.name,
        data.invoiceData?.companyName || customer.company,
        data.invoiceData?.address || customer.address,
        data.invoiceData?.phone || customer.phone,
        data.invoiceData?.email || customer.email,
        data.invoiceData?.gstNumber || customer.gstNumber,
        data.invoiceData?.paymentMode || 'N/A', 
        data.invoiceData?.orderMode || 'N/A',
        data.status || 'Pending',
        data.invoiceData?.note || '', 
        '', // terms
        customer.subscription,
        isSubscription,
        data.totals?.subtotal || data.amount || 0, 
        data.totals?.discount || 0,
        data.totals?.tax || 0, 
        data.totals?.grandTotal || data.amount || 0,
        settings.companyName || '',
        settings.logo || '',
        settings.address || '',
        settings.phone || '',
        settings.email || '',
        settings.gstNumber || ''
      ]);

      const newInvoiceId = invResult.insertId;

      if (data.items && Array.isArray(data.items)) {
        for (const item of data.items) {
          await conn.query(`
            INSERT INTO invoice_items (
              invoice_id, item_name, description, quantity, unit_price, 
              discount, tax_percentage, tax_amount, amount, line_total
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `, [
            newInvoiceId, 
            item.description, // using description as name if not provided
            item.description, 
            item.quantity, 
            item.unitPrice,
            item.discountAmt || item.discount || 0,
            item.taxPercentage || item.tax || 0, 
            item.taxAmt || 0,
            item.subtotalBeforeTax || (item.quantity * item.unitPrice),
            item.rowTotal
          ]);
        }
      }

      await conn.commit();
      return await this.getById(newInvoiceId);
    } catch (error) {
      await conn.rollback();
      throw error;
    } finally {
      conn.release();
    }
  },

  async update(id, data) {
    const [result] = await db.query('UPDATE invoices SET status = ? WHERE id = ? OR invoice_number = ?', [data.status, id, id]);
    if (result.affectedRows === 0) return null;
    return await this.getById(id);
  },

  async delete(id) {
    const [result] = await db.query('DELETE FROM invoices WHERE id = ? OR invoice_number = ?', [id, id]);
    return result.affectedRows > 0;
  }
};
