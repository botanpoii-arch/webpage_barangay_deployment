import { useState, useEffect, useCallback } from 'react';
import { Resident_table } from './Resident_table'; // The Brain (Logic Layer)
import { useGateQuery } from '../Query';            // The Infrastructure Layer
import { type DashboardData } from './Dashboard_model';

/**
 * ============================================================================
 * 1. DATA MODELS & INTERFACES
 * ============================================================================
 */
export interface IResident {
  id: string;
  name: string; // Used for search/autocomplete in Household Modal
  firstName: string;
  lastName: string;
  gender: 'Male' | 'Female';
  age: number;
  dob: string;
  zone: number | string;
  occupation?: string;
  is4Ps: boolean;
  isFarmer: boolean;
  isPWD: boolean;
  isVoter: boolean;
  residencyStatus: 'Permanent' | 'Transient' | 'Boarder';
  housingType: 'Owned' | 'Rented' | 'Boarding House' | 'Transient House';
}

export interface IHousehold {
  id: string;
  head_name: string;
  zone: number;
  members: number;
  is_4ps: boolean;
  is_indigent: boolean;
  created_at?: string;
}

/**
 * ============================================================================
 * 2. HOUSEHOLD HOOKS (Missing Export Added)
 * ============================================================================
 */

// --- CREATE HOUSEHOLD ---
// This hook was missing from your previous exports.
export const useCreateHousehold = (onSuccess?: () => void) => {
  const [isLoading, setIsLoading] = useState(false);

  const mutate = async (data: any) => {
    setIsLoading(true);
    // 🔗 LINK: Execution happens in the Brain (Resident_table)
    const success = await Resident_table.createHousehold(data);
    setIsLoading(false);
    
    if (success && onSuccess) {
      onSuccess();
    }
  };

  return { mutate, isLoading };
};

// --- GET ALL HOUSEHOLDS ---
export const useGetHouseholds = () => {
  // Direct Infrastructure Call via Gatekeeper
  return useGateQuery<IHousehold[]>('/households', []);
};

/**
 * ============================================================================
 * 3. RESIDENT HOOKS (Algorithm-Backed)
 * ============================================================================
 */

export const useGetResidents = () => {
  const [data, setData] = useState<IResident[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetcher = useCallback(async () => {
    setIsLoading(true);
    // [ALGO]: Checks FastCache inside the Resident_table
    const result = await Resident_table.getAllResidents();
    
    // Map data to ensure 'name' field exists for autocomplete components
    const mapped = result.map(r => ({
      ...r,
      name: r.name || `${r.firstName} ${r.lastName}`
    }));

    setData(mapped);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    let isMounted = true;
    if (isMounted) fetcher();
    return () => { isMounted = false; };
  }, [fetcher]);

  return { data, isLoading, refetch: fetcher };
};

export const useSaveResident = (onSuccess?: () => void) => {
  const [isLoading, setIsLoading] = useState(false);

  const mutate = async (data: Partial<IResident>) => {
    setIsLoading(true);
    let success = false;

    if (data.id) {
      success = await Resident_table.updateResident(data.id, data);
    } else {
      success = await Resident_table.createResident(data as Omit<IResident, 'id'>);
    }

    setIsLoading(false);
    if (success && onSuccess) onSuccess();
  };

  return { mutate, isLoading };
};

export const useArchiveResident = (onSuccess?: () => void) => {
  const [isLoading, setIsLoading] = useState(false);

  const mutate = async (variables: { id: string }) => {
    setIsLoading(true);
    const success = await Resident_table.archiveResident(variables.id);
    setIsLoading(false);
    if (success && onSuccess) onSuccess();
  };

  return { mutate, isLoading };
};

/**
 * ============================================================================
 * 4. SYSTEM TELEMETRY
 * ============================================================================
 */
export const useDashboardStats = () => {
  return useGateQuery<DashboardData>('/stats', []);
};