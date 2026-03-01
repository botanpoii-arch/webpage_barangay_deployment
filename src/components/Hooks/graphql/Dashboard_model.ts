import { api } from '../Query'; // Import the Gatekeeper instance

// --- INTERFACES (Kept exactly as you defined) ---
export interface DashboardStats {
  totalPopulation: number;
  documentsIssued: number;
  blotterCases: number;
  systemActivities: number;
}

export interface DashboardData {
  stats: DashboardStats;
  barangayName: string;
  systemName: string;
  adminName: string;
}

export const initialDashboardData: DashboardData = {
  stats: {
    totalPopulation: 0,
    documentsIssued: 0,
    blotterCases: 0,
    systemActivities: 0,
  },
  barangayName: "Barangay Engineers Hill",
  systemName: "Smart Barangay",
  adminName: "",
};

// --- THE REAL FETCH FUNCTION ---
export const fetchDashboardData = async (signal: AbortSignal): Promise<DashboardData> => {
  try {
    // 1. Use the Gatekeeper (api) to fetch data
    // We pass the 'signal' so React Query can cancel this request if the user leaves the page
    const response = await api.get<DashboardData>('/stats', {
      signal: signal 
    });

    // 2. Return the real data from the backend
    return response.data;
    
  } catch (error) {
    console.error("[Dashboard Model] Fetch Failed:", error);
    // Optional: Return initial data on error so the UI doesn't crash
    throw error; 
  }
};