import { pool } from '../config/db.js';
import dotenv from 'dotenv';
dotenv.config();

const dbName = process.env.DB_NAME || 'invonix';

export const initDb = async () => {
  try {
    // 1. Create database if it doesn't exist
    await pool.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\``);
    console.log(`Database '${dbName}' ensured.`);

    // 2. Switch to the database
    await pool.query(`USE \`${dbName}\``);

    // 3. Create customers table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS customers (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        company VARCHAR(255) DEFAULT '',
        email VARCHAR(255) DEFAULT '',
        phone VARCHAR(50) DEFAULT '',
        address TEXT,
        gstNumber VARCHAR(50) DEFAULT '',
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('Customers table ensured.');

    // 4. Create invoices table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS invoices (
        id INT AUTO_INCREMENT PRIMARY KEY,
        invoice_number VARCHAR(100) NOT NULL,
        customer_id INT NOT NULL,
        status VARCHAR(50) DEFAULT 'Pending',
        invoice_date DATE,
        due_date DATE,
        purchase_date DATE,
        order_mode VARCHAR(100) DEFAULT '',
        payment_mode VARCHAR(100) DEFAULT '',
        notes TEXT,
        subtotal DECIMAL(10, 2) DEFAULT 0.00,
        discount DECIMAL(10, 2) DEFAULT 0.00,
        tax DECIMAL(10, 2) DEFAULT 0.00,
        grand_total DECIMAL(10, 2) DEFAULT 0.00,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE RESTRICT
      )
    `);
    console.log('Invoices table ensured.');

    // 5. Create invoice_items table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS invoice_items (
        id INT AUTO_INCREMENT PRIMARY KEY,
        invoice_id INT NOT NULL,
        description TEXT NOT NULL,
        quantity INT DEFAULT 1,
        unit_price DECIMAL(10, 2) DEFAULT 0.00,
        tax_percentage DECIMAL(5, 2) DEFAULT 0.00,
        row_total DECIMAL(10, 2) DEFAULT 0.00,
        FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
      )
    `);
    console.log('Invoice items table ensured.');

  } catch (error) {
    console.error('Database initialization failed:', error);
    process.exit(1);
  }
};
