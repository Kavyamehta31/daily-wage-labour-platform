import { getToken } from './auth';

const getAuthHeaders = () => {
  const token = getToken();
  return {
    'Content-Type': 'application/json',
    'Authorization': token ? `Bearer ${token}` : '',
  };
};

export const fetchPayments = async () => {
  const response = await fetch('/api/payments', {
    headers: getAuthHeaders(),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Failed to fetch payments history.');
  }
  return data.payments || [];
};

export const fetchWorkerPayments = async (workerId) => {
  const response = await fetch(`/api/payments/worker/${workerId}`, {
    headers: getAuthHeaders(),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Failed to fetch worker payments.');
  }
  return data.payments || [];
};

export const fetchPaymentById = async (paymentId) => {
  const response = await fetch(`/api/payments/${paymentId}`, {
    headers: getAuthHeaders(),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Failed to fetch payment details.');
  }
  return data.payment || null;
};

export const recordPayment = async (paymentData) => {
  const response = await fetch('/api/payments', {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(paymentData),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Failed to record payment.');
  }
  return data.payment;
};

export const updatePayment = async (paymentId, paymentData) => {
  const response = await fetch(`/api/payments/${paymentId}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(paymentData),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Failed to update payment.');
  }
  return data.payment;
};

export const deletePayment = async (paymentId) => {
  const response = await fetch(`/api/payments/${paymentId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Failed to delete payment.');
  }
  return data;
};
