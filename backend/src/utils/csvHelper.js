/**
 * Safely escapes a single value for CSV formatting following RFC 4180.
 * If the value contains a comma, newline, carriage return, or double quote,
 * it is wrapped in double quotes, with internal quotes doubled.
 */
export const escapeCsvValue = (val) => {
  if (val === null || val === undefined) {
    return '';
  }
  const str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

/**
 * Builds a complete CSV document with given header columns and rows array.
 */
export const generateCsv = (headers, rows) => {
  const headerLine = headers.map(escapeCsvValue).join(',');
  if (!rows || rows.length === 0) {
    return headerLine + '\r\n';
  }
  const rowLines = rows.map((row) => row.map(escapeCsvValue).join(','));
  return [headerLine, ...rowLines].join('\r\n') + '\r\n';
};
