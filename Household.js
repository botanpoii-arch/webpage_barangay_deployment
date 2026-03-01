/**
 * HOUSEHOLD ROUTER MODULE
 * Handles family grouping, head of household assignment, and member synchronization.
 */
export const HouseholdRouter = (router, supabase) => {

    // ==========================================
    // 1. GET ALL HOUSEHOLDS (With member stats)
    // ==========================================
    router.get('/households', async (req, res) => {
        try {
            const { data, error } = await supabase
                .from('households')
                .select(`
                    id,
                    household_number,
                    zone,
                    address,
                    head:head_id (first_name, last_name),
                    members:residents_records (record_id, is_4ps, monthly_income)
                `)
                .order('created_at', { ascending: false });

            if (error) throw error;

            const formattedData = data.map(hh => {
                const members = hh.members || [];
                const is4Ps = members.some(m => m.is_4ps === true);
                const isIndigent = members.some(m => {
                    const income = parseInt((m.monthly_income || '0').replace(/\D/g, ''));
                    return income < 5000;
                });

                const headName = hh.head 
                    ? `${hh.head.last_name}, ${hh.head.first_name}` 
                    : 'Unassigned';

                return {
                    id: hh.id,
                    household_number: hh.household_number,
                    head: headName,
                    zone: hh.zone,
                    address: hh.address, // Added to support the view/edit modals
                    membersCount: members.length,
                    is4Ps,
                    isIndigent
                };
            });

            res.status(200).json(formattedData);
        } catch (err) {
            console.error("Fetch Households Error:", err.message);
            res.status(500).json({ error: "Failed to fetch household data." });
        }
    });

    // ==========================================
    // 2. CREATE NEW HOUSEHOLD
    // ==========================================
    router.post('/households', async (req, res) => {
        try {
            const { head_id, zone, address, initial_members } = req.body;

            if (!head_id || !zone) {
                return res.status(400).json({ error: "Head of family and Zone are required." });
            }

            const year = new Date().getFullYear();
            const suffix = Math.floor(1000 + Math.random() * 9000);
            const household_number = `HH-${year}-${suffix}`;

            const { data: newHousehold, error: insertError } = await supabase
                .from('households')
                .insert([{ household_number, head_id, zone, address }])
                .select()
                .single();

            if (insertError) throw insertError;

            const memberIdsToUpdate = Array.from(new Set([head_id, ...(initial_members || [])]));
            
            await supabase
                .from('residents_records')
                .update({ household_id: newHousehold.id })
                .in('record_id', memberIdsToUpdate);

            res.status(201).json({ message: "Household established successfully", household: newHousehold });
        } catch (err) {
            console.error("Create Household Error:", err.message);
            res.status(400).json({ error: "Failed to create household." });
        }
    });

    // ==========================================
    // 3. UPDATE HOUSEHOLD (Full Edit Sync)
    // ==========================================
    router.put('/households/:id', async (req, res) => {
        try {
            const { id } = req.params;
            const { head_id, zone, address, current_members } = req.body;

            // 1. Update Household Metadata
            const { error: hhError } = await supabase
                .from('households')
                .update({ head_id, zone, address })
                .eq('id', id);

            if (hhError) throw hhError;

            // 2. MEMBER SYNC: Step A - Clear existing links
            await supabase
                .from('residents_records')
                .update({ household_id: null })
                .eq('household_id', id);

            // 2. MEMBER SYNC: Step B - Re-assign new member list
            const allMemberIds = Array.from(new Set([head_id, ...(current_members || [])]));
            
            const { error: updateError } = await supabase
                .from('residents_records')
                .update({ household_id: id })
                .in('record_id', allMemberIds);

            if (updateError) throw updateError;

            res.status(200).json({ message: "Household and members updated successfully." });
        } catch (err) {
            console.error("Update Household Error:", err.message);
            res.status(400).json({ error: "Failed to update household profile." });
        }
    });

    // ==========================================
    // 4. DELETE HOUSEHOLD (Safe Disband)
    // ==========================================
    router.delete('/households/:id', async (req, res) => {
        try {
            const { id } = req.params;

            // Step 1: Detach all residents before deleting the group
            await supabase
                .from('residents_records')
                .update({ household_id: null })
                .eq('household_id', id);

            // Step 2: Delete the household record
            const { error } = await supabase
                .from('households')
                .delete()
                .eq('id', id);

            if (error) throw error;
            res.status(200).json({ message: "Household record removed successfully." });
        } catch (err) {
            console.error("Delete Household Error:", err.message);
            res.status(500).json({ error: "Failed to disband household." });
        }
    });
};