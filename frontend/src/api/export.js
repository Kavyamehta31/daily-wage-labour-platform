import { getToken } from './auth';

const getAuthHeaders = () => {
  const token = getToken();
  return {
    'Authorization': token ? `Bearer ${token}` : '',
  };
};

/**
 * Downloads a CSV string as a file in the browser.
 */
export const triggerCsvDownload = (csvText, filename) => {
  const blob = new Blob([csvText], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * Fetch Attendance Muster Roll CSV
 */
export const exportAttendanceCsv = async (params = {}) => {
  const query = new URLSearchParams(params).toString();
  const url = query ? `/api/export/attendance?${query}` : '/api/export/attendance';
  const response = await fetch(url, {
    headers: getAuthHeaders(),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || 'Failed to export attendance CSV');
  }
  return await response.text();
};

/**
 * Fetch Wages Report CSV
 */
export const exportWagesCsv = async (params = {}) => {
  const query = new URLSearchParams(params).toString();
  const url = query ? `/api/export/wages?${query}` : '/api/export/wages';
  const response = await fetch(url, {
    headers: getAuthHeaders(),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || 'Failed to export wages CSV');
  }
  return await response.text();
};

/**
 * Fetch Payment Report CSV
 */
export const exportPaymentsCsv = async (params = {}) => {
  const query = new URLSearchParams(params).toString();
  const url = query ? `/api/export/payments?${query}` : '/api/export/payments';
  const response = await fetch(url, {
    headers: getAuthHeaders(),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || 'Failed to export payments CSV');
  }
  return await response.text();
};
