/**
 * Standard API Response Formatter
 */
export const sendSuccess = (res, statusCode, message, data = {}) => {
  res.writeHead(statusCode, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({
    success: true,
    message,
    data
  }));
};

export const sendError = (res, statusCode, message, error = {}) => {
  res.writeHead(statusCode, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({
    success: false,
    message,
    error
  }));
};
