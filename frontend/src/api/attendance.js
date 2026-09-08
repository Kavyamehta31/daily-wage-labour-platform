import { getToken } from './auth';

const getAuthHeaders = () => {
  const token = getToken();
  return {
    'Content-Type': 'application/json',
    'Authorization': token ? `Bearer ${token}` : '',
  };
};

export const saveAttendance = async (attendanceData) => {
  const response = await fetch('/api/attendance', {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(attendanceData),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Failed to save attendance');
  }
  return data;
};

export const fetchAttendanceRecords = async (params = {}) => {
  const query = new URLSearchParams(params).toString();
  const url = query ? `/api/attendance?${query}` : '/api/attendance';
  const response = await fetch(url, {
    headers: getAuthHeaders(),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Failed to fetch attendance history');
  }
  return data.attendance || [];
};
