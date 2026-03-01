import React, { useState, useEffect, useRef, useCallback } from 'react';
import './styles/Announcement_modal.css';

interface IAnnouncement {
  id?: string;
  title: string;
  content: string;
  category: string;
  priority: 'Low' | 'Medium' | 'High';
  image_url?: string;
  expires_at?: string;
}

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editingItem: IAnnouncement | null;
}

const CATEGORIES = [
  'Public Advisory',
  'Senior Citizen',
  'Health & Safety',
  'Youth & Sports',
  'Community Project'
];

export default function Announcement_modal({ isOpen, onClose, onSuccess, editingItem }: ModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<IAnnouncement>({
    title: '',
    content: '',
    category: 'Public Advisory',
    priority: 'Medium',
    image_url: '',
    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const API_URL = 'http://localhost:8000/api/announcements';

  // --- Reset / Load Logic ---
  useEffect(() => {
    if (editingItem) {
      setFormData({
        ...editingItem,
        expires_at: editingItem.expires_at ? new Date(editingItem.expires_at).toISOString().split('T')[0] : formData.expires_at
      });
      setPreviewImage(editingItem.image_url || null);
    } else {
      setFormData({
        title: '',
        content: '',
        category: 'Public Advisory',
        priority: 'Medium',
        image_url: '',
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      });
      setPreviewImage(null);
    }
    return () => abortControllerRef.current?.abort();
  }, [editingItem, isOpen]);

  // --- Image Handling Logic ---
  const processFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      return alert("Please upload an image file.");
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      setPreviewImage(base64);
      setFormData(prev => ({ ...prev, image_url: base64 }));
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = () => setIsDragging(false);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  const removeImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setPreviewImage(null);
    setFormData(prev => ({ ...prev, image_url: '' }));
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // --- Submission Logic ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    abortControllerRef.current = new AbortController();

    const method = editingItem ? 'PUT' : 'POST';
    const url = editingItem ? `${API_URL}/${editingItem.id}` : API_URL;

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
        signal: abortControllerRef.current.signal
      });

      if (res.ok) {
        onSuccess();
        onClose();
      } else {
        const err = await res.json();
        alert(`Error: ${err.error || "Save failed"}`);
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') alert("System offline or network error.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="AM_OVERLAY" onClick={onClose}>
      <div className="AM_CONTENT" onClick={e => e.stopPropagation()}>
        <div className="AM_HEADER">
          <h3>{editingItem ? 'Edit Broadcast' : 'New Community Update'}</h3>
          <p>Broadcast alerts, news, or advisories to the residents.</p>
        </div>

        <form onSubmit={handleSubmit} className="AM_FORM">
          <div className="AM_GROUP">
            <label>Headline Title</label>
            <input 
              required 
              className="AM_INPUT" 
              placeholder="e.g., Scheduled Water Interruption"
              value={formData.title}
              onChange={e => setFormData({...formData, title: e.target.value})}
            />
          </div>

          <div className="AM_ROW">
            <div className="AM_GROUP">
              <label>Category</label>
              <select 
                className="AM_SELECT"
                value={formData.category}
                onChange={e => setFormData({...formData, category: e.target.value})}
              >
                {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
              </select>
            </div>
            <div className="AM_GROUP">
              <label>Urgency Level</label>
              <select 
                className="AM_SELECT"
                value={formData.priority}
                onChange={e => setFormData({...formData, priority: e.target.value as any})}
              >
                <option value="Low">Low (Info)</option>
                <option value="Medium">Medium (Standard)</option>
                <option value="High">High (Emergency)</option>
              </select>
            </div>
          </div>

          <div className="AM_GROUP">
            <label>Announcement Details</label>
            <textarea 
              required 
              className="AM_TEXTAREA" 
              rows={4}
              placeholder="Detailed description of the update..."
              value={formData.content}
              onChange={e => setFormData({...formData, content: e.target.value})}
            />
          </div>

          <div className="AM_GROUP">
            <label>Cover Image</label>
            <div 
              className={`AM_UPLOAD_ZONE ${isDragging ? 'DRAGGING' : ''} ${previewImage ? 'HAS_IMAGE' : ''}`}
              onClick={() => fileInputRef.current?.click()}
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onDrop={onDrop}
            >
              <input 
                type="file" 
                hidden 
                ref={fileInputRef} 
                accept="image/*" 
                onChange={handleFileChange} 
              />
              
              {previewImage ? (
                <div className="AM_IMAGE_PREVIEW">
                  <img src={previewImage} alt="Preview" />
                  <button type="button" className="AM_REMOVE_IMAGE" onClick={removeImage}>
                    <i className="fas fa-times"></i> Remove
                  </button>
                </div>
              ) : (
                <div className="AM_UPLOAD_PLACEHOLDER">
                  <i className="fas fa-cloud-upload-alt"></i>
                  <p><b>Click to upload</b> or drag and drop</p>
                  <span>PNG, JPG or WEBP (Max 5MB)</span>
                </div>
              )}
            </div>
          </div>

          <div className="AM_GROUP">
            <label>Expiry Date</label>
            <input 
              type="date" 
              className="AM_INPUT"
              value={formData.expires_at}
              onChange={e => setFormData({...formData, expires_at: e.target.value})}
            />
          </div>

          <div className="AM_FOOTER">
            <button type="button" className="AM_BTN_SEC" onClick={onClose}>Cancel</button>
            <button type="submit" className="AM_BTN_PRI" disabled={isSubmitting}>
              {isSubmitting ? 'Publishing...' : editingItem ? 'Save Changes' : 'Post Announcement'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}