import React, { useState, useEffect, useCallback } from 'react';
import CommunityResetPasswordModal from '../buttons/Community_Resetpassword_modal'; 
import Community_Blotter_Request from '../buttons/Community_Blotter_Request'; 
import Community_Document_Request from '../buttons/Community_Document_Request';

// IMPORTED VIEWS
import Community_Blotter_view from '../forms/Community_Blotter_view';
import Community_Document_view from '../forms/Community_Document_view';

import './styles/Community_Dashboard.css';

interface DashboardProps {
  onLogout: () => void;
}

type TabState = 'Pending' | 'Processing' | 'Ready' | 'Completed';

const Community_Dashboard: React.FC<DashboardProps> = ({ onLogout }) => {
  // --- STATE MANAGEMENT ---
  const [resident, setResident] = useState<any>(null);
  const [blotters, setBlotters] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]); 
  
  const [activeTab, setActiveTab] = useState<TabState>('Pending');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // --- MODAL STATES ---
  const [showForceReset, setShowForceReset] = useState(false);
  const [showBlotterModal, setShowBlotterModal] = useState(false);
  const [showDocModal, setShowDocModal] = useState(false); 

  const API_BASE = 'http://localhost:8000/api'; 

  // --- 1. CORE FORMATTER: "Ranni L. Carian" ---
  const formatToProperName = useCallback((first: string = '', middle: string = '', last: string = '') => {
    const toTitleCase = (str: string) => 
      str.toLowerCase().trim().split(/\s+/).map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');

    const fName = toTitleCase(first);
    const lName = toTitleCase(last);
    const mInit = middle.trim() ? `${middle.trim().charAt(0).toUpperCase()}. ` : '';

    return `${fName} ${mInit}${lName}`.trim();
  }, []);

  // 2. INITIALIZE SESSION
// Inside Community_Dashboard.tsx
useEffect(() => {
  const savedSession = localStorage.getItem('resident_session');
  
  if (savedSession) {
    const parsed = JSON.parse(savedSession);
    
    // Aligned to match your ResidentsRecordRouter return structure
    // We check for 'profile' first, then 'user', then fallback
    const profile = parsed.profile || parsed.user || parsed;
    const accountId = parsed.account_id || parsed.id; 

    // CRITICAL FIX: If IDs are missing, force a re-login to clear old data
    if (!profile.record_id && !accountId) {
      console.error("Session corrupted: Missing IDs");
      localStorage.removeItem('resident_session');
      onLogout(); 
      return;
    }

    const formatted = formatToProperName(
      profile.first_name, 
      profile.middle_name, 
      profile.last_name
    );

    setResident({ ...profile, formattedName: formatted, account_id: accountId });
    
    // Use record_id for database queries
    fetchData(profile.record_id);
  } else {
    onLogout();
  }
}, [onLogout, formatToProperName]);

  // 3. FETCH DATA (Integrated ID-Based Sync)
  const fetchData = async (residentId: string) => {
    if (!residentId) return;
    
    try {
      setLoading(true);
      const [blotterRes, docRes] = await Promise.all([
        fetch(`${API_BASE}/blotter`),
        fetch(`${API_BASE}/documents`) 
      ]);

      if (!blotterRes.ok || !docRes.ok) throw new Error("Sync failed");

      const blotterData = await blotterRes.json();
      const docData = await docRes.json();

      // --- MAP BLOTTERS ---
      const mappedBlotters = blotterData
        .filter((b: any) => b.complainant_id === residentId)
        .map((b: any) => {
          let uiTab: TabState = 'Pending';
          if (b.status === 'Active' || b.status === 'Hearing') uiTab = 'Processing';
          else if (b.status === 'Settled' || b.status === 'Archived') uiTab = 'Completed';

          return {
            id: b.case_number, 
            type: 'Blotter Report',
            date: b.date_filed, 
            status: uiTab, 
            rawStatus: b.status,
            details: `Vs ${b.respondent}: ${b.incident_type}`, 
            price: 'Free',
            timeline: [
              { step: 'Report Filed', time: b.date_filed, active: true },
              { step: 'Investigation', time: b.status !== 'Pending' ? 'Ongoing' : 'Queue', active: b.status !== 'Pending' },
              { step: 'Resolution', time: b.status === 'Settled' ? 'Closed' : '--', active: b.status === 'Settled' }
            ]
          };
        });

      // --- MAP DOCUMENTS ---
      const mappedDocs = docData
        .filter((d: any) => d.resident_id === residentId)
        .map((d: any) => {
          let uiTab: TabState = 'Pending';
          if (d.status === 'Processing') uiTab = 'Processing';
          else if (d.status === 'Ready') uiTab = 'Ready';
          else if (d.status === 'Completed') uiTab = 'Completed';

          return {
            id: d.reference_no || d.referenceNo || 'REF-N/A', 
            type: d.type || 'Document',
            date: new Date(d.date_requested).toLocaleDateString(),
            status: uiTab, 
            rawStatus: d.status,
            details: `Purpose: ${d.purpose}`,
            price: !d.price ? 'Free' : `₱${d.price}.00`,
            timeline: [
              { step: 'Filed', time: new Date(d.date_requested).toLocaleDateString(), active: true },
              { step: 'Processing', time: d.status !== 'Pending' ? 'Active' : '--', active: d.status !== 'Pending' },
              { step: 'Ready', time: d.status === 'Ready' ? 'Pickup' : '--', active: d.status === 'Ready' || d.status === 'Completed' }
            ]
          };
        });

      setBlotters(mappedBlotters);
      setDocuments(mappedDocs);
    } catch (err) {
      console.error("Dashboard Sync Error:", err);
    } finally {
      setLoading(false);
    }
  };

  const filterList = (list: any[]) => {
    return list.filter(item => 
      item.status === activeTab && 
      (item.id?.toLowerCase().includes(searchTerm.toLowerCase()) || 
       item.details?.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  };

  const renderDetailModal = () => {
    if (!selectedRequest) return null;
    return (
      <div className="DTL_OVERLAY" onClick={() => setSelectedRequest(null)}>
        <div className="DTL_SHEET" onClick={e => e.stopPropagation()}>
          <div className="DTL_HEADER">
            <button className="DTL_BACK_BTN" onClick={() => setSelectedRequest(null)}><i className="fas fa-arrow-left"></i></button>
            <div className="DTL_TITLE">
              <h3>Request Details</h3>
              <span className={`DTL_STATUS_BADGE ${selectedRequest.rawStatus.toUpperCase()}`}>
                {selectedRequest.rawStatus.toUpperCase()}
              </span>
            </div>
          </div>
          <div className="DTL_BODY">
            <div className="DTL_SECTION TIMELINE_SEC">
              <div className="SEC_HEADER_TEXT">Status Timeline</div>
              <div className="DTL_TIMELINE">
                {selectedRequest.timeline?.map((step: any, idx: number) => (
                  <div key={idx} className={`TL_ITEM ${step.active ? 'ACTIVE' : ''}`}>
                    <div className="TL_DOT"></div>
                    <div className="TL_CONTENT">
                      <div className="TL_STEP">{step.step}</div>
                      <div className="TL_TIME">{step.time}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="DTL_SECTION">
              <div className="SEC_HEADER_TEXT">Requestor Profile</div>
              <div className="DTL_ADDRESS_BOX">
                <strong>{resident?.formattedName}</strong>
                <p>Purok {resident?.purok}, Brgy. Engineer's Hill</p>
              </div>
            </div>

            <div className="DTL_SECTION">
              <div className="SEC_HEADER_TEXT">Items</div>
              <div className="DTL_PRODUCT_ROW">
                 <div className="DTL_IMG_BOX"><i className="fas fa-file-alt"></i></div>
                 <div className="DTL_PROD_INFO">
                    <h4>{selectedRequest.type}</h4>
                    <p>{selectedRequest.details}</p>
                    <span className="DTL_QTY">Ref: {selectedRequest.id}</span>
                 </div>
                 <div className="DTL_PRICE">{selectedRequest.price}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="DASH_FLUID_WRAPPER">
      <nav className="DASH_CLEAN_NAV">
        <div className="DASH_NAV_BRAND">
          <div className="BRAND_LOGO_CIRCLE"><i className="fas fa-shield-alt"></i></div>
          <div className="BRAND_TEXT"><span>Barangay Engineer's Hill</span><small>Resident Portal</small></div>
        </div>
        <div className="DASH_NAV_RIGHT">
          <div className="DASH_USER_MENU">
            <span className="USER_NAME">{resident?.formattedName}</span>
            <div className="USER_AVATAR_SMALL">{resident?.first_name?.charAt(0)}</div>
          </div>
          <button className="DASH_EXIT_LINK" onClick={onLogout}>Logout</button>
        </div>
      </nav>

      <main className="DASH_STAGE_MAIN">
        <section className="DASH_ORDER_TABS">
          {['Pending', 'Processing', 'Ready', 'Completed'].map((tab) => (
            <button 
              key={tab}
              className={`TAB_ITEM ${activeTab === tab ? 'ACTIVE' : ''}`} 
              onClick={() => setActiveTab(tab as TabState)}
            >
              {tab === 'Ready' ? 'Ready for Pickup' : tab === 'Completed' ? 'Resolved' : tab}
            </button>
          ))}
        </section>

        <div className="DASH_SEARCH_BAR">
          <i className="fas fa-search"></i>
          <input type="text" placeholder="Search reference number..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
        </div>

        <div className="DASH_SCROLL_CONTAINER">
          <section className="DASH_REQUEST_LIST">
            {loading ? (
              <div className="DASH_EMPTY_LIST"><p>Syncing Registry...</p></div>
            ) : (
              <>
                <Community_Blotter_view data={filterList(blotters)} onSelect={setSelectedRequest} />
                <Community_Document_view data={filterList(documents)} onSelect={setSelectedRequest} />

                {filterList(blotters).length === 0 && filterList(documents).length === 0 && (
                  <div className="DASH_EMPTY_LIST">
                    <i className="fas fa-folder-open EMPTY_ICON"></i>
                    <p>No active requests found here.</p>
                  </div>
                )}
              </>
            )}
          </section>
        </div>

        <section className="DASH_BOTTOM_ACTIONS">
           <div className="ACTION_CARD_SMALL" onClick={() => setShowBlotterModal(true)}>
             <div className="ACT_ICON_CIRCLE ORANGE"><i className="fas fa-exclamation-triangle"></i></div>
             <div className="ACT_TEXT"><h4>File Blotter</h4><p>Report Incident</p></div>
             <button className="ACT_ARROW"><i className="fas fa-chevron-right"></i></button>
           </div>
           
           <div className="ACTION_CARD_SMALL" onClick={() => setShowDocModal(true)}>
             <div className="ACT_ICON_CIRCLE BLUE"><i className="fas fa-file-signature"></i></div>
             <div className="ACT_TEXT"><h4>Request Docs</h4><p>Barangay Clearance</p></div>
             <button className="ACT_ARROW"><i className="fas fa-chevron-right"></i></button>
           </div>
        </section>
      </main>

      {renderDetailModal()}
      
      <CommunityResetPasswordModal 
        isOpen={showForceReset} 
        resident={resident} 
        onSuccess={() => setShowForceReset(false)} 
      />
      
      <Community_Blotter_Request 
        isOpen={showBlotterModal} 
        onClose={() => setShowBlotterModal(false)} 
        onSuccess={() => fetchData(resident.record_id)} 
      />

      <Community_Document_Request
        isOpen={showDocModal}
        onClose={() => setShowDocModal(false)}
        onSuccess={() => fetchData(resident.record_id)}
        residentName={resident?.formattedName}
        residentId={resident?.record_id}
      />
    </div>
  );
};

export default Community_Dashboard;