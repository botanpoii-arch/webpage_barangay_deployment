/**
 * Encryption.ts
 * Internal System Security - SHA-256 Silent Hashing
 * Purpose: Provides a private "Digital Seal" for transactions. 
 * Only the system logic can read and verify these hashes.
 */

/**
 * Silent SHA-256 Hashing
 * Performs a background hash of a message for system-only verification.
 */
export const hashSHA256 = async (message: string): Promise<string> => {
  if (!message) return '';

  try {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    
    // Internal conversion to hex string
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  } catch {
    // Fails silently to maintain system privacy
    return '';
  }
};

/**
 * Internal Object Hashing (Checksum)
 * Used by Memory.ts and the Auditor to verify data integrity without user alerts.
 */
export const hashObject = async (obj: any): Promise<string> => {
  if (!obj) return '';
  
  try {
    // Sort keys internally to ensure the system reads the same data regardless of order
    const sortedObj = Object.keys(obj).sort().reduce((acc: any, key) => {
      acc[key] = obj[key];
      return acc;
    }, {});
    
    const stringified = JSON.stringify(sortedObj);
    return await hashSHA256(stringified);
  } catch {
    return '';
  }
};