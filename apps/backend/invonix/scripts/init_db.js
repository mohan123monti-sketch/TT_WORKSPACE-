import { pool } from '../config/db.js';
import bcrypt from 'bcryptjs';

async function initDB() {
  try {
    const dbName = process.env.DB_NAME || 'invonixtt';

    console.log(`Checking if database '${dbName}' exists...`);
    await pool.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\``);
    console.log(`Database '${dbName}' is ready.`);

    await pool.query(`USE \`${dbName}\``);

    console.log('Creating tables...');

    // 1. users
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        phone VARCHAR(20),
        mobile_number VARCHAR(20),
        department VARCHAR(100) DEFAULT 'Administration',
        designation VARCHAR(100) DEFAULT 'Administrator',
        profile_image VARCHAR(255),
        role VARCHAR(50) DEFAULT 'Administrator',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    // 2. company_settings
    await pool.query(`
      CREATE TABLE IF NOT EXISTS company_settings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        company_name VARCHAR(150) NOT NULL,
        logo VARCHAR(255),
        address TEXT,
        phone VARCHAR(20),
        email VARCHAR(100),
        website VARCHAR(150),
        gst_number VARCHAR(50),
        pan_number VARCHAR(50),
        bank_name VARCHAR(150),
        account_number VARCHAR(50),
        ifsc_code VARCHAR(20),
        upi_id VARCHAR(100),
        terms_conditions TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    // 3. customers
    await pool.query(`
      CREATE TABLE IF NOT EXISTS customers (
        id INT AUTO_INCREMENT PRIMARY KEY,
        customer_code VARCHAR(50) UNIQUE,
        customer_name VARCHAR(100) NOT NULL,
        company_name VARCHAR(150),
        email VARCHAR(100) NOT NULL,
        phone VARCHAR(20) NOT NULL,
        alternative_phone VARCHAR(20),
        gst_number VARCHAR(50),
        classification VARCHAR(50),
        customer_type VARCHAR(50) NOT NULL,
        subscription ENUM('Yes', 'No') DEFAULT 'No',
        address_line TEXT,
        city VARCHAR(100),
        state VARCHAR(100),
        country VARCHAR(100),
        pincode VARCHAR(20),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_email (email),
        INDEX idx_phone (phone)
      )
    `);

    // 4. invoices
    await pool.query(`
      CREATE TABLE IF NOT EXISTS invoices (
        id INT AUTO_INCREMENT PRIMARY KEY,
        invoice_number VARCHAR(50) UNIQUE NOT NULL,
        invoice_date DATE,
        purchase_date DATE,
        due_date DATE,
        customer_id INT,
        customer_name VARCHAR(100),
        company_name VARCHAR(150),
        customer_address TEXT,
        phone VARCHAR(20),
        email VARCHAR(100),
        gst_number VARCHAR(50),
        payment_mode VARCHAR(100),
        order_mode VARCHAR(100),
        status ENUM('Draft', 'Pending', 'Paid', 'Completed', 'Cancelled') DEFAULT 'Draft',
        notes TEXT,
        terms_conditions TEXT,
        subscription_status VARCHAR(50),
        late_payment_notice BOOLEAN DEFAULT FALSE,
        subtotal DECIMAL(12,2),
        total_discount DECIMAL(12,2),
        total_tax DECIMAL(12,2),
        grand_total DECIMAL(12,2),
        company_name_snapshot VARCHAR(150),
        company_logo_snapshot VARCHAR(255),
        company_address_snapshot TEXT,
        company_phone_snapshot VARCHAR(20),
        company_email_snapshot VARCHAR(100),
        company_gst_snapshot VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL,
        INDEX idx_customer_id (customer_id),
        INDEX idx_invoice_number (invoice_number),
        INDEX idx_status (status),
        INDEX idx_invoice_date (invoice_date)
      )
    `);

    // 5. invoice_items
    await pool.query(`
      CREATE TABLE IF NOT EXISTS invoice_items (
        id INT AUTO_INCREMENT PRIMARY KEY,
        invoice_id INT,
        item_name VARCHAR(255),
        description TEXT,
        quantity INT DEFAULT 1,
        unit_price DECIMAL(10,2),
        discount DECIMAL(10,2),
        tax_percentage DECIMAL(5,2),
        tax_amount DECIMAL(10,2),
        amount DECIMAL(10,2),
        line_total DECIMAL(12,2),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE,
        INDEX idx_invoice_id (invoice_id)
      )
    `);

    console.log('Tables created successfully.');

    // Seed data
    console.log('Seeding initial data...');
    
    // Check if user exists
    const [users] = await pool.query('SELECT * FROM users WHERE email = ?', ['admin@invonixtt.com']);
    if (users.length === 0) {
      const hash = bcrypt.hashSync('admin123', 10);
      await pool.query(
        'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)', 
        ['John Smith', 'admin@invonixtt.com', hash, 'Administrator']
      );
      console.log('Created default admin user.');
    }

    // Check if company settings exist
    const [settings] = await pool.query('SELECT * FROM company_settings LIMIT 1');
    if (settings.length === 0) {
      await pool.query(
        `INSERT INTO company_settings (company_name, address, phone, email, website, gst_number) 
        VALUES (?, ?, ?, ?, ?, ?)`,
        [
          'Tech Turf', 
          '123 Business Avenue, Tech Park\\nCity, State 10001', 
          '+91 98765 43210', 
          'contact@techturf.com', 
          'www.techturf.com',
          '33BBBBB1111B2Z6'
        ]
      );
      console.log('Created default company settings.');
    }

    console.log('Database initialization completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Failed to initialize database:', error);
    process.exit(1);
  }
}

initDB();
