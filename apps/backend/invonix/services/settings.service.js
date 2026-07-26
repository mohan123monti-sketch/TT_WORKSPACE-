import { db } from '../config/db.js';

export const SettingsService = {
  async getSettings() {
    const [rows] = await db.query('SELECT * FROM company_settings LIMIT 1');
    if (rows.length === 0) return {};
    const row = rows[0];
    return {
      companyName: row.company_name,
      logo: row.logo,
      address: row.address,
      phone: row.phone,
      email: row.email,
      website: row.website,
      gstNumber: row.gst_number,
      panNumber: row.pan_number,
      bankName: row.bank_name,
      accountNumber: row.account_number,
      ifscCode: row.ifsc_code,
      upiId: row.upi_id,
      termsConditions: row.terms_conditions
    };
  },

  async updateSettings(data) {
    const [existing] = await db.query('SELECT id FROM company_settings LIMIT 1');
    if (existing.length === 0) {
      await db.query(
        `INSERT INTO company_settings (company_name, logo, address, phone, email, website, gst_number, pan_number, bank_name, account_number, ifsc_code, upi_id, terms_conditions) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [data.companyName, data.logo, data.address, data.phone, data.email, data.website, data.gstNumber, data.panNumber, data.bankName, data.accountNumber, data.ifscCode, data.upiId, data.termsConditions]
      );
    } else {
      await db.query(
        `UPDATE company_settings SET 
          company_name = COALESCE(?, company_name),
          logo = COALESCE(?, logo),
          address = COALESCE(?, address),
          phone = COALESCE(?, phone),
          email = COALESCE(?, email),
          website = COALESCE(?, website),
          gst_number = COALESCE(?, gst_number),
          pan_number = COALESCE(?, pan_number),
          bank_name = COALESCE(?, bank_name),
          account_number = COALESCE(?, account_number),
          ifsc_code = COALESCE(?, ifsc_code),
          upi_id = COALESCE(?, upi_id),
          terms_conditions = COALESCE(?, terms_conditions)
        WHERE id = ?`,
        [data.companyName, data.logo, data.address, data.phone, data.email, data.website, data.gstNumber, data.panNumber, data.bankName, data.accountNumber, data.ifscCode, data.upiId, data.termsConditions, existing[0].id]
      );
    }
    const [rows] = await db.query('SELECT * FROM company_settings LIMIT 1');
    const row = rows[0];
    return {
      companyName: row.company_name,
      logo: row.logo,
      address: row.address,
      phone: row.phone,
      email: row.email,
      website: row.website,
      gstNumber: row.gst_number,
      panNumber: row.pan_number,
      bankName: row.bank_name,
      accountNumber: row.account_number,
      ifscCode: row.ifsc_code,
      upiId: row.upi_id,
      termsConditions: row.terms_conditions
    };
  }
};
