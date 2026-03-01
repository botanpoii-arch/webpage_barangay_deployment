import React, { useState, useEffect } from 'react';
import './styles/Resident_modal.css';

export interface IResident {
  id?: string;
  lastName: string;
  firstName: string;
  middleName: string;
  sex: 'Male' | 'Female';
  genderIdentity: 'Men' | 'Women' | 'LGBTQ+';
  dob: string; 
  birthPlace: string;
  nationality: string;
  contactNumber: string;
  email: string;
  currentAddress: string;
  purok: string;
  civilStatus: string;
  religion: string;
  education: string;
  employment: string;
  occupation: string;
  monthlyIncome: string;
  housingType: string;
  activityStatus: 'Active' | 'Inactive' | 'Leave';
  isVoter: boolean;
  isPWD: boolean;
  is4Ps: boolean;
  isSoloParent: boolean;
  isSeniorCitizen: boolean;
  isIP: boolean;
  pwdIdNumber?: string;
  soloParentIdNumber?: string;
  seniorIdNumber?: string;
  fourPsIdNumber?: string;
}

interface ResidentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  residentData: IResident | null;
}

const initialState: IResident = {
  lastName: '', firstName: '', middleName: '',
  sex: 'Male', genderIdentity: 'Men', dob: '', birthPlace: '', nationality: 'Filipino',
  contactNumber: '09', email: '', currentAddress: '', purok: '',
  civilStatus: 'Single', religion: '',
  education: 'None', employment: 'Unemployed', occupation: '', monthlyIncome: 'Below ₱5,000',
  housingType: 'Owned House', activityStatus: 'Active',
  isVoter: false, isPWD: false, is4Ps: false, isSoloParent: false, isSeniorCitizen: false, isIP: false,
  pwdIdNumber: '', soloParentIdNumber: '', seniorIdNumber: '', fourPsIdNumber: ''
};

export const ResidentModal: React.FC<ResidentModalProps> = ({ 
  isOpen, onClose, onSuccess, residentData 
}) => {
  const [formData, setFormData] = useState<IResident>(initialState);
  const [isLoading, setIsLoading] = useState(false);
  const API_URL = 'http://localhost:8000/api/residents';

  useEffect(() => {
    if (isOpen) {
      if (residentData) {
        const formattedDob = residentData.dob ? new Date(residentData.dob).toISOString().split('T')[0] : '';
        setFormData({ ...residentData, dob: formattedDob });
      } else {
        setFormData(initialState);
      }
    }
  }, [isOpen, residentData]);

  const handleChange = (field: keyof IResident, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const required = ['lastName', 'firstName', 'dob', 'currentAddress', 'purok'];
    if (required.some(key => !formData[key as keyof IResident])) return alert("Please fill in required fields.");
    
    // Manual ID Validations
    if (formData.isPWD && !formData.pwdIdNumber) return alert("Manual Entry Required: PWD ID Number.");
    if (formData.isSoloParent && !formData.soloParentIdNumber) return alert("Manual Entry Required: Solo Parent ID Number.");
    if (formData.isSeniorCitizen && !formData.seniorIdNumber) return alert("Manual Entry Required: Senior Citizen ID Number.");
    if (formData.is4Ps && !formData.fourPsIdNumber) return alert("Manual Entry Required: 4Ps ID Number.");

    setIsLoading(true);
    try {
      const method = formData.id ? 'PUT' : 'POST';
      const url = formData.id ? `${API_URL}/${formData.id}` : API_URL;
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      
      const result = await res.json();
      
      if (res.status === 409) return alert(`Conflict: ${result.error}`);
      if (!res.ok) throw new Error(result.error || 'Server Error');

      // --- ACCOUNT AUTOMATION FEEDBACK RESTORED ---
      if (method === 'POST' && result.account) {
        alert(`
          Resident Registered Successfully!
          
          SYSTEM AUTO-GENERATED ACCOUNT:
          -----------------------------------
          Username: ${result.account.username}
          Password: ${result.account.password}
          -----------------------------------
          Please provide these credentials to the resident.
        `);
      } else {
        alert(formData.id ? 'Profile updated successfully.' : 'Resident registered successfully.');
      }

      onSuccess(); 
      onClose();
    } catch (err: any) { 
      alert(`Error: ${err.message}`); 
    } finally { 
      setIsLoading(false); 
    }
  };

  if (!isOpen) return null;

  return (
    <div className="RMS_OVERLAY" onClick={onClose}>
      <div className="RMS_CARD" onClick={e => e.stopPropagation()}>
        <div className="RMS_HEADER">
          <h2>{residentData ? 'Update Resident Profile' : 'Resident Registration'}</h2>
          <button className="RMS_CLOSE_X" onClick={onClose}>&times;</button>
        </div>

        <form className="RMS_FORM" onSubmit={handleSubmit}>
          <div className="RMS_BODY">
            
            <div className="RMS_SECTION">
              <div className="RMS_SEC_TITLE">Personal Identity</div>
              <div className="RMS_GRID">
                <div className="RMS_GROUP"><label className="RMS_LABEL">Last Name *</label>
                  <input className="RMS_INPUT" value={formData.lastName} onChange={e => handleChange('lastName', e.target.value)} required />
                </div>
                <div className="RMS_GROUP"><label className="RMS_LABEL">First Name *</label>
                  <input className="RMS_INPUT" value={formData.firstName} onChange={e => handleChange('firstName', e.target.value)} required />
                </div>
                <div className="RMS_GROUP"><label className="RMS_LABEL">Middle Name</label>
                  <input className="RMS_INPUT" value={formData.middleName} onChange={e => handleChange('middleName', e.target.value)} />
                </div>
                
                <div className="RMS_GROUP"><label className="RMS_LABEL">Sex at Birth *</label>
                  <select className="RMS_INPUT" value={formData.sex} onChange={e => handleChange('sex', e.target.value)}>
                    <option value="Male">Male</option><option value="Female">Female</option>
                  </select>
                </div>

                <div className="RMS_GROUP"><label className="RMS_LABEL">Gender Identity *</label>
                  <select className="RMS_INPUT" value={formData.genderIdentity} onChange={e => handleChange('genderIdentity', e.target.value)}>
                    <option value="Men">Men</option>
                    <option value="Women">Women</option>
                    <option value="LGBTQ+">LGBTQ+</option>
                  </select>
                </div>

                <div className="RMS_GROUP"><label className="RMS_LABEL">Date of Birth *</label>
                  <input type="date" className="RMS_INPUT" value={formData.dob} onChange={e => handleChange('dob', e.target.value)} required />
                </div>
                <div className="RMS_GROUP"><label className="RMS_LABEL">Religion</label>
                  <input className="RMS_INPUT" value={formData.religion} onChange={e => handleChange('religion', e.target.value)} />
                </div>
                <div className="RMS_GROUP"><label className="RMS_LABEL">Nationality</label>
                  <input className="RMS_INPUT" value={formData.nationality} onChange={e => handleChange('nationality', e.target.value)} />
                </div>
              </div>
            </div>

            <div className="RMS_SECTION">
              <div className="RMS_SEC_TITLE">Classifications & IDs</div>
              <div className="RMS_CHECK_GRID">
                {[
                  {k:'isVoter', l:'Voter'}, {k:'isPWD', l:'PWD'}, {k:'is4Ps', l:'4Ps'}, 
                  {k:'isSoloParent', l:'Solo Parent'}, {k:'isSeniorCitizen', l:'Senior Citizen'}, {k:'isIP', l:'IP'}
                ].map(item => (
                  <label key={item.k} className="RMS_CHECK_ITEM">
                    <input type="checkbox" checked={!!formData[item.k as keyof IResident]} onChange={e => handleChange(item.k as keyof IResident, e.target.checked)} />
                    <span>{item.l}</span>
                  </label>
                ))}
              </div>

              {(formData.isPWD || formData.isSoloParent || formData.isSeniorCitizen || formData.is4Ps) && (
                <div className="RMS_ID_CONTAINER">
                  {formData.isPWD && (
                    <div className="RMS_GROUP"><label className="RMS_LABEL">PWD ID Number *</label>
                      <input className="RMS_INPUT" placeholder="Enter ID" value={formData.pwdIdNumber} onChange={e => handleChange('pwdIdNumber', e.target.value)} />
                    </div>
                  )}
                  {formData.isSoloParent && (
                    <div className="RMS_GROUP"><label className="RMS_LABEL">Solo Parent ID *</label>
                      <input className="RMS_INPUT" placeholder="Enter ID" value={formData.soloParentIdNumber} onChange={e => handleChange('soloParentIdNumber', e.target.value)} />
                    </div>
                  )}
                  {formData.isSeniorCitizen && (
                    <div className="RMS_GROUP"><label className="RMS_LABEL">Senior Citizen ID *</label>
                      <input className="RMS_INPUT" placeholder="Enter ID" value={formData.seniorIdNumber} onChange={e => handleChange('seniorIdNumber', e.target.value)} />
                    </div>
                  )}
                  {formData.is4Ps && (
                    <div className="RMS_GROUP"><label className="RMS_LABEL">4Ps ID Number *</label>
                      <input className="RMS_INPUT" placeholder="Enter ID" value={formData.fourPsIdNumber} onChange={e => handleChange('fourPsIdNumber', e.target.value)} />
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="RMS_SECTION">
              <div className="RMS_SEC_TITLE">Residence & Contact</div>
              <div className="RMS_GRID">
                <div className="RMS_GROUP RMS_SPAN2"><label className="RMS_LABEL">Current Address *</label>
                  <input className="RMS_INPUT" value={formData.currentAddress} onChange={e => handleChange('currentAddress', e.target.value)} required />
                </div>
                <div className="RMS_GROUP"><label className="RMS_LABEL">Purok *</label>
                  <select className="RMS_INPUT" value={formData.purok} onChange={e => handleChange('purok', e.target.value)} required>
                    <option value="">Select Purok</option>{[1,2,3,4,5,6,7].map(p => <option key={p} value={`Purok ${p}`}>Purok {p}</option>)}
                  </select>
                </div>
                <div className="RMS_GROUP"><label className="RMS_LABEL">Contact Number</label>
                  <input className="RMS_INPUT" value={formData.contactNumber} onChange={e => handleChange('contactNumber', e.target.value)} />
                </div>
              </div>
            </div>
          </div>

          <div className="RMS_FOOTER">
            <button type="button" className="RMS_BTN_CANCEL" onClick={onClose}>Cancel</button>
            <button type="submit" className="RMS_BTN_SUBMIT" disabled={isLoading}>{isLoading ? 'Saving...' : 'Confirm Registration'}</button>
          </div>
        </form>
      </div>
    </div>
  );
};