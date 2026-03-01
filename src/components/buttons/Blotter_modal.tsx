import React from 'react';
import { FileComponent } from './Tools/Blotter_File'; // Inilipat ang formatting sa FILE.tsx base sa instruction
import './styles/Blotter_modal.css'; // Base sa image_530977.png

interface IBlotterCase {
  id?: string;
  caseNumber: string;
  complainantId: string;
  complainantName: string;
  respondent: string;
  type: string;
  status: 'Active' | 'Hearing' | 'Settled' | 'Archived';
  dateFiled: string;
  timeFiled: string;
  source: 'Walk-in' | 'Online';
  narrative: string;
}

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRefresh: () => void;
  selectedCase: IBlotterCase | null;
  officials: any[]; 
}

/**
 * BlotterModal
 * Entry point na sumusunod sa structure ng FILE.TSX at TOOLS.TS
 */
export const BlotterModal: React.FC<ModalProps> = ({ 
  isOpen, 
  onClose, 
  onRefresh, 
  selectedCase, 
  officials 
}) => {
  
  if (!isOpen) return null;

  return (
    <div className="BLOT_MODAL_OVERLAY" onClick={onClose}>
      {/* Ang lahat ng formatting, preview, at search logic ay nasa loob 
          na ng FileComponent (FILE.tsx) base sa iyong diagram.
      */}
      <FileComponent 
        onClose={onClose}
        onRefresh={onRefresh}
        selectedCase={selectedCase}
        officials={officials}
      />
    </div>
  );
};