import { ReportService } from '../services/report.service.js';
import { sendSuccess } from '../utils/responseFormatter.js';
import { db } from '../config/db.js';

export const getSummary = async (req, res) => {
  const data = await ReportService.getSummaryReport(req.query);
  sendSuccess(res, 200, 'Summary report retrieved', data);
};

// Get all reports history
export const getReportsHistory = async (req, res) => {
  const [rows] = await db.query('SELECT * FROM reports ORDER BY created_at DESC');
  sendSuccess(res, 200, 'Reports history retrieved', rows);
};

// Save a new report
export const saveReport = async (req, res) => {
  const { 
    id, report_number, report_type, customer_id, customer_name, 
    start_date, end_date, generated_by, total_records, total_amount 
  } = req.body;

  if (!id || !report_number || !report_type || !customer_name || !generated_by) {
    return res.status(400).json({ success: false, message: 'Missing required fields' });
  }

  const query = `
    INSERT INTO reports (
      id, report_number, report_type, customer_id, customer_name, 
      start_date, end_date, generated_by, total_records, total_amount
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const values = [
    id,
    report_number,
    report_type,
    customer_id || null,
    customer_name,
    start_date || null,
    end_date || null,
    generated_by,
    total_records || 0,
    total_amount || 0.00
  ];

  await db.query(query, values);
  
  const [newReport] = await db.query('SELECT * FROM reports WHERE id = ?', [id]);
  sendSuccess(res, 201, 'Report saved successfully', newReport[0]);
};

// Delete a report
export const deleteReport = async (req, res) => {
  const { id } = req.params;
  const [result] = await db.query('DELETE FROM reports WHERE id = ?', [id]);
  
  if (result.affectedRows === 0) {
    return res.status(404).json({ success: false, message: 'Report not found' });
  }
  
  sendSuccess(res, 200, 'Report deleted successfully');
};
