import bcrypt from 'bcryptjs';

export const ResidentsRecordRouter = (router, supabase) => {
    
    // ==========================================
    // 1. GET ALL RESIDENTS
    // ==========================================
    router.get('/residents', async (req, res) => {
        try {
            const { data, error } = await supabase
                .from('residents_records')
                .select('*')
                .order('created_at', { ascending: false });
            
            if (error) throw error;
            res.status(200).json(data);
        } catch (err) {
            console.error("Fetch All Error:", err.message);
            res.status(500).json({ error: err.message });
        }
    });

    // ==========================================
    // 2. GET SINGLE RESIDENT
    // ==========================================
    router.get('/residents/:id', async (req, res) => {
        try {
            const { id } = req.params;
            const { data, error } = await supabase
                .from('residents_records')
                .select('*')
                .eq('record_id', id)
                .single(); 

            if (error) {
                if (error.code === 'PGRST116') return res.status(404).json({ error: 'Record not found.' });
                throw error;
            }
            res.status(200).json(data);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    // ==========================================
    // 3. POST: REGISTER & AUTOMATE ACCOUNT
    // ==========================================
    router.post('/residents', async (req, res) => {
        try {
            const residentData = req.body;

            // Duplicate Check
            const { data: duplicate, error: checkError } = await supabase
                .from('residents_records')
                .select('first_name, last_name, email, contact_number')
                .or(`and(first_name.eq."${residentData.firstName}",middle_name.eq."${residentData.middleName}",last_name.eq."${residentData.lastName}"),email.eq."${residentData.email}",contact_number.eq."${residentData.contactNumber}"`)
                .maybeSingle();

            if (checkError) throw checkError;
            if (duplicate) {
                return res.status(409).json({ error: "Duplicate detected. Name, Email, or Contact Number already exists." });
            }

            // Insert Profile Data
            const { data: profile, error: profileError } = await supabase
                .from('residents_records')
                .insert([{
                    first_name: residentData.firstName,
                    middle_name: residentData.middleName,
                    last_name: residentData.lastName,
                    sex: residentData.sex,
                    gender_identity: residentData.genderIdentity,
                    dob: residentData.dob,
                    birth_place: residentData.birthPlace,
                    nationality: residentData.nationality,
                    religion: residentData.religion,
                    contact_number: residentData.contactNumber,
                    email: residentData.email,
                    current_address: residentData.currentAddress,
                    purok: residentData.purok,
                    is_voter: residentData.isVoter,
                    is_pwd: residentData.isPWD,
                    pwd_id_number: residentData.pwdIdNumber,
                    is_4ps: residentData.is4Ps,
                    four_ps_id_number: residentData.fourPsIdNumber,
                    is_solo_parent: residentData.isSoloParent,
                    solo_parent_id_number: residentData.soloParentIdNumber,
                    is_senior_citizen: residentData.isSeniorCitizen,
                    senior_id_number: residentData.seniorIdNumber,
                    is_ip: residentData.isIP,
                    education: residentData.education,
                    occupation: residentData.occupation,
                    activity_status: residentData.activityStatus || 'Active'
                }])
                .select()
                .single();

            if (profileError) throw profileError;

            // Account Automation Logic
            const fInitial = profile.first_name ? profile.first_name.charAt(0).toLowerCase() : 'x';
            const mInitial = profile.middle_name ? profile.middle_name.charAt(0).toLowerCase() : '';
            const lInitial = profile.last_name ? profile.last_name.charAt(0).toLowerCase() : 'x';
            
            const randomSuffix = Math.floor(1000 + Math.random() * 9000);
            const generatedUsername = `${fInitial}${mInitial}${lInitial}${randomSuffix}@residents.eng-hill.brg.ph`;

            const plainDefaultPassword = `${profile.first_name.toLowerCase().replace(/\s/g, '')}123456`;
            const securePassword = bcrypt.hashSync(plainDefaultPassword, 10);

            

            // Insert Credentials
            const { error: accountError } = await supabase
                .from('residents_account') 
                .insert([{
                    resident_id: profile.record_id, 
                    username: generatedUsername,
                    password: securePassword, // FIXED: Changed from password_hash to password
                    role: 'resident',         // FIXED: Lowercase to match your RBAC logic
                    status: 'Active'          // FIXED: Changed from is_active to status
                }]);

            if (accountError) {
                console.error("Account creation failed:", accountError);
                // We return 201 because the resident profile WAS created, but we attach a warning
                return res.status(201).json({ 
                    warning: "Profile saved, but automatic login account generation failed.", 
                    profile 
                });
            }

            res.status(201).json({ 
                ...profile, 
                account: { username: generatedUsername, password: plainDefaultPassword } 
            });

        } catch (err) {
            console.error("Save Error:", err.message);
            res.status(500).json({ error: err.message });
        }
    }); 

    // ==========================================
    // 4. PUT: UPDATE RESIDENT
    // ==========================================
// ==========================================
    // 4. PUT: UPDATE RESIDENT
    // ==========================================
    router.put('/residents/:id', async (req, res) => {
        try {
            const { id } = req.params;
            const residentData = req.body;
            
            // Map frontend camelCase to database snake_case (matching your POST logic)
            const updates = {
                first_name: residentData.firstName,
                middle_name: residentData.middleName,
                last_name: residentData.lastName,
                sex: residentData.sex,
                gender_identity: residentData.genderIdentity,
                dob: residentData.dob,
                birth_place: residentData.birthPlace,
                nationality: residentData.nationality,
                religion: residentData.religion,
                contact_number: residentData.contactNumber,
                email: residentData.email,
                current_address: residentData.currentAddress,
                purok: residentData.purok,
                is_voter: residentData.isVoter,
                is_pwd: residentData.isPWD,
                pwd_id_number: residentData.pwdIdNumber,
                is_4ps: residentData.is4Ps,
                four_ps_id_number: residentData.fourPsIdNumber,
                is_solo_parent: residentData.isSoloParent,
                solo_parent_id_number: residentData.soloParentIdNumber,
                is_senior_citizen: residentData.isSeniorCitizen,
                senior_id_number: residentData.seniorIdNumber,
                is_ip: residentData.isIP,
                education: residentData.education,
                occupation: residentData.occupation,
                activity_status: residentData.activityStatus
            };

            // Clean up undefined values so we only update what was actually sent
            Object.keys(updates).forEach(key => updates[key] === undefined && delete updates[key]);

            const { data, error } = await supabase
                .from('residents_records')
                .update(updates)
                .eq('record_id', id)
                .select();

            if (error) throw error;
            res.json(data[0]);
        } catch (err) {
            console.error("Update Error:", err.message);
            res.status(500).json({ error: err.message });
        }
    });
    // ==========================================
    // 5. DELETE: ARCHIVE RESIDENT
    // ==========================================
    router.delete('/residents/:id', async (req, res) => {
        try {
            const { id } = req.params;
            const { error } = await supabase
                .from('residents_records')
                .update({ activity_status: 'Archived' })
                .eq('record_id', id);

            if (error) throw error;
            res.json({ message: 'Resident archived successfully' });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

};