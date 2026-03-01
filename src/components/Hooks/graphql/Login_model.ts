// Define expected response structures
export interface LoginResponse {
  success: boolean;
  token?: string;
  user?: {
    id: string;
    role: 'admin' | 'staff';
    name: string;
  };
  message?: string;
}

// Custom Error class for handling Auth failures securely
export class AuthError extends Error {
  constructor(public message: string, public statusCode: number = 401) {
    super(message);
    this.name = 'AuthError';
  }
}

export class LoginModel {
  // CONFIGURATION
  // In production, use environment variables: process.env.REACT_APP_API_URL
  private static readonly API_BASE = 'http:localhost:8000/api';
  
  // OWASP: Timeout to prevent Slowloris attacks hanging the client
  private static readonly TIMEOUT_MS = 10000;

  /**
   * Securely authenticates the user.
   * OWASP: Uses POST to keep credentials out of URL logs.
   */
  static async authenticate(username: string, password: string): Promise<LoginResponse> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.TIMEOUT_MS);

    try {
      // 1. INPUT SANITIZATION (Client-side layer)
      // Remove dangerous characters before they leave the browser
      const cleanUsername = username.trim().replace(/[<>"'/]/g, '');

      // 2. SECURE API CALL
      // Note: Replace with your actual endpoint
      // For now, we simulate a secure fetch for demonstration
      
      /* --- UNCOMMENT FOR REAL BACKEND ---
      const response = await fetch(`${this.API_BASE}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Content-Type-Options': 'nosniff', // Prevent MIME sniffing
          'Accept': 'application/json'
        },
        body: JSON.stringify({ username: cleanUsername, password }),
        signal: controller.signal
      });

      if (response.status === 429) {
        throw new AuthError('Too many requests. Please wait.', 429);
      }

      if (!response.ok) {
        // OWASP: Normalize error messages. Don't reveal "User not found".
        throw new AuthError('Invalid credentials.', 401);
      }

      const data = await response.json();
      return data; 
      ------------------------------------- */

      // --- MOCK SIMULATION (Remove when backend is ready) ---
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          if (cleanUsername === 'admin' && password === 'password123') {
            resolve({
              success: true,
              token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.mock-secure-token',
              user: { id: 'ADM-001', role: 'admin', name: 'Official Admin' }
            });
          } else {
            // OWASP: Generic error message
            reject(new AuthError('Invalid credentials', 401));
          }
        }, 800);
      });

    } catch (error: any) {
      if (error.name === 'AbortError') {
        throw new AuthError('Request timed out.', 408);
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }

  /**
   * Requests a password reset link via email.
   */
  static async requestEmailReset(email: string): Promise<boolean> {
    // OWASP: Rate limiting should be enforced on the server for this endpoint
    try {
      /* const response = await fetch(`${this.API_BASE}/auth/recover/email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      return response.ok; 
      */
      
      // Mock Success (Always return true to prevent Email Enumeration)
      return new Promise(resolve => setTimeout(() => resolve(true), 1000));
    } catch (error) {
      // Log internally, but don't fail loudly to the UI
      console.error('Email recovery error:', error);
      return true; // Fake success for security
    }
  }

  /**
   * Sends an OTP to the registered phone number.
   */
  static async sendOtp(phone: string): Promise<boolean> {
    try {
      /*
      const response = await fetch(`${this.API_BASE}/auth/otp/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone })
      });
      if (!response.ok) throw new Error('Failed to send OTP');
      return true;
      */

      return new Promise((resolve, reject) => {
        setTimeout(() => {
          // specific mock logic
          if (phone.length > 10) resolve(true);
          else reject(new Error('Invalid phone'));
        }, 1000);
      });
    } catch (error) {
      throw error;
    }
  }

  /**
   * Verifies the provided OTP code.
   */
  static async verifyOtp(phone: string, code: string): Promise<boolean> {
    try {
      /*
      const response = await fetch(`${this.API_BASE}/auth/otp/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, code })
      });
      return response.ok;
      */

      return new Promise((resolve, reject) => {
        setTimeout(() => {
          if (code === '123456') resolve(true); // Mock "Magic Code"
          else reject(new Error('Invalid Code'));
        }, 1000);
      });
    } catch (error) {
      throw error;
    }
  }
}