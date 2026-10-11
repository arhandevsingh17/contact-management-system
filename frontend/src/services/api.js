const API_BASE_URL =
  import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

export const getApiStatus = () => ({
  apiUrl: API_BASE_URL,
});

export async function apiRequest(endpoint, options = {}) {
  const token = localStorage.getItem('token');

  const headers = {
    ...(options.body ? { 'Content-Type': 'application/json' } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
      signal: controller.signal,
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(
        data.message || `Request failed with status ${response.status}`
      );
    }

    return data;
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error('Request timed out. Please try again.', { cause: error });
    }

    if (error instanceof TypeError) {
      throw new Error(
        'Unable to connect to the backend. Please check the server and try again.',
        { cause: error }
      );
    }

    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}