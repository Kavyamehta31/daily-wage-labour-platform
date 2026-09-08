import { getToken } from './auth';

const getAuthHeaders = () => {
  const token = getToken();
  return {
    'Content-Type': 'application/json',
    'Authorization': token ? `Bearer ${token}` : '',
  };
};

export const fetchWorkers = async (params = {}) => {
  const query = new URLSearchParams(params).toString();
  const url = query ? `/api/workers?${query}` : '/api/workers';
  const response = await fetch(url, {
    headers: getAuthHeaders(),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Failed to fetch workers');
  }
  return data.workers || [];
};

export const fetchWorkerById = async (id) => {
  const response = await fetch(`/api/workers/${id}`, {
    headers: getAuthHeaders(),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Failed to fetch worker profile');
  }
  return data.worker;
};

export const createWorker = async (workerData) => {
  const response = await fetch('/api/workers', {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(workerData),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Failed to create worker');
  }
  return data.worker;
};

export const updateWorker = async (id, workerData) => {
  const response = await fetch(`/api/workers/${id}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(workerData),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Failed to update worker');
  }
  return data.worker;
};

export const deleteWorker = async (id) => {
  const response = await fetch(`/api/workers/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Failed to delete worker');
  }
  return data;
};

export const assignWorkerToSite = async (workerId, siteId) => {
  const response = await fetch(`/api/workers/${workerId}/assignments`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ site_id: siteId }),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Failed to assign worker to site');
  }
  return data.assignment;
};

export const fetchWorkerAssignedSites = async (workerId) => {
  const response = await fetch(`/api/workers/${workerId}/sites`, {
    headers: getAuthHeaders(),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Failed to fetch worker assigned sites');
  }
  return data.sites || [];
};
