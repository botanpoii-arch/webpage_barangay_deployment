import React, { useState, useRef, useEffect } from 'react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import './styles/Document_File.css';

// --- TYPES ---
interface IDocRequest {
  id?: string;
  referenceNo: string;
  residentName: string;
  type: string;
  purpose: string;
  dateRequested: string;
  status: string;
  price: number;
  resident_id?: string;
}

interface IResident {
  record_id: string; 
  first_name: string;
  last_name: string;
  middle_name?: string;
}

interface IOfficial {
  id: string;
  full_name: string;
  position: string;
  status: string;
}

interface FileProps {
  onClose: () => void;
  onSuccess: () => void;
  data: IDocRequest;
  officials?: any[]; 
}

export const Document_File: React.FC<FileProps> = ({ onClose, onSuccess, data }) => {
  const [isSaving, setIsSaving] = useState(false);
  const [captainName, setCaptainName] = useState('HON. JUAN DELA CRUZ'); 
  const [residents, setResidents] = useState<IResident[]>([]);
  const [filteredResidents, setFilteredResidents] = useState<IResident[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedResidentId, setSelectedResidentId] = useState<string | null>(data.resident_id || null);

  // --- HELPER: FORMAT TO "Ranni L. Carian" ---
  const formatToProperName = (first: string = '', middle: string = '', last: string = '') => {
    const capitalize = (str: string) => 
      str.trim().toLowerCase().split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');

    const fName = capitalize(first);
    const lName = capitalize(last);
    
    // Middle Name -> Middle Initial (L.)
    const mInit = middle.trim() ? `${middle.trim().charAt(0).toUpperCase()}. ` : '';

    return `${fName} ${mInit}${lName}`.trim();
  };

  const generateAutoOR = () => `OR-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;
  const generateAutoCedula = () => `CCI${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`;

  const DOC_TYPES = [
    { label: 'Barangay Clearance', price: 50.00 },
    { label: 'Certificate of Indigency', price: 0.00 },
    { label: 'Business Permit', price: 500.00 },
    { label: 'Certificate of Residency', price: 50.00 },
    { label: 'Barangay ID', price: 100.00 }
  ];

  const [content, setContent] = useState({
    residentName: data.residentName || '',
    type: data.type || 'Barangay Clearance',
    purpose: data.purpose || '',
    dateIssued: new Date().toISOString().split('T')[0], 
    orNumber: generateAutoOR(),
    cedulaNumber: generateAutoCedula(),
    price: data.price || 50.00
  });

  const previewRef = useRef<HTMLDivElement>(null);
  const searchWrapperRef = useRef<HTMLDivElement>(null);
  const pdfTargetRef = useRef<HTMLDivElement>(null); 

  useEffect(() => {
    const fetchResidents = async () => {
      try {
        const res = await fetch('http://localhost:8000/api/residents');
        if (res.ok) {
          const result = await res.json();
          setResidents(Array.isArray(result) ? result : []);
        }
      } catch (err) {
        console.error("Failed to load residents", err);
      }
    };

    const fetchCaptain = async () => {
      try {
        const res = await fetch('http://localhost:8000/api/officials');
        if (res.ok) {
          const officialsData: IOfficial[] = await res.json();
          const activeCaptain = officialsData.find(o => o.position === 'Barangay Captain' && o.status === 'Active');
          if (activeCaptain) {
            setCaptainName(`HON. ${activeCaptain.full_name.toUpperCase()}`);
          }
        }
      } catch (err) {
        console.error("Failed to fetch captain", err);
      }
    };

    fetchResidents();
    fetchCaptain();

    const handleClickOutside = (event: MouseEvent) => {
      if (searchWrapperRef.current && !searchWrapperRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value;
    setContent({ ...content, residentName: input });
    setSelectedResidentId(null);

    if (input.length > 0) {
      const filtered = residents.filter(r => {
        const rawFullName = `${r.first_name} ${r.last_name}`.toLowerCase();
        return rawFullName.includes(input.toLowerCase());
      });
      setFilteredResidents(filtered);
      setShowDropdown(true);
    } else {
      setShowDropdown(false);
    }
  };

  const selectResident = (r: IResident) => {
    // AUTOMATED FORMATTING: Apply Title Case + M. Initial
    const formattedName = formatToProperName(r.first_name, r.middle_name, r.last_name);
    setContent({ ...content, residentName: formattedName });
    setSelectedResidentId(r.record_id); 
    setShowDropdown(false);
  };

  const handleTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newType = e.target.value;
    const typeInfo = DOC_TYPES.find(t => t.label === newType);
    setContent({ 
      ...content, 
      type: newType,
      price: typeInfo ? typeInfo.price : 0
    });
  };

  const getTemplateContent = () => {
    const name = content.residentName || "_________________";
    const purpose = content.purpose || "_________________";
    const dateObj = new Date(content.dateIssued);
    const displayDate = dateObj.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

    switch(content.type) {
      case 'Barangay Clearance':
        return `
          <p style="text-align: justify; text-indent: 40px; font-size: 12pt; line-height: 1.6;">To Whom It May Concern:</p>
          <br/>
          <p style="text-align: justify; text-indent: 40px; font-size: 12pt; line-height: 1.6;">This is to certify that <b>${name}</b>, of legal age, is a bona fide resident of Barangay Engineer's Hill, Baguio City.</p>
          <br/>
          <p style="text-align: justify; text-indent: 40px; font-size: 12pt; line-height: 1.6;">This certification is issued upon the request of the above-named person for the purpose of <b>${purpose.toUpperCase()}</b>.</p>
          <br/>
          <p style="text-align: justify; text-indent: 40px; font-size: 12pt; line-height: 1.6;">Issued this ${displayDate} at Baguio City, Philippines.</p>
        `;
      case 'Certificate of Indigency':
        return `
          <p style="text-align: justify; text-indent: 40px; font-size: 12pt; line-height: 1.6;">To Whom It May Concern:</p>
          <br/>
          <p style="text-align: justify; text-indent: 40px; font-size: 12pt; line-height: 1.6;">This is to certify that <b>${name}</b> belongs to an indigent family in this Barangay and is a person of good moral character.</p>
          <br/>
          <p style="text-align: justify; text-indent: 40px; font-size: 12pt; line-height: 1.6;">This certification is issued for the purpose of <b>MEDICAL/FINANCIAL ASSISTANCE</b> requirements.</p>
          <br/>
          <p style="text-align: justify; text-indent: 40px; font-size: 12pt; line-height: 1.6;">Issued this ${displayDate} at Baguio City, Philippines.</p>
        `;
      default:
        return `<p style="text-align: justify; font-size: 12pt; line-height: 1.6;">This is a standard certification for <b>${name}</b> issued on ${displayDate}.</p>`;
    }
  };

  const generatePerfectPDF = async () => {
    if (!pdfTargetRef.current) return;
    try {
      const canvas = await html2canvas(pdfTargetRef.current, {
        scale: 3, 
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgWidth = 210; 
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
      pdf.save(`${content.type.replace(/\s+/g, '_')}_${content.residentName}.pdf`);
      return true;
    } catch (err) {
      console.error("PDF Generation failed:", err);
      return false;
    }
  };

  const handleSaveAndDownload = async () => {
    if (!content.residentName) return alert("Please enter a Requestor Name.");
    setIsSaving(true);
    
    const dbPayload = {
      ...(data.id ? { id: data.id } : {}),
      resident_id: selectedResidentId || 'MANUAL_ENTRY',
      resident_name: content.residentName,
      type: content.type,
      purpose: content.purpose,
      price: content.price,
      status: 'Completed',
      reference_no: data.referenceNo || `REF-${Date.now()}`,
      date_requested: new Date().toISOString() 
    };

    try {
      const pdfSuccess = await generatePerfectPDF();
      if (!pdfSuccess) throw new Error("Failed to generate PDF file.");

      const res = await fetch('http://localhost:8000/api/documents/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dbPayload)
      });

      if (!res.ok) throw new Error('Database save failed');

      alert("Success! PDF downloaded and record saved.");
      setIsSaving(false);
      onSuccess();
      onClose();
      
    } catch (error) {
      alert("Error processing document. Please try again.");
      setIsSaving(false);
    }
  };

  return (
    <div className="DOC_GEN_OVERLAY" onClick={(e) => e.stopPropagation()}>
      <div className="DOC_GEN_TOOLBAR">
        <div className="DOC_GEN_TOOL_GROUP">
          <button onMouseDown={(e) => { e.preventDefault(); document.execCommand('bold'); }}><b>B</b></button>
          <button onMouseDown={(e) => { e.preventDefault(); document.execCommand('italic'); }}><i>I</i></button>
          <button onMouseDown={(e) => { e.preventDefault(); document.execCommand('underline'); }}><u>U</u></button>
        </div>
        <div className="DOC_GEN_TOOL_ACTIONS">
          <button className="DOC_GEN_BTN_CANCEL" onClick={onClose}>Close</button>
          <button className="DOC_GEN_BTN_SAVE" onClick={handleSaveAndDownload} disabled={isSaving}>
            {isSaving ? 'Processing...' : 'Print / Download'}
          </button>
        </div>
      </div>

      <div className="DOC_GEN_BODY">
        <div className="DOC_GEN_SIDE_PANEL">
          <div className="DOC_GEN_PANEL_HEADER">Document Details</div>
          
          <div className="DOC_GEN_INPUT_GROUP RELATIVE" ref={searchWrapperRef}>
            <label>Requestor Name</label>
            <div className="DOC_GEN_SEARCH_WRAPPER">
              <input 
                type="text"
                value={content.residentName} 
                placeholder="Search Resident..."
                onChange={handleNameChange}
                onFocus={() => content.residentName && setShowDropdown(true)}
                autoComplete="off"
              />
              <i className="fas fa-search"></i>
            </div>
            
            {showDropdown && filteredResidents.length > 0 && (
              <ul className="DOC_GEN_DROPDOWN">
                {filteredResidents.map(r => (
                  <li key={r.record_id} onClick={() => selectResident(r)}>
                    <span className="DOC_GEN_RES_NAME">
                      {formatToProperName(r.first_name, r.middle_name, r.last_name)}
                    </span>
                    <small className="DOC_GEN_RES_ID">ID: {r.record_id.substring(0,6)}...</small>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="DOC_GEN_INPUT_GROUP">
            <label>Document Type</label>
            <select value={content.type} onChange={handleTypeChange} className="DOC_GEN_SELECT">
              {DOC_TYPES.map((t, idx) => (
                <option key={idx} value={t.label}>{t.label}</option>
              ))}
            </select>
          </div>

          <div className="DOC_GEN_INPUT_GROUP">
            <label>Purpose</label>
            <input 
              value={content.purpose} 
              placeholder="e.g. Employment"
              onChange={e => setContent({...content, purpose: e.target.value})}
            />
          </div>

          <div className="DOC_GEN_INPUT_GROUP">
            <label>Date Issued</label>
            <input 
              type="date"
              value={content.dateIssued} 
              onChange={e => setContent({...content, dateIssued: e.target.value})}
            />
          </div>

          <div className="DOC_GEN_INFO_BOX">
             <small className="DOC_GEN_BLOCK_LABEL"><i className="fas fa-file-invoice"></i> <b>Details:</b></small>
             <div>
               <div>O.R.: <b>{content.orNumber}</b></div>
               <div>Cedula: <b>{content.cedulaNumber}</b></div>
               <div>Price: <b>₱{content.price.toFixed(2)}</b></div>
             </div>
          </div>
        </div>

        <div className="DOC_GEN_PREVIEW_AREA">
          <div className="DOC_GEN_A4_PAGE" ref={pdfTargetRef}>
            <div className="DOC_GEN_A4_HEADER">
              <div className="DOC_GEN_HEADER_TEXT">
                <p>Republic of the Philippines</p>
                <p>City of Baguio</p>
                <h4>BARANGAY ENGINEER'S HILL</h4>
                <p className="DOC_GEN_OFFICE">OFFICE OF THE PUNONG BARANGAY</p>
              </div>
            </div>

            <hr className="DOC_GEN_A4_LINE" />
            <h2 className="DOC_GEN_TITLE">{content.type.toUpperCase()}</h2>

            <div 
                className="DOC_GEN_A4_CONTENT"
                contentEditable
                ref={previewRef}
                dangerouslySetInnerHTML={{ __html: getTemplateContent() }}
                suppressContentEditableWarning={true}
            ></div>

            <div className="DOC_GEN_A4_FOOTER">
              <div className="DOC_GEN_SIG_BLOCK">
                <p className="DOC_GEN_SIG_NAME">{captainName}</p>
                <div className="DOC_GEN_SIG_LINE"></div>
                <p className="DOC_GEN_SIG_ROLE">Punong Barangay</p>
              </div>
            </div>

            <div className="DOC_GEN_METADATA">
              <p>O.R. No: {content.orNumber}</p>
              <p>Cedula No: {content.cedulaNumber}</p>
              <p>Date Issued: {new Date(content.dateIssued).toLocaleDateString()}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};