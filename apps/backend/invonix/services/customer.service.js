import { db } from '../config/db.js';

const mapToCamelCase = (row) => ({
  id: row.id,
  customerCode: row.customer_code,
  name: row.customer_name,
  company: row.company_name,
  email: row.email,
  phone: row.phone,
  alternativePhone: row.alternative_phone,
  gstNumber: row.gst_number,
  classification: row.classification,
  customerType: row.customer_type,
  subscription: row.subscription,
  address: row.address_line,
  city: row.city,
  state: row.state,
  country: row.country,
  pincode: row.pincode,
  createdAt: row.created_at,
  updatedAt: row.updated_at
});

export const CustomerService = {
  async getAll(query) {
    let sql = 'SELECT * FROM customers';
    const params = [];
    
    if (query?.search) {
      sql += ' WHERE LOWER(customer_name) LIKE ? OR LOWER(email) LIKE ?';
      const searchParam = `%${query.search.toLowerCase()}%`;
      params.push(searchParam, searchParam);
    }
    
    sql += ' ORDER BY created_at DESC';
    const [rows] = await db.query(sql, params);
    return rows.map(mapToCamelCase);
  },

  async getById(id) {
    const [rows] = await db.query('SELECT * FROM customers WHERE id = ? OR customer_code = ?', [id, id]);
    return rows.length > 0 ? mapToCamelCase(rows[0]) : null;
  },

  async getNextCustomerCode() {
    const [rows] = await db.query('SELECT customer_code FROM customers ORDER BY id DESC LIMIT 1');
    if (rows.length === 0 || !rows[0].customer_code) return 'CUST-001';
    
    const lastCode = rows[0].customer_code;
    const numberPart = parseInt(lastCode.replace('CUST-', ''), 10);
    
    if (isNaN(numberPart)) return 'CUST-001';
    
    return `CUST-${String(numberPart + 1).padStart(3, '0')}`;
  },

  async create(data) {
    const { 
      name, company, email, phone, alternativePhone, gstNumber, 
      classification, customerType, subscription, address, city, 
      state, country, pincode 
    } = data;
    
    const customerCode = await this.getNextCustomerCode();
    
    const [result] = await db.query(
      `INSERT INTO customers (
        customer_code, customer_name, company_name, email, phone, alternative_phone, 
        gst_number, classification, customer_type, subscription, 
        address_line, city, state, country, pincode
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        customerCode, name, company || null, email, phone || '', alternativePhone || null,
        gstNumber || null, classification || null, customerType || 'Regular', 
        subscription || 'No', address || null, city || null, state || null, 
        country || null, pincode || null
      ]
    );
    const [rows] = await db.query('SELECT * FROM customers WHERE id = ?', [result.insertId]);
    return mapToCamelCase(rows[0]);
  },

  async update(id, data) {
    const { 
      name, company, email, phone, alternativePhone, gstNumber, 
      classification, customerType, subscription, address, city, 
      state, country, pincode 
    } = data;
    
    const [result] = await db.query(
      `UPDATE customers SET 
        customer_name = COALESCE(?, customer_name), 
        company_name = COALESCE(?, company_name), 
        email = COALESCE(?, email), 
        phone = COALESCE(?, phone), 
        alternative_phone = COALESCE(?, alternative_phone), 
        gst_number = COALESCE(?, gst_number), 
        classification = COALESCE(?, classification), 
        customer_type = COALESCE(?, customer_type), 
        subscription = COALESCE(?, subscription), 
        address_line = COALESCE(?, address_line), 
        city = COALESCE(?, city), 
        state = COALESCE(?, state), 
        country = COALESCE(?, country), 
        pincode = COALESCE(?, pincode)
      WHERE id = ?`,
      [
        name, company, email, phone, alternativePhone,
        gstNumber, classification, customerType, subscription, 
        address, city, state, country, pincode, id
      ]
    );
    
    if (result.affectedRows === 0) return null;
    const [rows] = await db.query('SELECT * FROM customers WHERE id = ?', [id]);
    return mapToCamelCase(rows[0]);
  },

  async delete(id) {
    const [result] = await db.query('DELETE FROM customers WHERE id = ?', [id]);
    return result.affectedRows > 0;
  }
};
