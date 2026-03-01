import React, { useState, useRef, useEffect } from 'react';
import './styles/Household_modal.css'; 

// --- LOCAL INTERFACES (Replaces old GraphQL hook dependency) ---
export interface HouseholdModalProps {
  onClose: () => void;
  residentList?: any[]; // Passed from parent if needed, but we fetch directly here
  onSaveSuccess?: () => void;
}

export interface IMemberForm {
  id: number; // Local UI ID for row mapping
  member_id: string; // The actual UUID from the database
  name: string;
  relation: string;
  age: string;
}

export interface IHouseholdForm {
  head_id: string; // The UUID of the family head
  headName: string;
  headAge: string;
  addressZone: string;
  ownership: string;
  waterSource: string;
  toilet: string;
  members: IMemberForm[];
}

const initialHouseholdState: IHouseholdForm = {
  head_id: '',
  headName: '',
  headAge: '',
  addressZone: '',
  ownership: 'Owned',
  waterSource: 'Deep Well',
  toilet: 'Water Sealed',
  members: []
};

// --- INTERNAL INTERFACE FOR DROPDOWNS ---
interface ISearchableResident {
  id: string; // Must hold the UUID (record_id)
  name: string;
  age: number;
  zone: string;
}

// --- SUB-COMPONENT: MEMBER ROW ---
const MemberRow = ({ member, onUpdate, onRemove, residents }: { 
  member: IMemberForm; 
  onUpdate: (id: number, field: keyof IMemberForm, value: any) => void;
  onRemove: (id: number) => void;
  residents: ISearchableResident[];
}) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const wrapperRef = useRef<HTMLTableRowElement>(null);

  const safeName = member.name || "";
  
  const filtered = residents.filter(r => 
    (r.name || "").toLowerCase().includes(safeName.toLowerCase())
  );

  useEffect(() => {
    const clickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", clickOutside);
    return () => document.removeEventListener("mousedown", clickOutside);
  }, []);

  return (
    <tr ref={wrapperRef} className="HP_TABLE_ROW">
      <td className="HP_RELATIVE_CELL">
        <div className="HP_COMBOBOX_WRAP">
          <input 
            className="HP_MEMBER_FIELD" 
            placeholder="Search..." 
            value={safeName} 
            onFocus={() => setIsDropdownOpen(true)}
            onChange={(e) => { 
              onUpdate(member.id, 'name', e.target.value); 
              onUpdate(member.id, 'member_id', ''); // Reset ID if typing manually
              setIsDropdownOpen(true); 
            }} 
          />
          {isDropdownOpen && safeName && (
            <div className="HP_DROP_RESULTS">
              {filtered.slice(0, 5).map(res => (
                <div key={res.id} className="HP_DROP_ITEM" onClick={() => { 
                  onUpdate(member.id, 'member_id', res.id); // Captures the UUID
                  onUpdate(member.id, 'name', res.name); 
                  onUpdate(member.id, 'age', res.age.toString()); 
                  setIsDropdownOpen(false); 
                }}>
                  <span className="HP_DROP_NAME">{res.name}</span>
                  <span className="HP_DROP_SUB">{res.age}yo</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </td>
      <td>
        <select 
          className="HP_MEMBER_FIELD" 
          value={member.relation || ""} 
          onChange={(e) => onUpdate(member.id, 'relation', e.target.value)}
        >
          <option value="">Relation...</option>
          <option>Spouse</option><option>Child</option><option>Parent</option><option>Sibling</option><option>Other</option>
        </select>
      </td>
      <td className="HP_AGE_DISPLAY_CELL">{member.age ? `${member.age} yo` : '-'}</td>
      <td className="HP_CENTERED_ACTION_CELL">
        <button className="HP_REMOVE_ROW_BTN" onClick={() => onRemove(member.id)}>
          <i className="fas fa-times"></i>
        </button>
      </td>
    </tr>
  );
};

// --- MAIN COMPONENT ---
function HouseHold_modal({ onClose, onSaveSuccess }: HouseholdModalProps) {
  const headDropdownRef = useRef<HTMLDivElement>(null);
  const [isHeadDropdownOpen, setIsHeadDropdownOpen] = useState(false);
  
  const [formData, setFormData] = useState<IHouseholdForm>(initialHouseholdState);
  const [isLoading, setIsLoading] = useState(false);
  
  const [residentList, setResidentList] = useState<ISearchableResident[]>([]);

  const HOUSEHOLD_API_URL = 'http://localhost:8000/api/households';
  const RESIDENTS_API_URL = 'http://localhost:8000/api/residents';

  // 1. FETCH RESIDENTS ON MOUNT
  useEffect(() => {
    const fetchResidents = async () => {
      try {
        const response = await fetch(RESIDENTS_API_URL);
        if (!response.ok) throw new Error("Failed to fetch residents");
        const data = await response.json();

        // Ensure we capture the 'record_id' (UUID) properly mapped
        const formatted: ISearchableResident[] = data.map((r: any) => {
          let age = 0;
          if (r.dob || r.dob) {
             const birth = new Date(r.dob || r.dob);
             if (!isNaN(birth.getTime())) {
               age = new Date().getFullYear() - birth.getFullYear();
             }
          }
          return {
            id: r.record_id || r.id, // Extracts the UUID
            name: `${r.last_name || r.lastName}, ${r.first_name || r.firstName}`,
            age: age,
            zone: r.purok || ""
          };
        });

        setResidentList(formatted);
      } catch (err) {
        console.error("Error fetching residents for dropdown:", err);
      }
    };

    fetchResidents();
  }, []);

  const safeHeadName = formData.headName || "";

  const filteredHead = residentList.filter(r => 
    (r.name || "").toLowerCase().includes(safeHeadName.toLowerCase())
  );

  useEffect(() => {
    const click = (e: MouseEvent) => {
      if (headDropdownRef.current && !headDropdownRef.current.contains(e.target as Node)) {
        setIsHeadDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", click);
    return () => document.removeEventListener("mousedown", click);
  }, []);

  const updateForm = (field: keyof IHouseholdForm, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const updateMember = (id: number, field: keyof IMemberForm, value: any) => {
    setFormData(prev => ({
      ...prev,
      members: prev.members.map(m => m.id === id ? { ...m, [field]: value } : m)
    }));
  };

  const removeMember = (id: number) => {
    setFormData(prev => ({
      ...prev,
      members: prev.members.filter(m => m.id !== id)
    }));
  };

  const handleSave = async () => {
    if (!formData.head_id) {
      alert("Please select a valid Family Head from the dropdown.");
      return;
    }

    setIsLoading(true);

    try {
      // Structure the payload exactly as the backend HouseholdRouter expects
      const payload = {
        head_id: formData.head_id,
        zone: formData.addressZone || 'Unassigned',
        // Combines socio-economic inputs into the address/notes column
        address: `Tenure: ${formData.ownership} | Water: ${formData.waterSource} | Toilet: ${formData.toilet}`,
        // Map members array to only include their UUIDs
        initial_members: formData.members.map(m => m.member_id).filter(id => id !== '')
      };

      const response = await fetch(HOUSEHOLD_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || `HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log("Household Saved:", result);
      
      if (onSaveSuccess) onSaveSuccess();
      onClose();

    } catch (error: any) {
      console.error("Failed to save household:", error);
      alert(error.message || "Failed to save household. Check backend console.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="HP_MODAL_OVERLAY">
      <div className="HP_MODAL_CARD">
        <div className="HP_MODAL_HEADER">
          <h2 className="HP_MODAL_TITLE">New Household Profile</h2>
          <button className="HP_MODAL_CLOSE_X" onClick={onClose}>&times;</button>
        </div>

        <div className="HP_MODAL_SCROLL_BODY">
          
          <div className="HP_FORM_SECTION">
            <div className="HP_SECTION_INDICATOR">1. Family Head</div>
            <div className="HP_FORM_GRID">
              <div className="HP_FORM_GROUP HP_GRID_FULL" ref={headDropdownRef}>
                <label className="HP_FORM_LABEL">Full Name</label>
                <div className="HP_COMBOBOX_WRAP">
                  <input 
                    className="HP_FORM_INPUT" placeholder="Search family head..."
                    value={safeHeadName} 
                    onFocus={() => setIsHeadDropdownOpen(true)}
                    onChange={(e) => { 
                      updateForm('headName', e.target.value); 
                      updateForm('head_id', ''); // Clear ID if user starts typing a mismatch
                      if (formData.headAge) updateForm('headAge', ''); 
                      if (formData.addressZone) updateForm('addressZone', ''); 
                    }} 
                  />
                  {formData.headAge && <span className="HP_INPUT_AGE_BADGE">{formData.headAge} yrs old</span>}
                  <i className="fas fa-search HP_INPUT_SEARCH_ICON"></i>

                  {isHeadDropdownOpen && safeHeadName && (
                    <div className="HP_DROP_RESULTS">
                      {filteredHead.slice(0, 5).map(res => (
                        <div key={res.id} className="HP_DROP_ITEM" onClick={() => { 
                          updateForm('head_id', res.id); // Captures the UUID
                          updateForm('headName', res.name);
                          updateForm('headAge', res.age.toString());
                          updateForm('addressZone', res.zone ? res.zone.toString() : ""); 
                          setIsHeadDropdownOpen(false); 
                        }}>
                          <span className="HP_DROP_NAME">{res.name}</span>
                          <span className="HP_DROP_SUB">{res.zone || "No Zone"} • {res.age}yo</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="HP_FORM_GROUP">
                <label className="HP_FORM_LABEL">Address Zone</label>
                <div className="HP_STATIC_FIELD">{formData.addressZone || "Auto-detected"}</div>
              </div>
              <div className="HP_FORM_GROUP">
                <label className="HP_FORM_LABEL">Tenurial Status</label>
                <select className="HP_FORM_SELECT" value={formData.ownership || "Owned"} onChange={(e) => updateForm('ownership', e.target.value)}>
                  <option>Owned</option><option>Rented</option><option>Living with Relatives</option>
                </select>
              </div>
            </div>
          </div>

          <div className="HP_FORM_SECTION">
            <div className="HP_SECTION_INDICATOR">2. Socio-Economic Data</div>
            <div className="HP_FORM_GRID">
              <div className="HP_FORM_GROUP"><label className="HP_FORM_LABEL">Water Source</label>
                <select className="HP_FORM_SELECT" value={formData.waterSource || "Deep Well"} onChange={(e) => updateForm('waterSource', e.target.value)}>
                  <option>Deep Well</option><option>Nawasa</option><option>Monthly Delivery</option>
                </select>
              </div>
              <div className="HP_FORM_GROUP"><label className="HP_FORM_LABEL">Toilet Facility</label>
                <select className="HP_FORM_SELECT" value={formData.toilet || "Water Sealed"} onChange={(e) => updateForm('toilet', e.target.value)}>
                  <option>Water Sealed</option><option>Open Pit</option><option>None</option>
                </select>
              </div>
            </div>
          </div>

          <div className="HP_FORM_SECTION">
            <div className="HP_SECTION_INDICATOR">3. Family Members</div>
            <table className="HP_MEMBERS_TABLE">
              <thead className="HP_MEMBERS_HEAD">
                <tr><th style={{width: '50%'}}>Name</th><th style={{width: '30%'}}>Relation</th><th style={{textAlign: 'center'}}>Age</th><th></th></tr>
              </thead>
              <tbody className="HP_MEMBERS_BODY">
                {formData.members.map(m => (
                  <MemberRow 
                    key={m.id} 
                    member={m} 
                    residents={residentList} 
                    onUpdate={updateMember} 
                    onRemove={removeMember} 
                  />
                ))}
              </tbody>
            </table>
            <button 
              className="HP_ADD_ROW_TRIGGER" 
              onClick={() => setFormData(prev => ({
                ...prev, 
                members: [...prev.members, { id: Date.now(), member_id: '', name: '', relation: '', age: '' }]
              }))}
            >
              + Add Member Row
            </button>
          </div>
        </div>

        <div className="HP_MODAL_FOOTER">
          <button className="HP_CANCEL_BTN" onClick={onClose}>Cancel</button>
          <button className="HP_SAVE_BTN" onClick={handleSave} disabled={isLoading}>
            {isLoading ? 'Saving...' : 'Save Complete Profile'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default HouseHold_modal;