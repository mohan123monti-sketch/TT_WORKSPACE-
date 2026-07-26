function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function validateString(value, fieldName, options = {}) {
  const required = options.required !== false;
  const minLength = options.minLength ?? 1;
  const maxLength = options.maxLength ?? 10000;
  const str = String(value ?? '').trim();

  if (required && !str) return { valid: false, error: `${fieldName} is required` };
  if (str && str.length < minLength) return { valid: false, error: `${fieldName} must be at least ${minLength} characters` };
  if (str.length > maxLength) return { valid: false, error: `${fieldName} must be at most ${maxLength} characters` };
  return { valid: true, value: str };
}

function validateId(value, fieldName = 'ID') {
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1) return { valid: false, error: `${fieldName} must be a positive integer` };
  return { valid: true, value: n };
}

function validateEnum(value, fieldName, allowed) {
  const v = String(value ?? '');
  if (!allowed.includes(v)) return { valid: false, error: `${fieldName} must be one of: ${allowed.join(', ')}` };
  return { valid: true, value: v };
}

function isValidUrl(url) {
  try {
    const u = new URL(String(url));
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

function sanitizeFilename(filename) {
  return String(filename ?? '')
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .slice(0, 255);
}

module.exports = {
  escapeHtml,
  validateString,
  validateId,
  validateEnum,
  isValidUrl,
  sanitizeFilename
};
