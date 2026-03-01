import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

// --- CENTRAL CONFIGURATION ---
// This instance acts as the primary API hub for the system
const api = axios.create({
  baseURL: 'http://localhost:8000/api',
  headers: { 'Content-Type': 'application/json' }
});

// --- STANDARDIZED ERROR INTERFACE ---
export interface IApiError {
  message: string;
  status?: number;
}

/**
 * ============================================================================
 * 1. THE API QUERY HOOK (GET)
 * Used for standard data fetching.
 * ============================================================================
 */
export const useApiQuery = <T>(endpoint: string, dependencies: any[] = []) => {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<IApiError | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.get<T>(endpoint);
      setData(response.data);
    } catch (err: any) {
      const errorData: IApiError = {
        message: err.response?.data?.error || err.message,
        status: err.response?.status
      };
      setError(errorData);
      console.error(`[API 🚨] GET Failed at ${endpoint}:`, errorData);
    } finally {
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endpoint, ...dependencies]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, isLoading, error, refetch: fetchData };
};

/**
 * ============================================================================
 * 2. THE API MUTATION HOOK (POST/PUT/DELETE)
 * Used for modifying database records.
 * ============================================================================
 */
export const useApiMutation = <TResponse, TBody>(
  method: 'POST' | 'PUT' | 'DELETE',
  endpoint: string,
  onSuccess?: (data: TResponse) => void
) => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<IApiError | null>(null);

  const mutate = async (variables: TBody) => {
    setIsLoading(true);
    setError(null);
    try {
      let response;
      switch (method) {
        case 'POST': response = await api.post<TResponse>(endpoint, variables); break;
        case 'PUT': response = await api.put<TResponse>(endpoint, variables); break;
        case 'DELETE': response = await api.delete<TResponse>(endpoint, { data: variables }); break;
      }
      
      if (onSuccess && response) onSuccess(response.data);
      return response?.data;
    } catch (err: any) {
      const errorData: IApiError = {
        message: err.response?.data?.error || err.message,
        status: err.response?.status
      };
      setError(errorData);
      console.error(`[API 🚨] ${method} Failed at ${endpoint}:`, errorData);
      
      // CRITICAL: Throw the error so OptimisticUI.ts can trigger a rollback in Memory.ts
      throw errorData; 
    } finally {
      setIsLoading(false);
    }
  };

  return { mutate, isLoading, error };
};

// Export raw instance for use in non-hook files (like the Autoloader or Models)
export { api };