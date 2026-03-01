import React, { useState, useMemo, useEffect } from 'react';
import { FileComponent } from '../buttons/Tools/Blotter_File'; 
import './styles/Blotter.css';

interface IBlotterCase {
  id: string;
  case_number: string;
  complainant_name: string;
  complainant_id?: string;
  respondent: string;
  incident_type: string;
  status: 'Active' | 'Hearing' | 'Settled' | 'Archived' | 'Rejected'; // Added Rejected
  date_filed: string;
  time_filed?: string;
  hearing_date?: string;
  hearing_time?: string;
  narrative?: string;
  rejection_reason?: string; // Added field for comment
}

export default function BlotterPage() {
  const [cases, setCases] = useState<IBlotterCase[]>([]);
  const [error, setError] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);

  // --- UI STATES ---
  // Added 'Rejected' to tabs
  const [activeTab, setActiveTab] = useState<'Active' | 'Hearing' | 'Settled' | 'Archived' | 'Rejected'>('Active');
  const [searchTerm, setSearchTerm] = useState('');
  
  // --- MODAL STATES ---
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCase, setSelectedCase] = useState<IBlotterCase | null>(null);

  // --- HEARING MODAL STATE ---
  const [hearingModal, setHearingModal] = useState({
    isOpen: false,
    caseId: '',
    date: '',
    time: ''
  });

  // --- REJECTION MODAL STATE ---
  const [rejectModal, setRejectModal] = useState({
    isOpen: false,
    caseId: '',
    reason: ''
  });

  const API_URL = 'http://localhost:8000/api/blotter'; 

  // 1. FETCH FUNCTION 
  const fetchCases = async (silent = false) => {
    if (!silent) setIsSyncing(true);
    try {
      const response = await fetch(API_URL);
      if (!response.ok) throw new Error('Failed to connect to backend');
      const data = await response.json();
      setCases(data);
      setError('');
    } catch (err) {
      console.error(err);
      setError('Cannot reach server. Ensure backend is running.');
    } finally {
      setIsSyncing(false);
    }
  };

  // 2. AUTOLOADER 
  useEffect(() => {
    fetchCases();
    const autoLoader = setInterval(() => fetchCases(true), 15000); 
    return () => clearInterval(autoLoader);
  }, []);

  // 3. STATS
  const activeCount = cases.filter(c => c.status === 'Active').length;
  const hearingCount = cases.filter(c => c.status === 'Hearing').length;
  const settledCount = cases.filter(c => c.status === 'Settled').length;
  // Optional: Count rejected if needed, but not usually a main KPI

  // 4. FILTER LOGIC
  const filteredCases = useMemo(() => {
    return cases.filter((c) => {
      const cNum = c.case_number || '';
      const cName = c.complainant_name || '';
      const cResp = c.respondent || '';
      
      const searchStr = `${cNum} ${cName} ${cResp}`.toLowerCase();
      
      if (searchTerm && !searchStr.includes(searchTerm.toLowerCase())) return false;

      // Status Filter
      if (activeTab === 'Active') return c.status === 'Active';
      if (activeTab === 'Hearing') return c.status === 'Hearing';
      if (activeTab === 'Settled') return c.status === 'Settled';
      if (activeTab === 'Archived') return c.status === 'Archived';
      if (activeTab === 'Rejected') return c.status === 'Rejected';

      return true;
    });
  }, [cases, activeTab, searchTerm]);

  // --- ACTIONS LOGIC ---

  // A. SCHEDULE HEARING
  const openHearingModal = (caseId: string) => {
    setHearingModal({
      isOpen: true,
      caseId: caseId,
      date: new Date().toISOString().split('T')[0], 
      time: '09:00'
    });
  };

  const submitHearing = async () => {
    try {
      const res = await fetch(`${API_URL}/${hearingModal.caseId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          status: 'Hearing',
          hearing_date: hearingModal.date,
          hearing_time: hearingModal.time
        })
      });

      if (res.ok) {
        fetchCases(true);
        setHearingModal({ ...hearingModal, isOpen: false });
        alert(`Hearing scheduled for ${hearingModal.date} at ${hearingModal.time}`);
      }
    } catch (err) {
      alert('Failed to schedule hearing.');
    }
  };

  // B. REJECT CASE (New Logic)
  const openRejectModal = (caseId: string) => {
    setRejectModal({
      isOpen: true,
      caseId: caseId,
      reason: '' // Reset reason
    });
  };

  const submitRejection = async () => {
    if (!rejectModal.reason.trim()) return alert("Please provide a reason for rejection.");

    try {
      const res = await fetch(`${API_URL}/${rejectModal.caseId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          status: 'Rejected',
          rejection_reason: rejectModal.reason 
        })
      });

      if (res.ok) {
        fetchCases(true);
        setRejectModal({ ...rejectModal, isOpen: false });
      }
    } catch (err) {
      alert('Failed to reject case.');
    }
  };

  // C. SETTLE & ARCHIVE
  const handleMarkAsSettled = async (id: string) => {
    if (!window.confirm('Mark this case as SETTLED? \n\nNote: This will close the case.')) return;
    try {
      const res = await fetch(`${API_URL}/${id}/status`, { 
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'Settled' })
      });
      if (res.ok) fetchCases(true);
    } catch (err) { alert('Failed to update status.'); }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Move to Archive?')) return;
    try {
      const res = await fetch(`${API_URL}/${id}`, { 
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'Archived' })
      });
      if (res.ok) fetchCases(true);
    } catch (err) { alert('Failed to archive.'); }
  };

  return (
    <div className="BLOT_PAGE_WRAP">
      <div className="BLOT_MAIN_CONTAINER">
        
        {/* HEADER */}
        <div className="BLOT_HEADER_FLEX">
          <div>
            <h1 className="BLOT_PAGE_TITLE">Blotter Cases</h1>
            <p className="BLOT_PAGE_SUB">Manage complaints, hearings, and settlements.</p>
          </div>
          <button 
            className="BLOT_ADD_BTN" 
            onClick={() => { setSelectedCase(null); setIsModalOpen(true); }}
          >
            <i className="fas fa-gavel"></i> File Complaint
          </button>
        </div>

        {/* STATS */}
        <div className="BLOT_STATS_GRID">
          <div className={`BLOT_STAT_CARD clickable ${activeTab === 'Active' ? 'ACTIVE_CARD' : ''}`} onClick={() => setActiveTab('Active')}>
            <div className="BLOT_STAT_INFO"><span className="BLOT_STAT_NUM">{activeCount}</span><span className="BLOT_STAT_LABEL">ACTIVE CASES</span></div>
            <div className="BLOT_STAT_ICON_WRAP ICON_RED"><i className="fas fa-exclamation"></i></div>
          </div>
          <div className={`BLOT_STAT_CARD clickable ${activeTab === 'Hearing' ? 'ACTIVE_CARD' : ''}`} onClick={() => setActiveTab('Hearing')}>
            <div className="BLOT_STAT_INFO"><span className="BLOT_STAT_NUM">{hearingCount}</span><span className="BLOT_STAT_LABEL">HEARINGS SET</span></div>
            <div className="BLOT_STAT_ICON_WRAP ICON_BLUE"><i className="fas fa-calendar-alt"></i></div>
          </div>
          <div className={`BLOT_STAT_CARD clickable ${activeTab === 'Settled' ? 'ACTIVE_CARD' : ''}`} onClick={() => setActiveTab('Settled')}>
            <div className="BLOT_STAT_INFO"><span className="BLOT_STAT_NUM">{settledCount}</span><span className="BLOT_STAT_LABEL">SETTLED</span></div>
            <div className="BLOT_STAT_ICON_WRAP ICON_GREEN"><i className="fas fa-handshake"></i></div>
          </div>
        </div>

        {/* TABLE SECTION */}
        <div className="BLOT_TABLE_CONTAINER">
          <div className="BLOT_TABS_ROW">
            <button className={`BLOT_TAB_BTN ${activeTab === 'Active' ? 'ACTIVE' : ''}`} onClick={() => setActiveTab('Active')}>Active</button>
            <button className={`BLOT_TAB_BTN ${activeTab === 'Hearing' ? 'ACTIVE' : ''}`} onClick={() => setActiveTab('Hearing')}>Hearings</button>
            <button className={`BLOT_TAB_BTN ${activeTab === 'Settled' ? 'ACTIVE' : ''}`} onClick={() => setActiveTab('Settled')}>Settled</button>
            <button className={`BLOT_TAB_BTN ${activeTab === 'Rejected' ? 'ACTIVE' : ''}`} onClick={() => setActiveTab('Rejected')}>Rejected</button>
            <button className={`BLOT_TAB_BTN ${activeTab === 'Archived' ? 'ACTIVE' : ''}`} onClick={() => setActiveTab('Archived')}>Archived</button>
          </div>

          <div className="BLOT_SEARCH_ROW">
            <div style={{position: 'relative', width: '300px'}}>
              <i className="fas fa-search" style={{position:'absolute', left:'12px', top:'50%', transform:'translateY(-50%)', color:'#94a3b8', fontSize:'0.9rem'}}></i>
              <input className="BLOT_SEARCH_INPUT" placeholder="Search case number or name..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
            {isSyncing && <span className="BLOT_SYNC_LABEL">● Syncing...</span>}
          </div>

          <div className="BLOT_TABLE_WRAP">
            <table className="BLOT_TABLE_MAIN">
              <thead>
                <tr>
                  <th>CASE #</th>
                  <th>COMPLAINANT</th>
                  <th>RESPONDENT</th>
                  <th>TYPE</th>
                  <th>
                    {activeTab === 'Hearing' ? 'HEARING DATE' : 
                     activeTab === 'Rejected' ? 'REASON' : 'FILED DATE'}
                  </th>
                  <th>STATUS</th>
                  <th style={{textAlign:'right'}}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {error ? (
                  <tr><td colSpan={7} style={{textAlign: 'center', padding: '4rem', color: '#ef4444'}}>{error}<br/><button onClick={() => fetchCases()} className="BLOT_RETRY_BTN">Retry</button></td></tr>
                ) : filteredCases.length === 0 ? (
                  <tr><td colSpan={7} style={{textAlign: 'center', padding: '5rem', color: '#94a3b8'}}><span style={{fontStyle:'italic'}}>No {activeTab.toLowerCase()} records found.</span></td></tr>
                ) : (
                  filteredCases.map((c) => {
                    const isLocked = c.status === 'Settled' || c.status === 'Archived' || c.status === 'Rejected';
                    
                    return (
                      <tr key={c.id}>
                        <td><span className="BLOT_CASE_NUMBER">{c.case_number}</span></td>
                        <td>{c.complainant_name}</td>
                        <td>{c.respondent}</td>
                        <td>{c.incident_type}</td>
                        <td style={{fontSize:'0.85rem', color:'#64748b', maxWidth:'200px'}}>
                          {/* Dynamic Date Column content based on Tab */}
                          {activeTab === 'Hearing' ? `${c.hearing_date || 'N/A'} @ ${c.hearing_time || '?'}` : 
                           activeTab === 'Rejected' ? <span style={{color:'#ef4444', fontStyle:'italic'}}>{c.rejection_reason || 'No reason provided.'}</span> :
                           c.date_filed}
                        </td>
                        <td>
                          <span className={`BLOT_STATUS_BADGE STATUS_${c.status.toUpperCase()}`}>
                            {c.status}
                          </span>
                        </td>
                        <td style={{textAlign:'right'}}>
                          
                          {/* 1. SCHEDULE HEARING (Active Only) */}
                          {c.status === 'Active' && (
                            <button 
                              className="BLOT_ACTION_ICON" 
                              title="Schedule Hearing"
                              onClick={() => openHearingModal(c.id)}
                              style={{ color: '#3b82f6', marginRight: '5px' }}
                            >
                              <i className="fas fa-calendar-plus"></i>
                            </button>
                          )}

                          {/* 2. REJECT (Active Only) - NEW */}
                          {c.status === 'Active' && (
                            <button 
                              className="BLOT_ACTION_ICON" 
                              title="Reject Case"
                              onClick={() => openRejectModal(c.id)}
                              style={{ color: '#ef4444', marginRight: '5px' }}
                            >
                              <i className="fas fa-times-circle"></i>
                            </button>
                          )}

                          {/* 3. SETTLE (Hearing Only) */}
                          {c.status === 'Hearing' && (
                            <button 
                              className="BLOT_ACTION_ICON" 
                              title="Mark as Settled"
                              onClick={() => handleMarkAsSettled(c.id)}
                              style={{ color: '#10b981', marginRight: '5px' }}
                            >
                              <i className="fas fa-gavel"></i>
                            </button>
                          )}

                          {/* 4. VIEW FILE */}
                          <button 
                            className="BLOT_ACTION_ICON" 
                            title="Open Case File"
                            onClick={() => { setSelectedCase(c); setIsModalOpen(true); }}
                          >
                            {isLocked ? <i className="fas fa-eye"></i> : <i className="fas fa-pen"></i>}
                          </button>

                          {/* 5. ARCHIVE */}
                          {c.status !== 'Archived' && (
                            <button 
                              className="BLOT_ACTION_ICON" 
                              title="Archive Record"
                              onClick={() => handleDelete(c.id)}
                            >
                              <i className="fas fa-archive"></i>
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="BLOT_PAGINATION">
             <button className="BLOT_PAGE_BTN" disabled>Previous</button>
             <span className="BLOT_PAGE_INFO">Page 1 of 1</span>
             <button className="BLOT_PAGE_BTN" disabled>Next</button>
          </div>
        </div>
      </div>

      {/* --- STUDIO DESK OVERLAY --- */}
      {isModalOpen && (
        <FileComponent 
          onClose={() => setIsModalOpen(false)} 
          onRefresh={() => fetchCases(true)} 
          selectedCase={selectedCase}
          officials={[]} 
        />
      )}

      {/* --- SCHEDULE HEARING MODAL --- */}
      {hearingModal.isOpen && (
        <div className="DOC_FILE_OVERLAY" style={{zIndex: 6000}} onClick={() => setHearingModal({...hearingModal, isOpen: false})}>
          <div className="BLOT_SIMPLE_MODAL" onClick={e => e.stopPropagation()}>
            <h3>Schedule Hearing</h3>
            <p>Set a date and time for the confrontation.</p>
            
            <div style={{marginTop: '20px'}}>
              <label style={{display:'block', marginBottom:'5px', fontSize:'0.85rem', fontWeight:'bold'}}>Hearing Date</label>
              <input 
                type="date" 
                className="BLOT_SEARCH_INPUT" 
                style={{width: '100%', marginBottom: '15px'}}
                value={hearingModal.date}
                onChange={(e) => setHearingModal({...hearingModal, date: e.target.value})}
              />

              <label style={{display:'block', marginBottom:'5px', fontSize:'0.85rem', fontWeight:'bold'}}>Time</label>
              <input 
                type="time" 
                className="BLOT_SEARCH_INPUT" 
                style={{width: '100%'}}
                value={hearingModal.time}
                onChange={(e) => setHearingModal({...hearingModal, time: e.target.value})}
              />
            </div>

            <div style={{marginTop: '30px', display: 'flex', gap: '10px', justifyContent: 'flex-end'}}>
              <button className="BLOT_PAGE_BTN" onClick={() => setHearingModal({...hearingModal, isOpen: false})}>Cancel</button>
              <button className="BLOT_ADD_BTN" style={{padding: '8px 20px'}} onClick={submitHearing}>Confirm Schedule</button>
            </div>
          </div>
        </div>
      )}

      {/* --- REJECTION MODAL (NEW) --- */}
      {rejectModal.isOpen && (
        <div className="DOC_FILE_OVERLAY" style={{zIndex: 6000}} onClick={() => setRejectModal({...rejectModal, isOpen: false})}>
          <div className="BLOT_SIMPLE_MODAL" onClick={e => e.stopPropagation()}>
            <h3 style={{color: '#ef4444'}}>Reject Case</h3>
            <p>Please specify why this complaint is being rejected.</p>
            
            <div style={{marginTop: '20px'}}>
              <label style={{display:'block', marginBottom:'5px', fontSize:'0.85rem', fontWeight:'bold'}}>Reason for Rejection</label>
              <textarea 
                className="BLOT_SEARCH_INPUT" 
                style={{width: '100%', height: '100px', padding: '10px', fontFamily:'inherit'}}
                placeholder="e.g., Not within barangay jurisdiction, Insufficient details..."
                value={rejectModal.reason}
                onChange={(e) => setRejectModal({...rejectModal, reason: e.target.value})}
              ></textarea>
            </div>

            <div style={{marginTop: '20px', display: 'flex', gap: '10px', justifyContent: 'flex-end'}}>
              <button className="BLOT_PAGE_BTN" onClick={() => setRejectModal({...rejectModal, isOpen: false})}>Cancel</button>
              <button 
                className="BLOT_ADD_BTN" 
                style={{padding: '8px 20px', backgroundColor: '#ef4444'}}
                onClick={submitRejection}
              >
                Reject Case
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}