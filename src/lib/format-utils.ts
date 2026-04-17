
/**
 * Utility for formatting currency in Argentinian format (e.g. $ 1.234,56)
 */
export const formatCurrency = (amount: number, includeDecimals = true) => {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: includeDecimals ? 2 : 0,
    maximumFractionDigits: includeDecimals ? 2 : 0,
  }).format(amount);
};

/**
 * Utility for formatting numbers with thousands separator (e.g. 1.234)
 */
export const formatNumber = (amount: number, includeDecimals = false) => {
  return new Intl.NumberFormat('es-AR', {
    minimumFractionDigits: includeDecimals ? 2 : 0,
    maximumFractionDigits: includeDecimals ? 2 : 0,
  }).format(amount);
};
