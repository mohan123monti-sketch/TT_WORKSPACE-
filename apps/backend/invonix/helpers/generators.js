export const generateInvoiceNumber = (sequence) => {
  const year = new Date().getFullYear();
  return `INV-${year}-${String(sequence).padStart(4, '0')}`;
};
