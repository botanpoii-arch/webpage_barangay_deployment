/**
 * ANNOUNCEMENT ROUTER MODULE
 * Handles community broadcasts with priority and category management.
 */
export const AnnouncementRouter = (router, supabase) => {

    // ==========================================
    // 1. GET ALL ANNOUNCEMENTS
    // ==========================================
    router.get('/announcements', async (req, res) => {
        try {
            const { data, error } = await supabase
                .from('announcements')
                .select('*')
                // Professional approach: Sort by Urgency first, then most recent
                .order('priority', { ascending: false }) 
                .order('created_at', { ascending: false });

            if (error) throw error;
            res.status(200).json(data);
        } catch (err) {
            console.error("Announcement Fetch Error:", err.message);
            res.status(500).json({ error: "Failed to sync bulletin board." });
        }
    });

    // ==========================================
    // 2. CREATE NEW ANNOUNCEMENT
    // ==========================================
    router.post('/announcements', async (req, res) => {
        try {
            const { title, content, category, priority, expires_at, image_url } = req.body;

            // Simple Server-Side Validation
            if (!title || !content || !expires_at) {
                return res.status(400).json({ error: "Headline, details, and expiry date are required." });
            }

            const { data, error } = await supabase
                .from('announcements')
                .insert([{
                    title,
                    content,
                    category: category || 'Public Advisory',
                    priority: priority || 'Medium',
                    expires_at,
                    image_url: image_url || null,
                    status: 'Active'
                }])
                .select()
                .single();

            if (error) throw error;
            res.status(201).json(data);
        } catch (err) {
            console.error("Announcement Post Error:", err.message);
            res.status(400).json({ error: err.message });
        }
    });

    // ==========================================
    // 3. UPDATE ANNOUNCEMENT
    // ==========================================
    router.put('/announcements/:id', async (req, res) => {
        try {
            const { id } = req.params;
            const updates = req.body;

            // Prevent Primary Key manipulation
            delete updates.id; 
            delete updates.created_at;

            const { data, error } = await supabase
                .from('announcements')
                .update(updates)
                .eq('id', id)
                .select();

            if (error) throw error;
            if (!data || data.length === 0) return res.status(404).json({ error: "Post not found." });

            res.status(200).json(data[0]);
        } catch (err) {
            console.error("Announcement Update Error:", err.message);
            res.status(400).json({ error: err.message });
        }
    });

    // ==========================================
    // 4. DELETE ANNOUNCEMENT
    // ==========================================
    router.delete('/announcements/:id', async (req, res) => {
        try {
            const { id } = req.params;

            const { error } = await supabase
                .from('announcements')
                .delete()
                .eq('id', id);

            if (error) throw error;
            res.status(200).json({ message: "Announcement successfully removed from bulletin." });
        } catch (err) {
            console.error("Announcement Delete Error:", err.message);
            res.status(400).json({ error: err.message });
        }
    });
};