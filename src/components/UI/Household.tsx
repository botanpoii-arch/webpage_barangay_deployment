import React, { useState, useEffect, useCallback, useMemo } from 'react';
import HouseHold_modal from '../buttons/HouseHold_modal'; 
import Household_view from '../forms/Household_view'; 
import './styles/HouseHold.css'; 

// --- CONSTANTS ---
const API_BASE_URL = 'http://localhost:8000/api';

// --- INTERFACES ---
export interface Resident {
  id: string;
  fullName: string;
  is4Ps: boolean;
  monthlyIncome: string;
  purok: string;
}

export interface Household {
  id: string; 
  head: string; 
  zone: string; 
  members: number; 
  is4Ps: boolean; 
  isIndigent: boolean; 
}

export default function HouseholdPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false); 
  const [selectedHH, setSelectedHH] = useState<string | null>(null); 
  const [editingHH, setEditingHH] = useState<any>(null); // State for editing
  
  const [activeTab, setActiveTab] = useState('All');
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const [residentList, setResidentList] = useState<Resident[]>([]);
  const [householdList, setHouseholdList] = useState<Household[]>([]);

  const refreshData = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/residents`);
      if (!response.ok) throw new Error("Failed to fetch residents");
      const rawResidents = await response.json();

      const mappedResidents: Resident[] = rawResidents.map((r: any) => ({
        id: r.record_id || r.id,
        fullName: `${r.last_name || r.lastName}, ${r.first_name || r.firstName}`,
        is4Ps: r.is_4ps || r.is4Ps || false,
        monthlyIncome: r.monthly_income || r.monthlyIncome || '0',
        purok: r.purok || 'Unknown'
      }));
      setResidentList(mappedResidents);

      const householdsMap = new Map<string, Household>();

      rawResidents.forEach((res: any) => {
        const hId = res.household_id || `${res.purok}-${res.last_name}`; 
        const isIndigent = parseInt(String(res.monthly_income || '0').replace(/\D/g, '')) < 5000;
        const is4Ps = res.is_4ps === true;

        if (!householdsMap.has(hId)) {
          householdsMap.set(hId, {
            id: hId,
            head: `${res.last_name || ''}, ${res.first_name || ''}`,
            zone: res.purok || 'Unknown',
            members: 1,
            is4Ps: is4Ps,
            isIndigent: isIndigent
          });
        } else {
          const existing = householdsMap.get(hId)!;
          existing.members += 1;
          if (is4Ps) existing.is4Ps = true;
          if (isIndigent) existing.isIndigent = true;
        }
      });

      setHouseholdList(Array.from(householdsMap.values()));

    } catch (error) {
      console.error("Data Fetch Error:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  const displayedHouseholds = useMemo(() => {
    return householdList.filter(h => {
      if (searchTerm && !h.head.toLowerCase().includes(searchTerm.toLowerCase())) {
        return false;
      }
      if (activeTab === '4Ps') return h.is4Ps;
      if (activeTab === 'Indigent') return h.isIndigent;
      return true;
    });
  }, [householdList, activeTab, searchTerm]);

  // --- HANDLERS ---
  const handleViewDetails = (id: string) => {
    setSelectedHH(id);
    setIsViewOpen(true);
  };

  const handleEditHousehold = (house: Household) => {
    setEditingHH(house);
    setIsModalOpen(true);
  };

  return (
    <div className="HP_PAGE_WRAPPER">
      <div className="HP_MAIN_CONTAINER">

        <header className="HP_PAGE_HEADER">
          <div className="HP_HEADER_TEXT_BLOCK">
            <h1 className="HP_PAGE_TITLE">Household Profiling</h1>
            <p className="HP_PAGE_SUBTITLE">RBIM-Compliant Family Records System.</p>
          </div>
          <button className="HP_ADD_NEW_BTN" onClick={() => { setEditingHH(null); setIsModalOpen(true); }}>
            <i className="fas fa-plus"></i> New Household
          </button>
        </header>

        <div className="HP_TABLE_CARD_CONTAINER">
          <div className="HP_TOOLBAR_WRAPPER">
            <div className="HP_TABS_LIST">
              <button className={`HP_TAB_TRIGGER ${activeTab === 'All' ? 'HP_TAB_ACTIVE' : ''}`} onClick={() => setActiveTab('All')}>
                All Records <span className="HP_COUNT_BADGE">{householdList.length}</span>
              </button>
              <button className={`HP_TAB_TRIGGER ${activeTab === '4Ps' ? 'HP_TAB_ACTIVE' : ''}`} onClick={() => setActiveTab('4Ps')}>4Ps</button>
              <button className={`HP_TAB_TRIGGER ${activeTab === 'Indigent' ? 'HP_TAB_ACTIVE' : ''}`} onClick={() => setActiveTab('Indigent')}>Indigent</button>
            </div>
          </div>

          <div className="HP_SEARCH_SECTION">
            <div className="HP_SEARCH_INPUT_WRAPPER">
              <i className="fas fa-search HP_SEARCH_ICON"></i>
              <input 
                className="HP_SEARCH_FIELD" 
                type="text" 
                placeholder="Search family head..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div className="HP_DATA_TABLE_WRAPPER">
            <table className="HP_HOUSE_TABLE">
              <thead className="HP_TABLE_HEAD">
                <tr>
                  <th className="HP_TH_LEFT">Family Head</th>
                  <th className="HP_TH_LEFT">Address Zone</th>
                  <th className="HP_TH_LEFT">Members</th>
                  <th className="HP_TH_LEFT">Status</th>
                  <th className="HP_TH_RIGHT" style={{textAlign: 'right'}}>Action</th>
                </tr>
              </thead>
              <tbody className="HP_TABLE_BODY">
                {isLoading ? (
                   <tr><td colSpan={5} className="HP_EMPTY_CELL" style={{textAlign: 'center', padding: '2rem'}}>Loading records...</td></tr>
                ) : displayedHouseholds.length === 0 ? (
                  <tr><td colSpan={5}><div className="HP_EMPTY_CONTAINER" style={{textAlign: 'center', padding: '3rem'}}><i className="fas fa-house-user HP_EMPTY_ICON" style={{fontSize: '3rem', color: '#cbd5e1', marginBottom: '1rem'}}></i><p style={{color: '#64748b'}}>No household records found.</p></div></td></tr>
                ) : (
                  displayedHouseholds.map((house, idx) => (
                    <tr key={house.id || idx} className="HP_TB_ROW" style={{borderBottom: '1px solid #f1f5f9'}}>
                      <td style={{padding: '1rem'}}>
                        <div className="HP_PROFILE_CELL" style={{display: 'flex', alignItems: 'center', gap: '1rem'}}>
                          <div className="HP_AVATAR_CIRCLE" style={{width: '40px', height: '40px', background: '#e2e8f0', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', color: '#475569'}}>
                            {house.head.charAt(0).toUpperCase()}
                          </div>
                          <div className="HP_NAME_BLOCK">
                            {/* CLICKABLE NAME: Shows full household information */}
                            <div 
                              className="HP_PRIMARY_NAME" 
                              onClick={() => handleViewDetails(house.id)}
                              style={{fontWeight: '600', color: '#3b82f6', cursor: 'pointer'}}
                              title="Click to view full profile"
                            >
                                {house.head}
                            </div>
                            <div className="HP_SECONDARY_TEXT" style={{fontSize: '0.8rem', color: '#64748b'}}>
                                UID: {house.id.substring(0,8)}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="HP_ZONE_TEXT" style={{padding: '1rem', color: '#475569'}}>{house.zone}</td>
                      <td style={{padding: '1rem'}}>
                        <span className="HP_MEMBER_PILL" style={{background: '#f1f5f9', padding: '4px 10px', borderRadius: '12px', fontSize: '0.85rem', fontWeight: '600', color: '#3b82f6'}}>
                          {house.members} {house.members === 1 ? 'Member' : 'Members'}
                        </span>
                      </td>
                      <td style={{padding: '1rem'}}>
                        <div className="HP_BADGE_CONTAINER" style={{display: 'flex', gap: '6px'}}>
                          {house.is4Ps && <span className="HP_BADGE HP_BADGE_4PS" style={{background: '#ffedd5', color: '#b45309', padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold'}}>4Ps</span>}
                          {house.isIndigent && <span className="HP_BADGE HP_BADGE_INDIGENT" style={{background: '#fce7f3', color: '#be185d', padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold'}}>Indigent</span>}
                          {!house.is4Ps && !house.isIndigent && <span className="HP_BADGE HP_BADGE_NONE" style={{background: '#f1f5f9', color: '#94a3b8', padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold'}}>N/A</span>}
                        </div>
                      </td>
                      <td style={{padding: '1rem', textAlign: 'right'}}>
                        <div className="HP_ACTION_CELL_GROUP" style={{display: 'flex', gap: '8px', justifyContent: 'flex-end'}}>
                          {/* UPDATED ACTION: Edit button */}
                          <button 
                            className="HP_ACTION_ICON_BTN" 
                            title="Edit Household" 
                            onClick={() => handleEditHousehold(house)}
                            style={{background: 'none', border: 'none', color: '#d97706', cursor: 'pointer', fontSize: '1.1rem'}}
                          >
                            <i className="fas fa-edit"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* --- MODALS --- */}
        {isModalOpen && (
          <HouseHold_modal 
            onClose={() => setIsModalOpen(false)} 
            residentList={residentList} 
            onSaveSuccess={refreshData}
          />
        )}

        {isViewOpen && selectedHH && (
            <Household_view 
                householdId={selectedHH} 
                onClose={() => { setIsViewOpen(true); setSelectedHH(null); }} 
            />
        )}

      </div>
    </div>
  );
}