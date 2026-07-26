import { db } from '../config/db.js';

async function update() {
  try {
    // Ignore error if column exists
    try {
      await db.query('ALTER TABLE customers ADD COLUMN customer_code VARCHAR(50)');
      console.log('Added customer_code column.');
    } catch (e) {
      if (e.code !== 'ER_DUP_FIELDNAME') throw e;
    }

    await db.query("UPDATE customers SET customer_code = CONCAT('CUST-', LPAD(id, 3, '0'))");
    console.log('Updated existing customers with generated codes.');

    try {
      await db.query('ALTER TABLE customers ADD UNIQUE (customer_code)');
      console.log('Added UNIQUE constraint to customer_code.');
    } catch (e) {
      if (e.code !== 'ER_DUP_KEYNAME') throw e;
    }

    console.log('DB Updated Successfully');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

update();
