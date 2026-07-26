import { ReportService } from '../services/report.service.js';
import { sendSuccess } from '../utils/responseFormatter.js';

export const getDashboardStats = async (req, res) => {
  const data = await ReportService.getDashboardStats();
  sendSuccess(res, 200, 'Dashboard stats retrieved', data);
};

export const getRevenueAnalytics = async (req, res) => {
  try {
    const period = req.query.period || req.query.filter || 'Weekly Revenue';
    const data = await ReportService.getRevenueAnalytics(period);
    sendSuccess(res, 200, 'Revenue analytics retrieved successfully', data);
  } catch (error) {
    console.error('Error in getRevenueAnalytics:', error);
    sendSuccess(res, 500, 'Failed to fetch revenue analytics');
  }
};

