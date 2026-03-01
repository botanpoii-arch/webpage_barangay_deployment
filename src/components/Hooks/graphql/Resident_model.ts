// Corrected paths for src/components/Hooks/graphql/Resident_model.ts
import { residentMemoryStore } from '../Memory';
import { executeOptimistic } from '../OptimisticUI';
import { api } from '../Api';
import { hashObject } from '../Encryption';


// Import your custom algorithms
// import { processResidentData } from './Data_Algorithm'; 

export interface IResident {
  id: string;
  firstName: string;
  lastName: string;
  purok: string;
  // ... other fields
}

/**
 * RESIDENT MODEL (The Main Distributor)
 * Functionality: Collects all data from the UI and distributes it to 
 * Memory, API, and Audit logs simultaneously.
 */
export const ResidentModel = {
  
  // 1. CREATE / ADD DISTRIBUTOR
  async addResident(newResident: IResident) {
    try {
      // Logic from Data_Algorithm.ts could be applied here first
      // const processed = processResidentData(newResident);

      return await executeOptimistic(
        residentMemoryStore,
        api.post('/residents', newResident),
        newResident,
        'ADD'
      );
    } catch (error) {
      console.error("[DISTRIBUTOR 🚨] Add Failed:", error);
      throw error;
    }
  },

  // 2. UPDATE DISTRIBUTOR
  async updateResident(updatedData: IResident, previousData: IResident) {
    try {
      return await executeOptimistic(
        residentMemoryStore,
        api.put(`/residents/${updatedData.id}`, updatedData),
        updatedData,
        'UPDATE',
        previousData
      );
    } catch (error) {
      console.error("[DISTRIBUTOR 🚨] Update Failed:", error);
      throw error;
    }
  },

  // 3. ARCHIVE / DELETE DISTRIBUTOR
  async archiveResident(resident: IResident) {
    try {
      return await executeOptimistic(
        residentMemoryStore,
        api.delete(`/residents/${resident.id}`),
        resident,
        'DELETE',
        resident
      );
    } catch (error) {
      console.error("[DISTRIBUTOR 🚨] Archive Failed:", error);
      throw error;
    }
  },

  // 4. SYNC DISTRIBUTOR (Called by Auto_loader.ts)
  async syncFromServer(serverData: IResident[]) {
    // This talks directly to Memory.ts to update the "Desk"
    await residentMemoryStore.setAll(serverData);
  }
};