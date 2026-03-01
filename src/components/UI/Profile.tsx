import React, { useState, useEffect } from 'react';
import './styles/Profile.css';

const Profile: React.FC = () => {
  // 1. THEME STATE & PERSISTENCE
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('sb_theme') || 'light';
  });

  // Apply theme to the root element for global CSS variable switching
  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-theme', theme);
    localStorage.setItem('sb_theme', theme);
  }, [theme]);

  // 2. FORM DATA STATE
  const [formData, setFormData] = useState({
    fullName: 'Authorized User',
    email: 'admin@engineershill.gov.ph',
    role: 'Barangay Administrator',
    phone: '0912-345-6789'
  });

  const [isEditing, setIsEditing] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSave = () => {
    setIsEditing(false);
    // Add API save logic here
    console.log("Saved profile:", formData);
  };

  return (
    <div className="PF_WIDE_CONTAINER">
      
      {/* --- PAGE HEADER --- */}
      <header className="PF_PAGE_HEADER">
        <h1>My Profile</h1>
        <p>Manage your account settings and system preferences for Engineers Hill.</p>
      </header>

      {/* =========================================================
          SECTION 1: ACCOUNT DETAILS (MOVED TO TOP)
         ========================================================= */}
      <section className="PF_SETTING_SECTION">
        <div className="PF_SECTION_LABEL">Account Details</div>
        <div className="PF_CONTENT_CARD">
          
          {/* Avatar Section */}
          <div className="PF_PROFILE_HEADER">
            <div className="PF_AVATAR_WRAPPER">
              <div className="PF_AVATAR_PLACEHOLDER">
                {formData.fullName.charAt(0).toUpperCase()}
              </div>
              <div className="PF_AVATAR_OVERLAY">
                <i className="fas fa-camera"></i>
              </div>
            </div>
            <div className="PF_USER_INFO">
              <h2 className="PF_USER_DISPLAY_NAME">{formData.fullName}</h2>
              <span className="PF_USER_DISPLAY_ROLE">{formData.role}</span>
            </div>
          </div>

          {/* Form Fields */}
          <div className="PF_FORM_GRID">
            <div className="PF_INPUT_GROUP">
              <label>Full Name</label>
              <input 
                type="text" 
                name="fullName"
                value={formData.fullName} 
                onChange={handleChange}
                disabled={!isEditing}
                className={`PF_CLEAN_INPUT ${!isEditing ? 'PF_DISABLED' : ''}`}
              />
            </div>
            <div className="PF_INPUT_GROUP">
              <label>Email Address</label>
              <input 
                type="email" 
                name="email"
                value={formData.email} 
                onChange={handleChange}
                disabled={!isEditing}
                className={`PF_CLEAN_INPUT ${!isEditing ? 'PF_DISABLED' : ''}`}
              />
            </div>
            <div className="PF_INPUT_GROUP">
              <label>Phone Number</label>
              <input 
                type="text" 
                name="phone"
                value={formData.phone} 
                onChange={handleChange}
                disabled={!isEditing}
                className={`PF_CLEAN_INPUT ${!isEditing ? 'PF_DISABLED' : ''}`}
              />
            </div>
            <div className="PF_INPUT_GROUP">
              <label>System Role</label>
              <input 
                type="text" 
                value={formData.role} 
                disabled 
                className="PF_CLEAN_INPUT PF_DISABLED" 
              />
            </div>
          </div>

          {/* Action Footer */}
          <div className="PF_ACTIONS">
            {isEditing ? (
              <>
                <button 
                  className="PF_BTN_CANCEL" 
                  style={{ marginRight: '1rem' }} 
                  onClick={() => setIsEditing(false)}
                >
                  Cancel
                </button>
                <button className="PF_BTN_SAVE" onClick={handleSave}>
                  Save Changes
                </button>
              </>
            ) : (
              <button className="PF_BTN_EDIT" onClick={() => setIsEditing(true)}>
                Edit Profile
              </button>
            )}
          </div>

        </div>
      </section>

      {/* =========================================================
          SECTION 2: APPEARANCE (MOVED TO BOTTOM)
         ========================================================= */}
      <section className="PF_SETTING_SECTION">
        <div className="PF_SECTION_LABEL">Appearance</div>
        <div className="PF_CONTENT_CARD">
          <h3 className="PF_CARD_TITLE" style={{ color: 'var(--PF-text-main)', margin: '0 0 0.5rem 0' }}>Interface Theme</h3>
          <p style={{ color: 'var(--PF-text-sub)', fontSize: '0.95rem', marginBottom: '1.5rem' }}>
            Select the interface theme that best fits your environment.
          </p>
          
          <div className="PF_THEME_GRID">
            {/* LIGHT MODE OPTION */}
            <button 
              className={`PF_THEME_VISUAL_BTN ${theme === 'light' ? 'ACTIVE' : ''}`}
              onClick={() => setTheme('light')}
            >
              <div className="PF_THEME_PREVIEW">
                <div className="PF_MOCK_WINDOW">
                  <div className="PF_MOCK_SIDEBAR"></div>
                  <div className="PF_MOCK_CONTENT">
                    <div className="PF_MOCK_LINE" style={{ width: '100%' }}></div>
                    <div className="PF_MOCK_LINE" style={{ width: '60%' }}></div>
                  </div>
                </div>
              </div>
              <span>Light Mode</span>
            </button>

            {/* DARK MODE OPTION */}
            <button 
              className={`PF_THEME_VISUAL_BTN ${theme === 'dark' ? 'ACTIVE' : ''}`}
              onClick={() => setTheme('dark')}
            >
              <div className="PF_THEME_PREVIEW">
                <div className="PF_MOCK_WINDOW DARK_WINDOW">
                  <div className="PF_MOCK_SIDEBAR"></div>
                  <div className="PF_MOCK_CONTENT">
                    <div className="PF_MOCK_LINE" style={{ width: '100%' }}></div>
                    <div className="PF_MOCK_LINE" style={{ width: '60%' }}></div>
                  </div>
                </div>
              </div>
              <span>Dark Mode</span>
            </button>
          </div>
        </div>
      </section>

    </div>
  );
};

export default Profile;