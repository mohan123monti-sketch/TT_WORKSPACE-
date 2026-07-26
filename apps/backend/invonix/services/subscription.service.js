import { db } from '../config/db.js';

export const SubscriptionService = {
  async getAll() {
    const [rows] = await db.query('SELECT * FROM customers WHERE subscription = ?', ['Yes']);
    return rows.map(r => ({
      id: r.id,
      customerId: r.id,
      customerName: r.customer_name,
      companyName: r.company_name,
      status: 'Active',
      createdAt: r.created_at
    }));
  }
};
