import React, { useState, useEffect, useMemo } from 'react';
import Officials_modal from '../buttons/Officials_modal';
import './styles/Officials.css'; 

interface IOfficial {
  id: string;
  full_name: string;
  position: 'Barangay Captain' | 'Barangay Secretary' | 'Barangay Treasurer' | 'Kagawad' | 'SK Chairperson';
  term_start: string;
  term_end: string;
  status: 'Active' | 'End of Term' | 'Resigned';
  contact_number?: string;
}

export default function OfficialsPage() {
  const [officials, setOfficials] = useState<IOfficial[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [officialToEdit, setOfficialToEdit] = useState<IOfficial | null>(null);

  const API_URL = 'http://localhost:8000/api/officials';

  const fetchOfficials = async () => {
    setLoading(true);
    try {
      const res = await fetch(API_URL);
      if (res.ok) {
        const data = await res.json();
        setOfficials(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOfficials();
  }, []);

  const handleAddNew = () => {
    setOfficialToEdit(null);
    setIsModalOpen(true);
  };

  const handleEdit = (off: IOfficial) => {
    setOfficialToEdit(off);
    setIsModalOpen(true);
  };

  // ==========================================
  // FIXED: NULL-SAFE SEARCH FILTER
  // ==========================================
  const filteredOfficials = useMemo(() => {
    // 1. If the search bar is empty, don't waste power filtering; return all.
    if (!searchTerm.trim()) return officials;

    const lowerSearch = searchTerm.toLowerCase();

    return officials.filter(o => {
      // 2. Fallbacks (|| '') ensure that if a DB value is null, it becomes an empty string
      // This prevents .toLowerCase() from crashing your React component
      const safeName = (o.full_name || '').toLowerCase();
      const safePosition = (o.position || '').toLowerCase();

      return safeName.includes(lowerSearch) || safePosition.includes(lowerSearch);
    });
  }, [officials, searchTerm]);

  return (
    <div className="OFFIC_PAGE_WRAP">
      <div className="OFFIC_MAIN_CONTAINER">
        
        <div className="OFFIC_HEADER_FLEX">
          <div className="OFFIC_TITLE_GROUP">
            <h1 className="OFFIC_PAGE_TITLE">Barangay Officials</h1>
            <p className="OFFIC_PAGE_SUB">Manage elected and appointed officials.</p>
          </div>
          <button className="OFFIC_ADD_BTN" onClick={handleAddNew}>
            <i className="fas fa-user-plus"></i> Add Official
          </button>
        </div>

        <div className="OFFIC_TABLE_CONTAINER">
          <div className="OFFIC_SEARCH_ROW">
            <div className="OFFIC_SEARCH_INPUT_WRAP">
              <i className="fas fa-search OFFIC_SEARCH_ICON"></i>
              <input 
                className="OFFIC_SEARCH_INPUT" 
                placeholder="Search name or position..." 
                value={searchTerm} 
                onChange={(e) => setSearchTerm(e.target.value)} 
              />
            </div>
          </div>

          <div className="OFFIC_TABLE_WRAP">
            <table className="OFFIC_TABLE_MAIN">
              <thead>
                <tr>
                  <th>NAME</th>
                  <th>POSITION</th>
                  <th>TERM START</th>
                  <th>STATUS</th>
                  <th className="OFFIC_TEXT_RIGHT">ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                   <tr><td colSpan={5} className="OFFIC_TABLE_LOAD">Loading...</td></tr>
                ) : filteredOfficials.length === 0 ? (
                   <tr><td colSpan={5} className="OFFIC_TABLE_EMPTY">No officials found.</td></tr>
                ) : (
                  filteredOfficials.map((off) => (
                    <tr key={off.id}>
                      <td className="OFFIC_NAME_CELL">
                        <div className="OFFIC_AVATAR_FLEX">
                          <div className={`OFFIC_AVATAR_CIRCLE ${off.position === 'Barangay Captain' ? 'CAPTAIN' : 'STAFF'}`}>
                            {/* Null-safe character grab */}
                            {(off.full_name || 'X').charAt(0)}
                          </div>
                          {off.full_name}
                        </div>
                      </td>
                      <td>{off.position}</td>
                      <td>{off.term_start || 'N/A'}</td>
                      <td>
                        <span className={`OFFIC_STATUS_BADGE ${off.status === 'Active' ? 'ACTIVE' : 'INACTIVE'}`}>
                          {off.status}
                        </span>
                      </td>
                      <td className="OFFIC_ACTIONS_CELL">
                        <button className="OFFIC_ACTION_ICON EDIT" onClick={() => handleEdit(off)} title="Edit">
                          <i className="fas fa-pen"></i>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <Officials_modal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => { fetchOfficials(); }}
        officialToEdit={officialToEdit}
        existingOfficials={officials}
      />
    </div>
  );
}