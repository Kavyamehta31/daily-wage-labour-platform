import { getToken } from './auth';

const getAuthHeaders = () => {
  const token = getToken();
  return {
    'Content-Type': 'application/json',
    'Authorization': token ? `Bearer ${token}` : '',
  };
};

export const fetchSites = async () => {
  const response = await fetch('/api/sites', {
    headers: getAuthHeaders(),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Failed to fetch sites');
  }
  return data.sites || [];
};

export const createSite = async (siteData) => {
  const response = await fetch('/api/sites', {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(siteData),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Failed to create site');
  }
  return data.site;
};

export const updateSite = async (id, siteData) => {
  const response = await fetch(`/api/sites/${id}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(siteData),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Failed to update site');
  }
  return data.site;
};

export const deleteSite = async (id) => {
  const response = await fetch(`/api/sites/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Failed to delete site');
  }
  return data;
};
