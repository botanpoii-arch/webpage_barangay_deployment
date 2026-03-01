import React, { useState, useEffect, useMemo, useRef } from 'react';
import Document_view from '../forms/Document_view'; 
import Document_modal from '../buttons/Document_modal'; 
import './styles/Document.css';

export interface IDocRequest {
  id: string;
  referenceNo: string;
  residentName: string;
  type: string;
  purpose: string;
  otherPurpose?: string;
  dateRequested: string;
  status: 'Pending' | 'Processing' | 'Ready' | 'Completed' | 'Rejected';
  price: number;
}

const API_URL = 'http://localhost:8000/api/documents';

export default function DocumentsPage() {
  const [requests, setRequests] = useState<IDocRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'Pending' | 'Processing' | 'Ready' | 'History'>('Pending');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDoc, setSelectedDoc] = useState<IDocRequest | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  
  const prevCountRef = useRef(0);
  const [newRequestCount, setNewRequestCount] = useState(0);

  const fetchRequests = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await fetch(API_URL);
      if (!res.ok) throw new Error('System offline. Cannot sync requests.');
      const rawData = await res.json();

      // ALIGNED: Maps backend snake_case to the frontend interface
      const mappedData = rawData.map((d: any) => ({
        id: d.id || d.record_id, // Safety check for different ID names
        referenceNo: d.reference_no || d.referenceNo || 'REF-N/A',
        residentName: d.resident_name || d.residentName || 'Unknown Resident',
        type: d.type,
        purpose: d.purpose,
        otherPurpose: d.other_purpose || d.otherPurpose,
        dateRequested: d.date_requested || d.dateRequested || new Date().toISOString(),
        status: d.status,
        price: d.price
      }));

      setRequests(mappedData);

      // Notification Logic for real-time alerts
      if (mappedData.length > prevCountRef.current && prevCountRef.current !== 0) {
        const diff = mappedData.length - prevCountRef.current;
        if (diff > 0) {
           setNewRequestCount(diff);
           setTimeout(() => setNewRequestCount(0), 5000);
        }
      }
      prevCountRef.current = mappedData.length;
      setError('');
    } catch (err: any) {
      console.error("Fetch Error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
    // Auto-poll for new requests every 15 seconds
    const interval = setInterval(() => fetchRequests(true), 15000);
    return () => clearInterval(interval);
  }, []);

  const filteredDocs = useMemo(() => {
    return requests.filter(doc => {
      const rName = (doc.residentName || '').toLowerCase();
      const rRef = (doc.referenceNo || '').toLowerCase();
      const sTerm = searchTerm.toLowerCase();

      const matchesSearch = rName.includes(sTerm) || rRef.includes(sTerm);

      if (activeTab === 'History') {
        return matchesSearch && (doc.status === 'Completed' || doc.status === 'Rejected');
      }
      return matchesSearch && doc.status === activeTab;
    });
  }, [requests, activeTab, searchTerm]);

  const handleRefresh = () => {
    fetchRequests(true);
    setIsViewModalOpen(false);
    setIsManualModalOpen(false);
    setSelectedDoc(null);
  };

  return (
    <div className="DOC_PAGE_LAYOUT">
      
      {/* 1. TOP HEADER */}
      <div className="DOC_TOP_BAR">
        <div className="DOC_TITLE_GROUP">
          <h1>Document Requests</h1>
          <p>Manage clearances, permits, and certifications.</p>
        </div>
        <button className="DOC_MANUAL_CREATE_BTN" onClick={() => setIsManualModalOpen(true)}>
          <i className="fas fa-plus-circle"></i> Create Manually
        </button>
      </div>

      {/* 2. KPI STATS ROW */}
      <div className="DOC_STATS_GRID">
        {['Pending', 'Processing', 'Ready'].map(s => (
          <div key={s} className="DOC_STAT_CARD">
            <span className="DOC_STAT_VAL">{requests.filter(r => r.status === s).length}</span>
            <span className="DOC_STAT_LABEL">{s.toUpperCase()}</span>
          </div>
        ))}
      </div>

      {/* 3. CONTROLS BAR */}
      <div className="DOC_CONTROLS_BAR">
        <div className="DOC_TAB_GROUP">
          {['Pending', 'Processing', 'Ready', 'History'].map(tab => (
            <button key={tab} className={`DOC_TAB_ITEM ${activeTab === tab ? 'ACTIVE' : ''}`} onClick={() => setActiveTab(tab as any)}>
              {tab}
            </button>
          ))}
        </div>
        <div className="DOC_SEARCH_FIELD">
          <i className="fas fa-search"></i>
          <input type="text" placeholder="Search name or ref #..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
        </div>
      </div>

      {/* 4. DATA TABLE */}
      <div className="DOC_TABLE_CONTAINER">
        <table className="DOC_TABLE_CORE">
          <thead>
            <tr>
              <th>REF ID</th>
              <th>RESIDENT</th>
              <th>TYPE</th>
              <th>DATE</th>
              <th>STATUS</th>
              <th style={{textAlign: 'right'}}>ACTION</th>
            </tr>
          </thead>
          <tbody>
            {loading && !requests.length ? (
              <tr><td colSpan={6} className="MSG_ROW">Syncing records...</td></tr>
            ) : error ? (
              <tr><td colSpan={6} className="MSG_ROW ERROR">{error}</td></tr>
            ) : filteredDocs.length === 0 ? (
              <tr><td colSpan={6} className="MSG_ROW">No records matching your search.</td></tr>
            ) : (
              filteredDocs.map(doc => (
                <tr key={doc.id} onClick={() => { setSelectedDoc(doc); setIsViewModalOpen(true); }} className="DOC_ROW_CLICK">
                  <td><span className="DOC_REF_BADGE">{doc.referenceNo}</span></td>
                  <td><strong>{doc.residentName}</strong></td>
                  <td>{doc.type}</td>
                  <td>{new Date(doc.dateRequested).toLocaleDateString()}</td>
                  <td><span className={`DOC_STATUS_PILL ${doc.status}`}>{doc.status}</span></td>
                  <td style={{textAlign: 'right'}}><i className="fas fa-chevron-right" style={{color: '#cbd5e1'}}></i></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* MODALS */}
      {selectedDoc && (
        <Document_view 
          isOpen={isViewModalOpen} 
          onClose={() => setIsViewModalOpen(false)} 
          onUpdate={handleRefresh} 
          data={selectedDoc} 
        />
      )}
      
      <Document_modal 
        isOpen={isManualModalOpen} 
        onClose={() => setIsManualModalOpen(false)} 
        onSuccess={handleRefresh} 
      />

      {/* New Request Notification Toast */}
      {newRequestCount > 0 && (
        <div className="DOC_ALARM_TOAST">
          <i className="fas fa-bell"></i> {newRequestCount} New Requests
        </div>
      )}
    </div>
  );
}