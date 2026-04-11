/**
 * Formats the carton count based on quantity and default quantity.
 * Rounds to the nearest 0.25, with the specific rule that 0.125 rounds DOWN.
 * Example: 1.125 cartons becomes 1 carton.
 * 
 * @param {number} quantity 
 * @param {number} defaultQuantity 
 * @returns {string|number} Formatted carton count
 */
export const formatCartonCount = (quantity, defaultQuantity) => {
  if (!defaultQuantity || defaultQuantity === 0) return 0;
  
  const raw = quantity / defaultQuantity;
  
  // Rule: Round to nearest 0.25. 
  // To make 1.125 round down to 1.0 (instead of up to 1.25), 
  // we subtract a tiny epsilon before rounding.
  const rounded = Math.round((raw * 4) - 0.00001) / 4;
  
  // Return integer if it's a whole number, otherwise up to 2 decimal places (strip trailing zeros)
  return Number.isInteger(rounded) ? rounded : parseFloat(rounded.toFixed(2));
};
