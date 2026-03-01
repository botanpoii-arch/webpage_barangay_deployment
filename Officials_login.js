import bcrypt from 'bcryptjs';
import { logActivity } from './Auditlog.js'; 

export const OfficialsLoginRouter = (router, supabase) => {
    
    router.post('/admin/login', async (req, res) => {
        try {
            const { username, password } = req.body;

            const { data, error } = await supabase
                .from('officials_accounts') 
                .select('*, profile:official_id(*)') 
                .eq('username', username.trim())
                .single();

            if (error || !data) {
                return res.status(401).json({ error: 'Administrative account not found.' });
            }

            // Password Verification
            let isValid = false;
            if (data.password && data.password.startsWith('$2')) {
                isValid = bcrypt.compareSync(password, data.password);
            } else {
                isValid = password === data.password; 
            }

            if (!isValid) {
                // LOG FAILED PASSWORD
                await logActivity(supabase, username, 'LOGIN_FAILED', 'Invalid password attempt on Admin Terminal');
                return res.status(401).json({ error: 'Invalid security credentials.' });
            }

            const role = (data.role || '').toLowerCase();
            if (role === 'resident') {
                 // LOG INTRUSION ATTEMPT
                 await logActivity(supabase, username, 'UNAUTHORIZED_ACCESS', 'Resident attempted to breach Admin Terminal');
                 return res.status(403).json({ error: 'Access Denied: Insufficient clearance.' });
            }

            // LOG SUCCESSFUL LOGIN
            await logActivity(supabase, data.username, 'LOGIN', `Admin accessed the system. Role: ${role}`);

            res.json({
                message: 'Secure entry granted',
                user: {
                    account_id: data.account_id || data.id,
                    username: data.username,
                    role: role,
                    profile: data.profile ? {
                        id: data.profile.id || data.profile.official_id,
                        full_name: data.profile.full_name || `${data.profile.first_name} ${data.profile.last_name}`,
                        position: data.profile.position || 'Official'
                    } : null
                },
                token: 'secure-admin-token-placeholder'
            });

        } catch (err) {
            console.error("Admin Login Error:", err.message);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });
};