// Main Router File
import express from 'express';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import cors from 'cors';

// Modular Imports
import { documentRouter } from './Document.js';
import { AuditlogRouter, logActivity } from './Auditlog.js';
import { RbacRouter } from './Rbac_acc.js'; 
import { AccountManagementRouter } from './Account_Management.js';
import { ResidentsRecordRouter } from './Residents_record.js'; 
import { OfficialsRouter } from './Officials.js'; 
import { AnnouncementRouter } from './Announcement.js'; // <--- 1. Imported Announcement module
import { HouseholdRouter } from './Household.js';
import { OfficialsLoginRouter } from './Officials_login.js';


import cloudinary from 'cloudinary';

dotenv.config();

const router = express.Router();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// Initialize modular routers
HouseholdRouter(router, supabase);
documentRouter(router, supabase);
AuditlogRouter(router, supabase);
RbacRouter(router, supabase); 
AccountManagementRouter(router, supabase); 
ResidentsRecordRouter(router, supabase); 
OfficialsRouter(router, supabase); 
AnnouncementRouter(router, supabase); // <--- 2. Initialized Announcement routing
OfficialsLoginRouter(router, supabase); 
// ==========================================
// 1. GLOBAL MIDDLEWARE & CORS
// ==========================================
const corsOptions = {
  origin: 'http://localhost:5173',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-user-role'],
  credentials: true,
  optionsSuccessStatus: 200
};

router.use(cors(corsOptions)); 
router.use(express.json({ limit: '10mb' })); // Increased limit for base64 images
router.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ==========================================
// 2. SECURITY HELPERS
// ==========================================
const verifyPassword = (inputPassword, storedPassword) => {
  if (!inputPassword || !storedPassword) return false;
  if (storedPassword.startsWith('$2')) {
    return bcrypt.compareSync(inputPassword, storedPassword);
  }
  return inputPassword === storedPassword;
};

// ==========================================
// 3. AUTHENTICATION & LOGIN
// ==========================================
// Inside your login route in data.js
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    const { data, error } = await supabase
      .from('residents_account')
      .select('*, profile:resident_id(*)') // Fetch the linked resident record
      .eq('username', username.trim())
      .single();

    if (error || !data) return res.status(401).json({ error: 'Account not found.' });

    // ... password verification logic ...

    // Standardized Response Object
    res.json({ 
      message: 'Login successful', 
      account_id: data.account_id, // Credentials ID
      username: data.username,
      role: data.role,
      requires_reset: isUsingDefault,
      profile: {
        record_id: data.profile.record_id, // Resident Record ID (UUID)
        first_name: data.profile.first_name,
        middle_name: data.profile.middle_name,
        last_name: data.profile.last_name,
        purok: data.profile.purok
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 4. FORCED PASSWORD RESET
// ==========================================
router.patch('/accounts/reset/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { password } = req.body;

        if (!password || password.length < 8) {
            return res.status(400).json({ error: "Password must be at least 8 characters." });
        }

        const newHashedPassword = bcrypt.hashSync(password, 10);

        const { error } = await supabase
            .from('residents_account')
            .update({ password_hash: newHashedPassword })
            .eq('account_id', id);

        if (error) throw error;
        res.status(200).json({ message: "Password updated successfully." });
    } catch (err) {
        res.status(500).json({ error: "Failed to reset password." });
    }
});

// ==========================================
// 5. BLOTTER SYSTEM
// ==========================================
router.get('/blotter', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('blotter_cases')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/blotter', async (req, res) => {
  try {
    const { 
      case_number, complainant_id, complainant_name, respondent, 
      incident_type, narrative, date_filed, time_filed 
    } = req.body;

    if (!complainant_name || !respondent) {
        return res.status(400).json({ error: 'Missing Complainant Name or Respondent.' });
    }

    const { data, error } = await supabase
      .from('blotter_cases')
      .insert([{
        case_number,
        complainant_name,
        complainant_id: complainant_id || 'WALK-IN', 
        respondent,
        incident_type,
        narrative,
        date_filed,
        time_filed,
        status: 'Active'
      }])
      .select().single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ==========================================
// 6. DASHBOARD STATISTICS
// ==========================================
router.get('/stats', async (req, res) => {
  try {
    const [
      { count: populationCount, error: popError },
      { count: documentsCount, error: docError },
      { count: blotterCount, error: blotError },
      { count: activitiesCount, error: actError }
    ] = await Promise.all([
      supabase.from('residents_records').select('*', { count: 'exact', head: true }),
      supabase.from('document_requests').select('*', { count: 'exact', head: true }),
      supabase.from('blotter_cases').select('*', { count: 'exact', head: true }),
      supabase.from('audit_logs').select('*', { count: 'exact', head: true })
    ]);

    if (popError || docError || blotError) {
      return res.status(500).json({ error: 'Database connection failed' });
    }

    res.status(200).json({
      stats: {
        totalPopulation: populationCount || 0,
        documentsIssued: documentsCount || 0,
        blotterCases: blotterCount || 0,
        systemActivities: activitiesCount || 0,
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

export default router;
