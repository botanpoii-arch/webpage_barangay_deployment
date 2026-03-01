import React, { useState, useEffect, useCallback } from 'react';
import Login from './components/UI/Login';
import Dashboard from './components/UI/Dashboard'; 
import Community from './components/UI/Community';
import Community_Dashboard from './components/UI/Community_Dashboard'; 

import './App.css';

// 1. VIEW TYPES
type AppView = 'login' | 'admin' | 'community' | 'community_dash';

const App: React.FC = () => {
  /**
   * PERSISTENCE: 
   * When the app starts, it checks 'app_current_view' in localStorage.
   * If it finds 'admin', it starts on 'admin' instead of 'login'.
   */
  const [currentView, setCurrentView] = useState<AppView>(() => {
    const savedView = localStorage.getItem('app_current_view');
    return (savedView as AppView) || 'login';
  });

  // 2. GLOBAL THEME PERSISTENCE
  useEffect(() => {
    const savedTheme = localStorage.getItem('sb_theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
  }, []);

  /**
   * SYNC:
   * Every time the currentView changes, we save it to localStorage
   * so the browser "remembers" where you are if you refresh.
   */
  useEffect(() => {
    localStorage.setItem('app_current_view', currentView);
  }, [currentView]);

  // 3. LOGOUT LOGIC
  const handleLogout = useCallback(() => {
    // Clear session and saved view so user returns to login properly
    localStorage.removeItem('resident_session');
    localStorage.removeItem('app_current_view'); 
    setCurrentView('login');
  }, []);

  /**
   * 4. INACTIVITY TIMER (5 Minutes)
   * This watches for mouse movement, clicks, or typing.
   */
  useEffect(() => {
    // We don't need a timer if the user is already on the login page
    if (currentView === 'login') return;

    let timeoutId: NodeJS.Timeout;

    const resetTimer = () => {
      if (timeoutId) clearTimeout(timeoutId);

      // 5 minutes = 300,000 milliseconds
      timeoutId = setTimeout(() => {
        alert("You have been logged out due to 90 minutes of inactivity.");
        handleLogout();
      }, 90 * 60 * 1000); 
    };

    // Track these activities to prove the user is still there
    const activityEvents = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart'];

    activityEvents.forEach((event) => {
      document.addEventListener(event, resetTimer);
    });

    // Initialize timer on mount
    resetTimer();

    // Cleanup when component unmounts or view changes
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      activityEvents.forEach((event) => {
        document.removeEventListener(event, resetTimer);
      });
    };
  }, [currentView, handleLogout]);

  // --- TRANSITION HANDLERS ---

  const handlePortalSelection = (target: string) => {
    setCurrentView(target as AppView);
  };

  const goToCommunityDashboard = () => {
    setCurrentView('community_dash');
  };

  return (
    <div className="APP_ROOT">
      
      {/* PORTAL: LOGIN GATEWAY */}
      {currentView === 'login' && (
        <Login onSelectPortal={handlePortalSelection} />
      )}

      {/* PORTAL: FULL ADMIN SYSTEM */}
      {currentView === 'admin' && (
        <Dashboard onLogout={handleLogout} /> 
      )}

      {/* PORTAL: PUBLIC COMMUNITY VIEW */}
      {currentView === 'community' && (
        <Community 
          onExit={handleLogout} 
          onLoginSuccess={goToCommunityDashboard} 
        />
      )}

      {/* PORTAL: RESIDENT PRIVATE DASHBOARD */}
      {currentView === 'community_dash' && (
        <Community_Dashboard onLogout={() => setCurrentView('community')} />
      )}

    </div>
  );
};

export default App;