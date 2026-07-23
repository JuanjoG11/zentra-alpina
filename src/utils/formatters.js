// Formatters for numbers, currency (COP), and percentages

export const formatCurrency = (val) => {
  if (val === undefined || val === null || isNaN(val)) return '$ 0';
  // Standard Colombian format: $ 1.234.567
  const formatter = new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  });
  // Replace the default standard symbol representation with spacing if needed
  return formatter.format(val).replace('COP', '$').trim();
};

export const formatCurrencyWithDecimals = (val) => {
  if (val === undefined || val === null || isNaN(val)) return '$ 0,00';
  const formatter = new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
  return formatter.format(val).replace('COP', '$').trim();
};

export const formatShortCurrency = (val) => {
  if (val === undefined || val === null || isNaN(val)) return '$ 0';
  const isNegative = val < 0;
  const absVal = Math.abs(val);

  let formatted = '';
  if (absVal >= 1_000_000_000) {
    // Mostrar en miles de millones con 2 decimales: $ 1.109 Mill.
    const mill = absVal / 1_000_000;
    formatted = `$ ${mill.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} Mill.`;
  } else if (absVal >= 1_000_000) {
    const mill = absVal / 1_000_000;
    formatted = `$ ${mill.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} Mill.`;
  } else if (absVal >= 1_000) {
    const miles = absVal / 1_000;
    formatted = `$ ${miles.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} K`;
  } else {
    formatted = `$ ${Math.round(absVal).toLocaleString('es-CO')}`;
  }

  return isNegative ? `-${formatted}` : formatted;
};

  export const formatPercent = (val) => {
    if (val === undefined || val === null || isNaN(val)) return '0,00%';
    // Percent formatting in Colombia uses commas for decimals (e.g. 97,30%)
    const percentage = val * 100;
    return `${percentage.toFixed(2).replace('.', ',')}%`;
  };


export const formatNumber = (val) => {
  if (val === undefined || val === null || isNaN(val)) return '0';
  const formatter = new Intl.NumberFormat('es-CO', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  });
  return formatter.format(val);
};

export const formatKg = (val) => {
  if (val === null || val === undefined || isNaN(val)) return '—';
  const kg = val >= 1000 ? val / 1000 : val; // If value appears to be in grams, convert to kg
  return `${kg.toFixed(2)} kg`;
};

export const formatDate = (dateStr) => {
  if (!dateStr) return '';
  // dateStr is typically e.g. "4/1/2026"
  const parts = dateStr.split('/');
  if (parts.length === 3) {
    const day = parts[1];
    const monthIndex = parseInt(parts[0]) - 1;
    const year = parts[2];
    const months = [
      'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
      'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'
    ];
    return `${day} ${months[monthIndex]}`;
  }
  return dateStr;
};
