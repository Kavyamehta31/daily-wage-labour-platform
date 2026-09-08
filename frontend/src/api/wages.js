import { getToken } from './auth';

const getAuthHeaders = () => {
  const token = getToken();
  return {
    'Content-Type': 'application/json',
    'Authorization': token ? `Bearer ${token}` : '',
  };
};

export const fetchWagesSummary = async (params = {}) => {
  const query = new URLSearchParams(params).toString();
  const url = query ? `/api/wages/summary?${query}` : '/api/wages/summary';
  const response = await fetch(url, {
    headers: getAuthHeaders(),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Failed to fetch wages summary');
  }
  return data.summaries || [];
};

export const fetchWorkerWageDetail = async (workerId, params = {}) => {
  const query = new URLSearchParams(params).toString();
  const url = query ? `/api/wages/worker/${workerId}?${query}` : `/api/wages/worker/${workerId}`;
  const response = await fetch(url, {
    headers: getAuthHeaders(),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Failed to fetch worker wage detail');
  }
  return data.summary || null;
};
