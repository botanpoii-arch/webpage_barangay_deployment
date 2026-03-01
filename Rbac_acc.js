/**
 * RBAC MIDDLEWARE
 * Enforces permissions by checking the custom 'x-user-role' header.
 * @param {string[]} allowedRoles - Array of roles permitted to access the route.
 */
export const checkRole = (allowedRoles) => {
  return async (req, res, next) => {
    try {
      const userRole = req.headers['x-user-role']; 
      
      if (!userRole) {
        return res.status(401).json({ error: 'Access denied. No role provided in headers.' });
      }

      if (!allowedRoles.includes(userRole)) {
        return res.status(403).json({ error: 'Forbidden. Insufficient permissions for this action.' });
      }

      next();
    } catch (error) {
      res.status(500).json({ error: 'Internal server error during role validation.' });
    }
  };
};

/**
 * RBAC ROUTER MODULE
 * Handles account synchronization and role modifications across multiple account tables.
 */
export const RbacRouter = (router, supabase) => {
  
  // ==========================================
  // 1. GET ALL ACCOUNTS (UNIFIED VIEW)
  // ==========================================
  router.get('/rbac/accounts', checkRole(['admin', 'superadmin']), async (req, res) => {
    try {
      // Execute parallel queries for high performance, mapped to the new schema
      const [resAcc, offAcc] = await Promise.all([
        supabase
          .from('residents_account') // Singular
          .select(`
            account_id, 
            username, 
            role, 
            is_active, 
            created_at, 
            resident_id, 
            residents_records:resident_id (first_name, last_name)
          `)
          .order('created_at', { ascending: false }),
        supabase
          .from('officials_accounts')
          .select(`
            account_id, 
            username, 
            role, 
            status, 
            created_at, 
            official_id, 
            officials:official_id (full_name, position)
          `)
          .order('created_at', { ascending: false })
      ]);

      if (resAcc.error) throw resAcc.error;
      if (offAcc.error) throw offAcc.error;

      // Normalize data structures so the frontend receives a consistent object format
      const combinedAccounts = [
        ...resAcc.data.map(acc => ({ 
          id: acc.account_id, // Map account_id back to 'id' for the frontend
          username: acc.username,
          role: acc.role,
          status: acc.is_active ? 'Active' : 'Suspended', // Normalize boolean to string
          created_at: acc.created_at,
          source: 'resident', 
          profileName: acc.residents_records ? `${acc.residents_records.last_name}, ${acc.residents_records.first_name}` : 'Unknown Resident'
        })),
        ...offAcc.data.map(acc => ({ 
          id: acc.account_id, // Map account_id back to 'id'
          username: acc.username,
          role: acc.role,
          status: acc.status,
          created_at: acc.created_at,
          source: 'official',
          profileName: acc.officials ? acc.officials.full_name : 'System Administrator'
        }))
      ];

      res.status(200).json(combinedAccounts);
    } catch (err) {
      console.error("RBAC Fetch Error:", err.message);
      res.status(500).json({ error: err.message });
    }
  });

  // ==========================================
  // 2. UPDATE ACCOUNT ROLE (DYNAMIC)
  // ==========================================
  router.patch('/rbac/accounts/:id/role', checkRole(['superadmin']), async (req, res) => {
    try {
      const { id } = req.params; // This is the account_id
      const { newRole, source } = req.body; 

      const validRoles = ['resident', 'staff', 'admin', 'superadmin'];
      if (!validRoles.includes(newRole)) {
        return res.status(400).json({ error: 'Invalid role assignment.' });
      }

      if (!source || !['resident', 'official'].includes(source)) {
        return res.status(400).json({ error: 'Missing or invalid account source (resident/official).' });
      }

      // Determine target table based on source
      const targetTable = source === 'official' ? 'officials_accounts' : 'residents_account';

      const { data, error } = await supabase
        .from(targetTable)
        .update({ role: newRole })
        .eq('account_id', id) // Aligned to the new primary key name
        .select();

      if (error) throw error;
      
      if (!data || data.length === 0) {
        return res.status(404).json({ error: `Account with ID ${id} not found in ${source} records.` });
      }

      res.status(200).json({ 
        message: 'Role updated successfully.', 
        account: data[0],
        tableUsed: targetTable 
      });

    } catch (err) {
      console.error("RBAC Update Error:", err.message);
      res.status(400).json({ error: err.message });
    }
  });

  // ==========================================
  // 3. ACCOUNT SEARCH (FULL NAME INDICATION)
  // ==========================================
  router.get('/rbac/accounts/search', checkRole(['admin', 'superadmin']), async (req, res) => {
    const { query } = req.query;
    if (!query) return res.status(400).json({ error: 'Search query required.' });

    try {
      const searchStr = `%${query}%`;

      // Search residents using snake_case and the new records table
      const { data: residents, error: resErr } = await supabase
        .from('residents_account')
        .select('account_id, username, role, is_active, residents_records!inner(first_name, last_name)')
        .or(`first_name.ilike.${searchStr},last_name.ilike.${searchStr}`, { foreignTable: 'residents_records' });

      // Search officials based on linked profile names
      const { data: officials, error: offErr } = await supabase
        .from('officials_accounts')
        .select('account_id, username, role, status, officials!inner(full_name)')
        .ilike('officials.full_name', searchStr);

      if (resErr || offErr) throw (resErr || offErr);

      res.status(200).json({
        // Standardize IDs for the search dropdown
        residents: residents.map(r => ({ ...r, id: r.account_id, source: 'resident' })),
        officials: officials.map(o => ({ ...o, id: o.account_id, source: 'official' }))
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
};