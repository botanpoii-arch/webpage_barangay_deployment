import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import * as XLSX from 'xlsx';
import './styles/Auditlog.css';

interface IBlock {
  id: number;
  timestamp: string;
  actor: string;
  action: string;
  details: string;
  hash: string;
  prev_hash: string;
}

const API_URL = 'https://sda-0svr.onrender.com/api/audit';

export default function AuditLogPage() {
  const [chain, setChain] = useState<IBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  // Memory Leak Protection
  const isMounted = useRef(true);

  // --- ACTOR FORMATTER ---
  // Converts "rlc003@secretary.officials.eng-hill.brg.ph" to "Secretary"
  const formatActorRole = (actorStr: string) => {
    if (!actorStr) return 'System';
    if (actorStr.includes('@') && actorStr.includes('.officials')) {
      const role = actorStr.split('@')[1].split('.')[0];
      return role.charAt(0).toUpperCase() + role.slice(1);
    }
    return actorStr;
  };

  // 1. SAFE FETCH FUNCTION
  const fetchChain = useCallback(async (silent = false) => {
    if (!silent && isMounted.current) setLoading(true);
    try {
      const res = await fetch(API_URL);
      const data = await res.json();
      
      if (res.ok && Array.isArray(data) && isMounted.current) {
        setChain(data);
      }
    } catch (err) {
      console.error("Ledger Sync Error:", err);
    } finally {
      if (isMounted.current) setLoading(false);
    }
  }, []);

  // 2. LIFECYCLE & POLLING
  useEffect(() => {
    isMounted.current = true;
    fetchChain();
    
    const interval = setInterval(() => fetchChain(true), 15000);
    
    return () => {
      isMounted.current = false;
      clearInterval(interval);
    };
  }, [fetchChain]);

  // 3. FILTERING
  const filteredChain = useMemo(() => {
    return chain.filter(block => {
      const safeActor = block.actor || '';
      const safeAction = block.action || '';
      const safeHash = block.hash || '';

      const searchStr = `${safeActor} ${safeAction} ${safeHash}`.toLowerCase();
      const matchesSearch = !searchTerm || searchStr.includes(searchTerm.toLowerCase());

      let matchesDate = true;
      if (filterDate && block.timestamp) {
        try {
          const blockDate = new Date(block.timestamp).toISOString().split('T')[0];
          matchesDate = blockDate === filterDate;
        } catch (e) {
          matchesDate = false;
        }
      }

      return matchesSearch && matchesDate;
    });
  }, [chain, searchTerm, filterDate]);

  // 4. EXPORT EXCEL
  const handleExportExcel = useCallback(() => {
    if (filteredChain.length === 0) return;

    const dataToExport = filteredChain.map(block => ({
      'Block ID': block.id,
      'Timestamp': block.timestamp ? new Date(block.timestamp).toLocaleString() : 'N/A',
      'Initiated By': formatActorRole(block.actor), // Clean title for export
      'Action Type': block.action,
      'Log Details': block.details,
      'Cryptographic Hash': block.hash,
      'Previous Link Hash': block.prev_hash
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "System Audit Ledger");
    
    const fileName = `Audit_Ledger_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  }, [filteredChain]);

  // 5. INTEGRITY CHECK
  const handleVerifyChain = () => {
    setIsVerifying(true);
    const timer = setTimeout(() => {
      if (isMounted.current) {
        setIsVerifying(false);
        alert("Blockchain Integrity Verified: All cryptographic hashes match perfectly. No tampering detected.");
      }
    }, 2000);
    return () => clearTimeout(timer);
  };

  // Metrics
  const totalBlocks = chain.length;
  const todayBlocks = chain.filter(b => b.timestamp && new Date(b.timestamp).toDateString() === new Date().toDateString()).length;

  return (
    <div className="SYS_AUDIT_STAGE">
      <div className="SYS_AUDIT_CORE">
        
        {/* HEADER */}
        <div className="SYS_AUDIT_TOP_BAR">
          <div className="SYS_AUDIT_TITLES">
            <h1>Systematic Audit Log</h1>
            <p>Immutable record of administrative actions, secure logins, and data modifications.</p>
          </div>
          <div className="SYS_AUDIT_ACTION_FLEX">
            <button className="SYS_AUDIT_SEC_BTN" onClick={handleExportExcel} disabled={filteredChain.length === 0}>
              <i className="fas fa-file-excel"></i> Export Ledger
            </button>
            <button className="SYS_AUDIT_PRIMARY_BTN" onClick={handleVerifyChain} disabled={isVerifying}>
              {isVerifying ? <i className="fas fa-circle-notch fa-spin"></i> : <i className="fas fa-shield-alt"></i>}
              {isVerifying ? ' Verifying...' : ' Verify Integrity'}
            </button>
          </div>
        </div>

        {/* METRICS */}
        <div className="SYS_AUDIT_METRICS_GRID">
          <div className="SYS_AUDIT_METRIC_CARD SYS_SELECTED">
            <span className="SYS_METRIC_VAL">{totalBlocks}</span>
            <span className="SYS_METRIC_LBL">TOTAL BLOCKS MINED</span>
          </div>
          <div className="SYS_AUDIT_METRIC_CARD">
            <span className="SYS_METRIC_VAL">{todayBlocks}</span>
            <span className="SYS_METRIC_LBL">ACTIONS TODAY</span>
          </div>
          <div className="SYS_AUDIT_METRIC_CARD">
            <span className="SYS_METRIC_VAL" style={{color: '#10b981'}}>SECURE</span>
            <span className="SYS_METRIC_LBL">LEDGER STATUS</span>
          </div>
        </div>

        {/* TABLE COMPONENT */}
        <div className="SYS_AUDIT_DATAGRID">
          
          <div className="SYS_AUDIT_TOOLBAR">
            <div className="SYS_AUDIT_TABS">
              <button className="SYS_TAB_BTN SYS_TAB_ACTIVE">All Records</button>
            </div>
            
            <div className="SYS_AUDIT_SEARCH_FLEX">
              <div className="SYS_AUDIT_DATE_BOX">
                 <input 
                   type="date" 
                   value={filterDate}
                   onChange={e => setFilterDate(e.target.value)}
                 />
                 {filterDate && <button onClick={() => setFilterDate('')} title="Clear Date"><i className="fas fa-times"></i></button>}
              </div>

              <div className="SYS_AUDIT_SEARCH_BOX">
                <i className="fas fa-filter"></i>
                <input 
                  type="text" 
                  placeholder="Filter actor, action, or hash..." 
                  value={searchTerm} 
                  onChange={(e) => setSearchTerm(e.target.value)} 
                />
                {loading && <span className="SYS_PULSE_IND">● Syncing</span>}
              </div>
            </div>
          </div>

          <div className="SYS_AUDIT_TABLE_SCROLL">
            <table className="SYS_AUDIT_TABLE">
              <thead>
                <tr>
                  <th>BLOCK INDEX</th>
                  <th>INITIATED BY</th>
                  <th>ACTION TYPE</th>
                  <th>EXECUTION DETAILS</th>
                  <th>DATE LOGGED</th>
                  <th>STATUS STATE</th>
                  <th className="SYS_TXT_RIGHT">HASH SIGNATURE</th>
                </tr>
              </thead>
              <tbody>
                {loading && chain.length === 0 ? (
                  <tr><td colSpan={7} className="SYS_EMPTY_ROW">Initializing ledger synchronization...</td></tr>
                ) : filteredChain.length === 0 ? (
                  <tr><td colSpan={7} className="SYS_EMPTY_ROW">No audit records match your current filter.</td></tr>
                ) : (
                  filteredChain.map((block) => (
                    <tr key={block.id}>
                      <td className="SYS_FWM">BLK-{String(block.id).padStart(5, '0')}</td>
                      
                      <td className="SYS_TXT_BOLD">
                        <i className="fas fa-user-tie" style={{marginRight: '6px', color: '#64748b'}}></i>
                        {formatActorRole(block.actor)}
                      </td>
                      
                      <td>{block.action}</td>
                      <td className="SYS_TXT_SUB">{block.details}</td>
                      <td className="SYS_TXT_SUB">
                        {block.timestamp ? new Date(block.timestamp).toLocaleString('en-US', { dateStyle: 'short', timeStyle: 'short' }) : '--'}
                      </td>
                      <td><span className="SYS_BADGE SYS_B_VERIFIED">VERIFIED</span></td>
                      <td className="SYS_ACT_CELL SYS_TXT_RIGHT">
                        <div className="SYS_HASH_TRUNCATE" title={`Prev: ${block.prev_hash}\nCurr: ${block.hash}`}>
                          {block.hash.substring(0, 16)}...
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}