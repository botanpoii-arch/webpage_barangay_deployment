import { type IResident } from './collector'; // Importing the standardized Resident type

/**
 * ============================================================================
 * 1. INTERFACES (The Shape)
 * Defines the structure of the form data.
 * ============================================================================
 */

export interface IMemberForm {
  id: number;
  name: string;
  relation: string;
  age: string | number;
}

export interface IHouseholdForm {
  headName: string;
  headAge: string;
  addressZone: string; // Stored as string to handle "Zone 1" or just "1"
  ownership: 'Owned' | 'Rented' | 'Living with Relatives';
  toilet: 'Water Sealed' | 'Open Pit' | 'None';
  waterSource: 'Deep Well' | 'NAWASA / Tap' | 'Mineral Water';
  is4Ps: boolean;
  isIndigent: boolean;
  members: IMemberForm[];
}

export interface HouseholdModalProps {
  onClose: () => void;
  residentList: IResident[]; // Using the Collector's IResident
  onSaveSuccess: () => void;
}

/**
 * ============================================================================
 * 2. INITIAL STATE (The Defaults)
 * Centralized defaults to avoid magic strings in the UI.
 * ============================================================================
 */
export const initialHouseholdState: IHouseholdForm = {
  headName: '',
  headAge: '',
  addressZone: '',
  ownership: 'Owned',
  toilet: 'Water Sealed',
  waterSource: 'Deep Well',
  is4Ps: false,
  isIndigent: false,
  // Starts with one empty member row
  members: [{ id: Date.now(), name: '', relation: '', age: '' }]
};

/**
 * ============================================================================
 * 3. VALIDATION LOGIC (Optional Helper)
 * ============================================================================
 */
export const validateForm = (form: IHouseholdForm): string | null => {
  if (!form.headName) return "Family Head Name is required.";
  if (!form.addressZone) return "Address Zone is required.";
  return null; // Valid
};