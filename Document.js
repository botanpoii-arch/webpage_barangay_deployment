/**
 * DOCUMENT ROUTER MODULE
 * Handles document requests, status tracking, and archive fetching.
 */
export const documentRouter = (router, supabase) => {

    // ==========================================
    // 1. GET ALL DOCUMENTS (Used by Dashboard & Archive)
    // ==========================================
    router.get('/documents', async (req, res) => {
        try {
            const { data, error } = await supabase
                .from('document_requests')
                .select('*')
                // Always return newest first for the pending widget
                .order('date_requested', { ascending: false });

            if (error) throw error;
            res.status(200).json(data);
        } catch (err) {
            console.error("Document Fetch Error:", err.message);
            res.status(500).json({ error: "Failed to sync document registry." });
        }
    });

    // ==========================================
    // 2. CREATE NEW REQUEST (From Resident Portal)
    // ==========================================
    router.post('/documents/save', async (req, res) => {
        try {
            // Strictly mapped to the new snake_case payload
            const { resident_id, resident_name, type, purpose, price, reference_no, date_requested } = req.body;

            if (!resident_id || !type) {
                return res.status(400).json({ error: "Missing required document details." });
            }

            const { data, error } = await supabase
                .from('document_requests')
                .insert([{
                    resident_id,
                    resident_name,
                    type,
                    purpose,
                    price,
                    reference_no,
                    date_requested,
                    status: 'Pending' // Always defaults to Pending for new requests
                }])
                .select()
                .single();

            if (error) throw error;
            res.status(201).json(data);
        } catch (err) {
            console.error("Document Save Error:", err.message);
            res.status(400).json({ error: "Database constraint error." });
        }
    });

    // ==========================================
    // 3. UPDATE DOCUMENT STATUS (For Admin Processing)
    // ==========================================
    router.patch('/documents/:id/status', async (req, res) => {
        try {
            const { id } = req.params;
            const { status } = req.body;

            const { data, error } = await supabase
                .from('document_requests')
                .update({ status })
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;
            res.status(200).json(data);
        } catch (err) {
            res.status(400).json({ error: "Failed to update status." });
        }
    });
};

export default documentRouter;