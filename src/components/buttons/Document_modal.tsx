import React from 'react';
import './styles/Document_modal.css';
import { Document_File } from './Tools/Document_tools/Document_Files'; 

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function Document_modal({ isOpen, onClose, onSuccess }: Props) {
  if (!isOpen) return null;

  // --- INITIAL DATA ---
  const initialData = {
    referenceNo: `WALK-IN-${Date.now().toString().slice(-6)}`,
    residentName: '',
    type: 'Barangay Clearance', 
    purpose: '',
    dateRequested: new Date().toISOString(),
    status: 'Pending',
    price: 100
  };

  const officials = [
    { position: 'Barangay Captain', full_name: 'HON. JUAN DELA CRUZ' }
  ];

  return (
    <div className="STUDIO_MODAL_OVERLAY">
      <div className="STUDIO_CONTAINER">
        {/* The Document_File component is now wrapped in a container 
            that prevents it from distorting. 
        */}
        <div className="STUDIO_EDITOR_WRAPPER">
          <Document_File 
            onClose={onClose} 
            onSuccess={onSuccess} // Added to ensure list refreshes
            data={initialData} 
            officials={officials} 
          />
        </div>
      </div>
    </div>
  );
}