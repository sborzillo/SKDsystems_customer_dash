// Sync billable hours from Clockify - ADMIN ONLY
app.post('/clockify/sync', requireAuth, requireAdmin, async (req, res) => {
    try {
        if (!clockifyService.isConfigured()) {
            return res.redirect('/clockify?error=Clockify not configured');
        }
        
        // Get current user from Clockify
        const clockifyUser = await clockifyService.getCurrentUser();
        const userId = clockifyUser.id;
        
        // Get workspace
        const workspaces = await clockifyService.getWorkspaces();
        if (!workspaces || workspaces.length === 0) {
            return res.redirect('/clockify?error=No Clockify workspace found');
        }
        
        const workspaceId = workspaces[0].id;
        
        // Get date range (current year)
        const startDate = new Date(new Date().getFullYear(), 0, 1);
        const endDate = new Date();
        
        console.log(`Syncing billable hours from ${startDate.toDateString()} to ${endDate.toDateString()}`);
        
        // Get billable hours by client
        const hoursByClient = await clockifyService.getBillableHoursByClient(
            workspaceId,
            userId,
            startDate,
            endDate
        );
        
        // Update dashboard customers
        let updatedCount = 0;
        const client = await pool.connect();
        
        try {
            await client.query('BEGIN');
            
            for (const [clientName, data] of Object.entries(hoursByClient)) {
                // Find matching customer
                const customerResult = await client.query(
                    `SELECT id FROM customers 
                     WHERE LOWER(customer_name) = LOWER($1) OR LOWER(company_name) = LOWER($1)`,
                    [clientName]
                );
                
                if (customerResult.rows.length > 0) {
                    const customerId = customerResult.rows[0].id;
                    
                    console.log(`Updating ${clientName}: ${data.hours} hours from ${data.entries} entries`);
                    
                    // Update hours_used
                    await client.query(
                        'UPDATE customers SET hours_used = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
                        [Math.round(data.hours * 100) / 100, customerId]
                    );
                    
                    updatedCount++;
                }
            }
            
            await client.query('COMMIT');
            
            console.log(`Successfully synced ${updatedCount} customers`);
            res.redirect(`/clockify?success=Synced ${updatedCount} customers with billable hours from Clockify`);
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    } catch (error) {
        console.error('Clockify sync error:', error);
        res.redirect('/clockify?error=Failed to sync: ' + error.message);
    }
});