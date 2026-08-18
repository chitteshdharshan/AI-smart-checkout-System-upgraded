// utils/format.js
export const formatCurrency = (value) => {
  const number = Number(value);
  if (isNaN(number)) return '';
  return `₹${number.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};
