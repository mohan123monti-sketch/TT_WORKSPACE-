import dotenv from 'dotenv';
import mysql from 'mysql2/promise';

dotenv.config({ path: '../.env' });

async function migrateReports() {
  let connection;
  try {
    console.log('Connecting to database...');
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'invoice_generator_v2',
      port: process.env.DB_PORT || 3306
    });

    console.log('Creating reports table...');
    
    // Create the table
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS reports (
          id VARCHAR(50) PRIMARY KEY,
          report_number VARCHAR(50) NOT NULL,
          report_type VARCHAR(100) NOT NULL,
          customer_id INT DEFAULT NULL,
          customer_name VARCHAR(255) NOT NULL,
          start_date DATE DEFAULT NULL,
          end_date DATE DEFAULT NULL,
          generated_by VARCHAR(255) NOT NULL,
          generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          total_records INT NOT NULL DEFAULT 0,
          total_amount DECIMAL(15,2) NOT NULL DEFAULT 0.00,
          file_path VARCHAR(255) DEFAULT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL
      );
    `;

    await connection.query(createTableQuery);
    
    console.log('Migration successful! `reports` table is ready.');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    if (connection) {
      await connection.end();
      console.log('Database connection closed.');
    }
  }
}

migrateReports();
