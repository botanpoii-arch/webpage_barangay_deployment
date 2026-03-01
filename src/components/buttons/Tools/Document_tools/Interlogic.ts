import { jsPDF } from 'jspdf';

// ... (Your existing generateBlotterPDF code remains here) ...

/**
 * PDF Generator for Document Requests (Clearance, Indigency, etc.)
 * Adapted from generateBlotterPDF logic.
 */
export const generateDocumentPDF = (data: any, officials: any[]) => {
    const doc = new jsPDF({
        orientation: 'p',
        unit: 'mm',
        format: 'a4'
    });

    // --- 1. CONSTANTS & MARGINS ---
    const marginX = 25.4; // Standard 1 inch margin for formal docs
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    let currentY = 20;

    // --- 2. OFFICIAL HEADER (Reused style) ---
    doc.setFont("times", "normal");
    doc.setFontSize(10);
    doc.text("Republic of the Philippines", pageWidth / 2, currentY, { align: "center" });
    currentY += 5;
    doc.text("City of Baguio", pageWidth / 2, currentY, { align: "center" });
    currentY += 5;
    doc.setFont("times", "bold");
    doc.setFontSize(14);
    doc.text("BARANGAY ENGINEER'S HILL", pageWidth / 2, currentY, { align: "center" });
    currentY += 6;
    doc.setFontSize(11);
    doc.text("OFFICE OF THE PUNONG BARANGAY", pageWidth / 2, currentY, { align: "center" });
    
    // Logo Placeholders
    doc.setLineWidth(0.5);
    doc.rect(marginX, 15, 22, 22); // Left Logo
    doc.rect(pageWidth - marginX - 22, 15, 22, 22); // Right Logo

    currentY += 10;
    doc.setLineWidth(0.5);
    doc.line(marginX, currentY, pageWidth - marginX, currentY); // Line Separator
    currentY += 15;

    // --- 3. DOCUMENT TITLE ---
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text(data.type.toUpperCase(), pageWidth / 2, currentY, { align: "center" });
    doc.setLineWidth(0.5);
    doc.line((pageWidth / 2) - 40, currentY + 2, (pageWidth / 2) + 40, currentY + 2); // Underline Title
    currentY += 20;

    // --- 4. BODY CONTENT (Dynamic based on Type) ---
    doc.setFont("times", "normal");
    doc.setFontSize(12);
    
    const dateIssued = new Date().toLocaleDateString('en-US', { 
        year: 'numeric', month: 'long', day: 'numeric' 
    });
    const residentName = data.residentName.toUpperCase();
    const purpose = data.purpose.toUpperCase();

    let bodyText = "";

    // Template Logic (Matching DocumentFile.tsx)
    if (data.type === 'Barangay Clearance') {
        bodyText = `TO WHOM IT MAY CONCERN:\n\n` +
        `This is to certify that ${residentName}, of legal age, is a bona fide resident of Barangay Engineer's Hill, Baguio City.\n\n` +
        `This certification is issued upon the request of the above-named person for the purpose of ${purpose}.\n\n` +
        `Issued this ${dateIssued} at Baguio City, Philippines.`;
    } 
    else if (data.type === 'Certificate of Indigency') {
        bodyText = `TO WHOM IT MAY CONCERN:\n\n` +
        `This is to certify that ${residentName} belongs to an indigent family in this Barangay and is a person of good moral character.\n\n` +
        `This certification is issued for the purpose of Medical/Financial Assistance requirements.\n\n` +
        `Issued this ${dateIssued} at Baguio City, Philippines.`;
    }
    else {
        // Generic Fallback
        bodyText = `TO WHOM IT MAY CONCERN:\n\n` +
        `This is to certify that ${residentName} is a resident of this Barangay.\n\n` +
        `This certification is issued for the purpose of ${purpose}.\n\n` +
        `Issued this ${dateIssued}.`;
    }

    // Text Wrapping Logic
    const splitBody = doc.splitTextToSize(bodyText, pageWidth - (marginX * 2));
    doc.text(splitBody, marginX, currentY, { align: "justify", lineHeightFactor: 1.5 });

    // --- 5. SIGNATURE (Captain) ---
    const captain = (officials || []).find(o => o.position === 'Barangay Captain')?.full_name || 'HON. JUAN DELA CRUZ';
    
    currentY = pageHeight - 60; // Fixed position near bottom
    
    doc.setFont("helvetica", "bold");
    const signX = pageWidth - marginX - 60;
    
    doc.text(captain.toUpperCase(), signX + 30, currentY, { align: "center" });
    doc.line(signX, currentY + 1, pageWidth - marginX, currentY + 1); // Signature Line
    currentY += 6;
    doc.setFont("times", "normal");
    doc.setFontSize(11);
    doc.text("Punong Barangay", signX + 30, currentY, { align: "center" });

    // --- 6. FOOTER METADATA (OR No., Cedula) ---
    currentY = pageHeight - 25;
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(`O.R. No: _____________`, marginX, currentY);
    currentY += 5;
    doc.text(`Cedula No: _____________`, marginX, currentY);
    currentY += 5;
    doc.text(`Doc Ref: ${data.referenceNo}`, marginX, currentY);

    // --- 7. SAVE ---
    doc.save(`${data.type.replace(/\s/g, '_')}_${residentName}.pdf`);
};