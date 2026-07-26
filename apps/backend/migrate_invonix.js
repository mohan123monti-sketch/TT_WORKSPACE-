const Database = require('better-sqlite3');
const path = require('path');
require('dotenv').config();

const ttDbPath = path.join(__dirname, '../../TT_INOVNIX/backend/database.sqlite');
const projectDbPath = process.env.DB_PATH || path.join(__dirname, '../../shared/storage/techturf.db');

try {
  console.log(`Connecting to TT_INOVNIX database: ${ttDbPath}`);
  const ttDb = new Database(ttDbPath, { fileMustExist: true });

  console.log(`Connecting to Project database: ${projectDbPath}`);
  const prDb = new Database(projectDbPath);

  // Begin transaction
  prDb.exec('BEGIN TRANSACTION');
  console.log('--- Started Migration ---');

  // Migrate Company Settings
  const settings = ttDb.prepare('SELECT * FROM company_settings').all();
  console.log(`Migrating ${settings.length} company settings...`);
  const insertSetting = prDb.prepare(`
    INSERT INTO company_settings (
      company_name, logo, address, phone, email, website, gst_number, pan_number, 
      bank_name, account_number, ifsc_code, upi_id, terms_conditions, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  for (const s of settings) {
    insertSetting.run(
      s.company_name, s.logo, s.address, s.phone, s.email, s.website, s.gst_number, s.pan_number,
      s.bank_name, s.account_number, s.ifsc_code, s.upi_id, s.terms_conditions, s.created_at, s.updated_at
    );
  }

  // Migrate Customers -> Clients
  const customers = ttDb.prepare('SELECT * FROM customers').all();
  console.log(`Migrating ${customers.length} customers to clients...`);
  const insertClient = prDb.prepare(`
    INSERT INTO clients (
      name, company, phone, phone_alt, email, location, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  // We need to keep track of the mapping from old customer_id to new client_id
  const clientIdMap = {}; // old_id -> new_id
  
  for (const c of customers) {
    // Build location string
    const locationParts = [c.address_line, c.city, c.state, c.country, c.pincode].filter(Boolean);
    const locationStr = locationParts.join(', ');

    const info = insertClient.run(
      c.customer_name, c.company_name, c.phone, c.alternative_phone, c.email, locationStr, c.created_at
    );
    clientIdMap[c.id] = info.lastInsertRowid;
  }

  // Migrate Invoices
  const invoices = ttDb.prepare('SELECT * FROM invoices').all();
  console.log(`Migrating ${invoices.length} invoices...`);
  const insertInvoice = prDb.prepare(`
    INSERT INTO invoices (
      invoice_number, invoice_date, purchase_date, due_date, client_id, customer_name, company_name, 
      customer_address, phone, email, gst_number, payment_mode, order_mode, status, notes, 
      terms_conditions, subscription_status, late_payment_notice, subtotal, total_discount, 
      total_tax, grand_total, company_name_snapshot, company_logo_snapshot, company_address_snapshot, 
      company_phone_snapshot, company_email_snapshot, company_gst_snapshot, created_at, updated_at
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
    )
  `);

  const invoiceIdMap = {}; // old_invoice_id -> new_invoice_id

  for (const inv of invoices) {
    const newClientId = inv.customer_id ? clientIdMap[inv.customer_id] : null;

    const info = insertInvoice.run(
      inv.invoice_number, inv.invoice_date, inv.purchase_date, inv.due_date, newClientId, 
      inv.customer_name, inv.company_name, inv.customer_address, inv.phone, inv.email, inv.gst_number, 
      inv.payment_mode, inv.order_mode, inv.status, inv.notes, inv.terms_conditions, inv.subscription_status, 
      inv.late_payment_notice, inv.subtotal, inv.total_discount, inv.total_tax, inv.grand_total, 
      inv.company_name_snapshot, inv.company_logo_snapshot, inv.company_address_snapshot, 
      inv.company_phone_snapshot, inv.company_email_snapshot, inv.company_gst_snapshot, 
      inv.created_at, inv.updated_at
    );
    invoiceIdMap[inv.id] = info.lastInsertRowid;
  }

  // Migrate Invoice Items
  const invoiceItems = ttDb.prepare('SELECT * FROM invoice_items').all();
  console.log(`Migrating ${invoiceItems.length} invoice items...`);
  const insertItem = prDb.prepare(`
    INSERT INTO invoice_items (
      invoice_id, item_name, description, quantity, unit_price, discount, tax_percentage, 
      tax_amount, amount, line_total, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const item of invoiceItems) {
    const newInvoiceId = invoiceIdMap[item.invoice_id];
    if (newInvoiceId) {
      insertItem.run(
        newInvoiceId, item.item_name, item.description, item.quantity, item.unit_price, 
        item.discount, item.tax_percentage, item.tax_amount, item.amount, item.line_total, 
        item.created_at, item.updated_at
      );
    }
  }

  // Commit transaction
  prDb.exec('COMMIT');
  console.log('--- Migration Completed Successfully ---');

  ttDb.close();
  prDb.close();

} catch (err) {
  console.error("Migration failed:", err);
  // Attempting rollback isn't strictly necessary if it crashed the process, but good practice if caught
}
