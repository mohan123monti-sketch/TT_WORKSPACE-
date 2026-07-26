export const calculateItemTotal = (quantity, unitPrice, discountAmount, taxPercentage) => {
  const amount = (quantity * unitPrice) - discountAmount;
  const taxAmount = amount * (taxPercentage / 100);
  return amount + taxAmount;
};

export const calculateInvoiceTotals = (items) => {
  let subtotal = 0;
  let totalDiscount = 0;
  let totalTax = 0;

  items.forEach(item => {
    const rawTotal = item.quantity * item.unitPrice;
    subtotal += rawTotal;
    totalDiscount += item.discount;
    
    const taxableAmount = rawTotal - item.discount;
    totalTax += taxableAmount * (item.taxPercentage / 100);
  });

  return {
    subtotal,
    discount: totalDiscount,
    tax: totalTax,
    grandTotal: subtotal - totalDiscount + totalTax
  };
};
