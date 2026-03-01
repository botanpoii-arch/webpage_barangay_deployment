import React, { useState } from 'react';
import './styles/Community_Resetpassword_modal.css'; 

interface ResetProps {
  isOpen: boolean;
  resident: any; 
  onSuccess: () => void;
}

const CommunityResetPasswordModal: React.FC<ResetProps> = ({ isOpen, resident, onSuccess }) => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const API_BASE = 'http://localhost:8000/api';

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // --- 1. Client-Side Validation ---
    if (!newPassword || !confirmPassword) {
      setError('Please fill in both password fields.');
      return;
    }

    if (newPassword.length < 8) {
      setError('Security requirement: Password must be at least 8 characters.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Validation failed: Passwords do not match.');
      return;
    }

    // ALIGNED: Get the account_id from the new login payload structure
    const accountId = resident?.account_id;
    
    if (!accountId) {
        setError("System Error: Account ID missing. Please log out and try again.");
        return;
    }

    setLoading(true);

    try {
      // --- 2. Call the Secure Update Route ---
      // We are targeting the account_id directly to update the password_hash
      const res = await fetch(`${API_BASE}/accounts/reset/${accountId}`, {
        method: 'PATCH',
        headers: { 
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password: newPassword })
      });

      const data = await res.json();

      if (!res.ok) {
          throw new Error(data.error || 'Failed to secure account. Please try again.');
      }

      // --- 3. Update Local Session Flag ---
      const savedSession = localStorage.getItem('resident_session');
      if (savedSession) {
          const session = JSON.parse(savedSession);
          session.requires_reset = false;
          localStorage.setItem('resident_session', JSON.stringify(session));
      }

      // --- 4. Success State ---
      alert("Account Secured! You now have full access to the portal.");
      onSuccess();

    } catch (err: any) {
      console.error("Reset Error:", err);
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="CM_RESET_OVERLAY">
      <div className="CM_RESET_CARD">
        
        {/* Header Section */}
        <div className="CM_RESET_HEADER">
          <div className="CM_RESET_ICON">
            <i className="fas fa-user-shield"></i>
          </div>
          <h2>Secure Your Account</h2>
          <p>
            {/* ALIGNED: Pulls first_name from the joined profile object */}
            Hello <strong>{resident?.profile?.first_name || 'Resident'}</strong>, for your security, you must update your default password before accessing the portal.
          </p>
        </div>

        {/* Form Section */}
        <form onSubmit={handleReset} className="CM_RESET_FORM">
          
          {error && (
            <div className="CM_RESET_ERROR">
              <i className="fas fa-exclamation-triangle"></i> {error}
            </div>
          )}

          <div className="CM_RESET_INPUT_GROUP">
            <label>New Password</label>
            <div className="CM_RESET_INPUT_WRAPPER">
              <i className="fas fa-lock"></i>
              <input 
                type="password" 
                placeholder="Minimum 8 characters"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                disabled={loading}
                autoComplete="new-password"
              />
            </div>
          </div>

          <div className="CM_RESET_INPUT_GROUP">
            <label>Confirm New Password</label>
            <div className="CM_RESET_INPUT_WRAPPER">
              <i className="fas fa-check-circle"></i>
              <input 
                type="password" 
                placeholder="Repeat new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={loading}
                autoComplete="new-password"
              />
            </div>
          </div>

          <button 
            type="submit" 
            className="CM_RESET_SUBMIT" 
            disabled={loading}
          >
            {loading ? (
                <>
                    <i className="fas fa-spinner fa-spin"></i> Securing Account...
                </>
            ) : (
                <>
                    Update & Access Portal <i className="fas fa-arrow-right"></i>
                </>
            )}
          </button>
        </form>

        <div className="CM_RESET_FOOTER">
          <p>This is a one-time security requirement for Engineer's Hill Residents.</p>
        </div>
      </div>
    </div>
  );
};

export default CommunityResetPasswordModal;