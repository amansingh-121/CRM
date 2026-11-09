/**
 * Currency formatting utility for Aureva marketplace
 * Formats values into Indian Rupees (₹) with standard Indian numbering grouping.
 */
export function formatPrice(amount: number | string | undefined | null): string {
  if (amount === undefined || amount === null || isNaN(Number(amount))) {
    return '₹0';
  }
  const numeric = typeof amount === 'string' ? parseFloat(amount) : amount;
  return `₹${Math.round(numeric).toLocaleString('en-IN')}`;
}

export function formatPriceWithDecimals(amount: number | string | undefined | null): string {
  if (amount === undefined || amount === null || isNaN(Number(amount))) {
    return '₹0.00';
  }
  const numeric = typeof amount === 'string' ? parseFloat(amount) : amount;
  return `₹${numeric.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
