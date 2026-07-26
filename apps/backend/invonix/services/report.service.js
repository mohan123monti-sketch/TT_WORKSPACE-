import { InvoiceService } from './invoice.service.js';
import { CustomerService } from './customer.service.js';
import { db } from '../config/db.js';

export const ReportService = {
  async getRevenueAnalytics(period = 'Weekly Revenue') {
    const cleanPeriod = (period || '').toLowerCase();
    
    if (cleanPeriod.includes('weekly') || cleanPeriod === 'weekly') {
      const [rows] = await db.query(`
        SELECT 
          WEEKDAY(invoice_date) as day_index,
          SUM(grand_total) as total_revenue
        FROM invoices
        WHERE status IN ('Completed', 'Paid')
          AND YEARWEEK(invoice_date, 1) = YEARWEEK(CURDATE(), 1)
        GROUP BY day_index
      `);

      const daysMap = [
        { index: 0, name: 'Mon' },
        { index: 1, name: 'Tue' },
        { index: 2, name: 'Wed' },
        { index: 3, name: 'Thu' },
        { index: 4, name: 'Fri' },
        { index: 5, name: 'Sat' },
        { index: 6, name: 'Sun' }
      ];

      const revenueMap = {};
      rows.forEach(r => {
        revenueMap[r.day_index] = Number(r.total_revenue || 0);
      });

      return daysMap.map(d => ({
        name: d.name,
        revenue: revenueMap[d.index] || 0
      }));
    } else if (cleanPeriod.includes('monthly') || cleanPeriod === 'monthly') {
      const [rows] = await db.query(`
        SELECT 
          MONTH(invoice_date) as month_num,
          SUM(grand_total) as total_revenue
        FROM invoices
        WHERE status IN ('Completed', 'Paid')
          AND YEAR(invoice_date) = YEAR(CURDATE())
        GROUP BY month_num
      `);

      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const revenueMap = {};
      rows.forEach(r => {
        revenueMap[r.month_num] = Number(r.total_revenue || 0);
      });

      return months.map((m, idx) => ({
        name: m,
        revenue: revenueMap[idx + 1] || 0
      }));
    } else if (cleanPeriod.includes('yearly') || cleanPeriod === 'yearly') {
      const [rows] = await db.query(`
        SELECT 
          YEAR(invoice_date) as year_val,
          SUM(grand_total) as total_revenue
        FROM invoices
        WHERE status IN ('Completed', 'Paid')
          AND invoice_date IS NOT NULL
        GROUP BY year_val
        ORDER BY year_val ASC
      `);

      const currentYear = new Date().getFullYear();
      let startYear = 2024;
      if (rows.length > 0) {
        const minYear = Math.min(...rows.map(r => r.year_val));
        if (minYear < startYear && minYear > 1900) startYear = minYear;
      }
      
      const years = [];
      for (let y = startYear; y <= currentYear; y++) {
        years.push(y);
      }

      const revenueMap = {};
      rows.forEach(r => {
        revenueMap[r.year_val] = Number(r.total_revenue || 0);
      });

      return years.map(y => ({
        name: String(y),
        revenue: revenueMap[y] || 0
      }));
    }

    return [];
  },

  async getSummaryReport(query = {}) {
    // Pass query directly to InvoiceService which handles MySQL filtering (customerId, startDate, endDate)
    const filteredInvoices = await InvoiceService.getAll(query);
    const customers = await CustomerService.getAll();

    const totalInvoices = filteredInvoices.length;
    const totalRevenue = filteredInvoices.reduce((sum, inv) => sum + (inv.grandTotal || inv.amount || 0), 0);
    
    // Revenue Report Metrics
    const avgInvoiceValue = totalInvoices > 0 ? (totalRevenue / totalInvoices) : 0;
    const highestInvoiceAmount = totalInvoices > 0 
      ? Math.max(...filteredInvoices.map(inv => inv.grandTotal || inv.amount || 0)) 
      : 0;

    // Invoice Report Metrics
    const paidInvoices = filteredInvoices.filter(i => ['Paid', 'Completed'].includes(i.status)).length;
    const pendingInvoices = filteredInvoices.filter(i => ['Pending', 'Draft'].includes(i.status)).length;
    const cancelledInvoices = filteredInvoices.filter(i => ['Cancelled', 'Overdue'].includes(i.status)).length;

    return {
      totalRevenue,
      totalInvoices,
      avgInvoiceValue,
      highestInvoiceAmount,
      paidInvoices,
      pendingInvoices,
      cancelledInvoices,
      totalCustomers: customers.length,
      invoices: filteredInvoices
    };
  },

  async getDashboardStats() {
    const summary = await this.getSummaryReport({});
    const invoices = await InvoiceService.getAll();
    
    // Recent invoices (top 5)
    const recentInvoices = invoices.slice(0, 5);

    return {
      ...summary,
      recentInvoices
    };
  }
};
