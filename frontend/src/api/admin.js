import { getToken } from './auth';

const getAuthHeaders = () => {
  const token = getToken();
  return {
    'Content-Type': 'application/json',
    'Authorization': token ? `Bearer ${token}` : '',
  };
};

export const fetchAdminStats = async () => {
  const response = await fetch('/api/admin/dashboard/stats', {
    headers: getAuthHeaders(),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Failed to fetch admin stats');
  }
  return data.data;
};

export const fetchContractors = async () => {
  const response = await fetch('/api/admin/contractors', {
    headers: getAuthHeaders(),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Failed to fetch contractors list');
  }
  return data.contractors || [];
};

export const fetchContractorDetails = async (id) => {
  const response = await fetch(`/api/admin/contractors/${id}`, {
    headers: getAuthHeaders(),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Failed to fetch contractor details');
  }
  return data.contractor;
};

export const fetchWorkerDetails = async (id) => {
  const response = await fetch(`/api/admin/workers/${id}`, {
    headers: getAuthHeaders(),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Failed to fetch worker audit details');
  }
  return data.worker;
};

export const fetchSiteDetails = async (id) => {
  const response = await fetch(`/api/admin/sites/${id}`, {
    headers: getAuthHeaders(),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Failed to fetch site details');
  }
  return data.site;
};
