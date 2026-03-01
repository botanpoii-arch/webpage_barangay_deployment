import bcrypt from 'bcryptjs';

export const OfficialsRouter = (router, supabase) => {

    // ==========================================
    // 1. GET ALL OFFICIALS
    // ==========================================
    router.get('/officials', async (req, res) => {
        try { 
            const { data, error } = await supabase
                .from('officials')
                .select('*')
                // Orders them alphabetically by position (e.g., Captain at the top)
                .order('position', { ascending: true }); 
            
            if (error) throw error; 
            res.json(data); 
        } catch (err) { 
            res.status(500).json({ error: err.message }); 
        }
    });

    // ==========================================
    // 2. POST: ADD OFFICIAL & AUTO-GENERATE ACCOUNT
    // ==========================================
    router.post('/officials', async (req, res) => {
        try {
            const { full_name, position, term_start, term_end, status, contact_number } = req.body;

            // Step A: Insert Official Profile
            const { data: profile, error: profileError } = await supabase
                .from('officials')
                .insert([{
                    full_name,
                    position,
                    term_start: term_start || null,
                    term_end: term_end || null,
                    status: status || 'Active',
                    contact_number
                }])
                .select()
                .single();

            if (profileError) throw profileError;

            // Step B: Account Automation Logic for Officials
            const nameParts = profile.full_name.trim().split(/\s+/);
            const firstName = nameParts[0].toLowerCase();
            
            // Clean position for the domain (e.g., "Barangay Kagawad" -> "kagawad")
            const rawRole = position.toLowerCase().replace('barangay', '').trim().replace(/\s+/g, '');

            // Strict Initials: First, Middle, Last
            let fI = nameParts[0] ? nameParts[0][0].toLowerCase() : 'x';
            let mI = 'x'; 
            let lI = 'x';

            if (nameParts.length >= 3) {
                mI = nameParts[1][0].toLowerCase();
                lI = nameParts[nameParts.length - 1][0].toLowerCase();
            } else if (nameParts.length === 2) {
                lI = nameParts[1][0].toLowerCase();
            }
            const initials = `${fI}${mI}${lI}`;

            // Ensure Unique Username Loop
            let isUnique = false;
            let finalUsername = "";
            const { count } = await supabase.from('officials_accounts').select('*', { count: 'exact', head: true });
            let sequence = (count || 0) + 1;

            while (!isUnique) {
                const numberSuffix = String(sequence).padStart(3, '0');
                // Format: initials + 001 + @role.officials.eng-hill.brg.ph
                const candidate = `${initials}${numberSuffix}@${rawRole}.officials.eng-hill.brg.ph`;

                const { data: existing } = await supabase
                    .from('officials_accounts')
                    .select('username')
                    .eq('username', candidate)
                    .maybeSingle();

                if (!existing) {
                    finalUsername = candidate;
                    isUnique = true;
                } else {
                    sequence++; 
                }
            }

            const plainPassword = `${firstName}123456`;
            const securePassword = bcrypt.hashSync(plainPassword, 10);

            // Assign system privileges: Captain gets superadmin, everyone else gets admin
            const systemRole = position.toLowerCase().includes('captain') ? 'superadmin' : 'admin';

            // Step C: Save to Officials Account Table
            const { error: accountError } = await supabase
                .from('officials_accounts')
                .insert([{
                    official_id: profile.id,
                    username: finalUsername,
                    password: securePassword,
                    role: systemRole,
                    status: 'Active'
                }]);

            if (accountError) {
                console.error("Official account failed:", accountError.message);
                return res.status(500).json({ error: "Profile saved, but account generation failed." });
            }

            res.status(201).json({ 
                ...profile, 
                account: { username: finalUsername, password: plainPassword } 
            });

        } catch (err) {
            console.error("Save Error:", err.message);
            res.status(400).json({ error: err.message });
        }
    });

    // ==========================================
    // 3. PUT: UPDATE OFFICIAL
    // ==========================================
    router.put('/officials/:id', async (req, res) => {
        try { 
            const { id } = req.params; 
            const { full_name, position, term_start, term_end, status, contact_number } = req.body; 

            const updates = {
                full_name,
                position,
                term_start: term_start || null,
                term_end: term_end || null,
                status,
                contact_number
            };

            const { data, error } = await supabase
                .from('officials')
                .update(updates)
                .eq('id', id)
                .select(); 

            if (error) throw error; 
            res.json(data[0]); 
        } catch (err) { 
            res.status(400).json({ error: err.message }); 
        }
    });

    // ==========================================
    // 4. DELETE: SOFT ARCHIVE (END OF TERM)
    // ==========================================
    router.delete('/officials/:id', async (req, res) => {
        try { 
            const { id } = req.params; 
            const { error } = await supabase
                .from('officials')
                // Automatically sets status to 'End of Term' and stamps today's date
                .update({ status: 'End of Term', term_end: new Date().toISOString().split('T')[0] })
                .eq('id', id); 
                
            if (error) throw error; 
            res.json({ message: 'Official term ended successfully' }); 
        } catch (err) { 
            res.status(400).json({ error: err.message }); 
        }
    });
};