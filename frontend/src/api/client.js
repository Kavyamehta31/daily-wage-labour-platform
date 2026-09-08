export const checkHealth = async () => {
  try {
    const response = await fetch('/api/health');
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    return {
      status: 'ERROR',
      message: error.message,
      services: {
        api: 'OFFLINE',
        database: 'UNKNOWN',
      },
    };
  }
};
