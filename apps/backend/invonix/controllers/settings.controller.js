import { SettingsService } from '../services/settings.service.js';
import { sendSuccess } from '../utils/responseFormatter.js';

export const getSettings = async (req, res) => {
  const settings = await SettingsService.getSettings();
  sendSuccess(res, 200, 'Company settings retrieved', settings);
};

export const updateSettings = async (req, res) => {
  const settings = await SettingsService.updateSettings(req.body);
  sendSuccess(res, 200, 'Company settings updated', settings);
};
