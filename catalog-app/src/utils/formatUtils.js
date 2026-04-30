/**
 * Formats a number as a price with thousands separators and 2 decimal places.
 * @param {number|string} price 
 * @returns {string} Formatted price
 */
export const formatPrice = (price) => {
  if (price === undefined || price === null || isNaN(price)) return '0.00';
  
  return new Intl.NumberFormat('he-IL', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(parseFloat(price));
};

/**
 * Formats a number with thousands separators.
 * @param {number|string} num 
 * @returns {string} Formatted number
 */
export const formatNumber = (num) => {
  if (num === undefined || num === null || isNaN(num)) return '0';
  return new Intl.NumberFormat('he-IL').format(parseFloat(num));
};
