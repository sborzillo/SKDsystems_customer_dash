require('dotenv').config();
const express = require('express');
const session = require('express-session');
const bcrypt = require('bcrypt');
const { Pool } = require('pg');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Database connection
const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
});

// Test database connection
pool.query('SELECT NOW()', (err, res) => {
    if (err) {
        console.error('Database connection error:', err);
    } else {
        console.log('Database connected successfully');
        initializeDefaultUser();
    }
});

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Session configuration
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));

// Set view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Authentication middleware
function requireAuth(req, res, next) {
    if (req.session && req.session.userId) {
        return next();
    }
    res.redirect('/login');
}

// Admin-only middleware
function requireAdmin(req, res, next) {
    if (req.session && req.session.userId && req.session.isAdmin) {
        return next();
    }
    res.status(403).send('Access denied. Admin privileges required.');
}

// Initialize default admin user
async function initializeDefaultUser() {
    try {
        const checkUser = await pool.query('SELECT * FROM users WHERE username = $1', ['admin']);
        
        if (checkUser.rows.length === 0) {
            const hashedPassword = await bcrypt.hash('admin123', 10);
            await pool.query(
                'INSERT INTO users (username, password_hash, email, full_name, is_admin) VALUES ($1, $2, $3, $4, $5)',
                ['admin', hashedPassword, 'admin@skdsystems.com', 'System Administrator', true]
            );
            console.log('Default admin user created (username: admin, password: admin123)');
            console.log('IMPORTANT: Please change the default password immediately!');
        }
    } catch (error) {
        console.error('Error initializing default user:', error);
    }
}

// Routes
app.get('/', (req, res) => {
    if (req.session.userId) {
        res.redirect('/dashboard');
    } else {
        res.redirect('/login');
    }
});

app.get('/login', (req, res) => {
    if (req.session.userId) {
        return res.redirect('/dashboard');
    }
    res.render('login', { error: null });
});

app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    
    try {
        const result = await pool.query(
            'SELECT * FROM users WHERE username = $1 AND is_active = TRUE',
            [username]
        );
        
        if (result.rows.length === 0) {
            return res.render('login', { error: 'Invalid username or password' });
        }
        
        const user = result.rows[0];
        const match = await bcrypt.compare(password, user.password_hash);
        
        if (!match) {
            return res.render('login', { error: 'Invalid username or password' });
        }
        
        // Update last login
        await pool.query('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1', [user.id]);
        
        req.session.userId = user.id;
        req.session.username = user.username;
        req.session.fullName = user.full_name;
        req.session.isAdmin = user.is_admin;
        
        res.redirect('/dashboard');
    } catch (error) {
        console.error('Login error:', error);
        res.render('login', { error: 'An error occurred. Please try again.' });
    }
});

app.get('/dashboard', requireAuth, async (req, res) => {
    try {
        const customersResult = await pool.query(
            `SELECT c.*, i.server_count, i.storage_gb, i.bandwidth_gb, i.active_services,
                    (c.hours_purchased - c.hours_used) as hours_remaining,
                    ROUND((c.hours_used / NULLIF(c.hours_purchased, 0) * 100)::numeric, 2) as usage_percentage
             FROM customers c
             LEFT JOIN infrastructure_stats i ON c.id = i.customer_id
             ORDER BY c.customer_name`
        );
        
        const statsResult = await pool.query(
            `SELECT 
                COUNT(*) as total_customers,
                COALESCE(SUM(hours_purchased), 0) as total_hours_purchased,
                COALESCE(SUM(hours_used), 0) as total_hours_used,
                COALESCE(SUM(hours_purchased - hours_used), 0) as total_hours_remaining
             FROM customers`
        );
        
        res.render('dashboard', {
            user: { 
                username: req.session.username, 
                fullName: req.session.fullName,
                isAdmin: req.session.isAdmin 
            },
            customers: customersResult.rows,
            stats: statsResult.rows[0]
        });
    } catch (error) {
        console.error('Dashboard error:', error);
        res.status(500).send('Error loading dashboard');
    }
});

app.get('/customer/:id', requireAuth, async (req, res) => {
    try {
        const customerId = req.params.id;
        
        const customerResult = await pool.query(
            `SELECT c.*, i.server_count, i.storage_gb, i.bandwidth_gb, i.active_services, i.last_updated,
                    (c.hours_purchased - c.hours_used) as hours_remaining,
                    ROUND((c.hours_used / NULLIF(c.hours_purchased, 0) * 100)::numeric, 2) as usage_percentage
             FROM customers c
             LEFT JOIN infrastructure_stats i ON c.id = i.customer_id
             WHERE c.id = $1`,
            [customerId]
        );
        
        if (customerResult.rows.length === 0) {
            return res.status(404).send('Customer not found');
        }
        
        const activityResult = await pool.query(
            `SELECT * FROM activity_log WHERE customer_id = $1 ORDER BY activity_date DESC LIMIT 20`,
            [customerId]
        );
        
        res.render('customer-detail', {
            user: { username: req.session.username, fullName: req.session.fullName },
            customer: customerResult.rows[0],
            activities: activityResult.rows
        });
    } catch (error) {
        console.error('Customer detail error:', error);
        res.status(500).send('Error loading customer details');
    }
});

// Management page - ADMIN ONLY
app.get('/manage', requireAuth, requireAdmin, async (req, res) => {
    try {
        const customersResult = await pool.query(
            `SELECT c.*, i.id as infra_id, i.server_count, i.storage_gb, i.bandwidth_gb, i.active_services
             FROM customers c
             LEFT JOIN infrastructure_stats i ON c.id = i.customer_id
             ORDER BY c.customer_name`
        );
        
        res.render('manage', {
            user: { username: req.session.username, fullName: req.session.fullName },
            customers: customersResult.rows,
            success: req.query.success,
            error: req.query.error
        });
    } catch (error) {
        console.error('Management page error:', error);
        res.status(500).send('Error loading management page');
    }
});

// Show create customer form - ADMIN ONLY
app.get('/customer/new', requireAuth, requireAdmin, (req, res) => {
    res.render('customer-form', {
        user: { username: req.session.username, fullName: req.session.fullName },
        customer: null,
        error: null
    });
});

// Create new customer - ADMIN ONLY
app.post('/customer/create', requireAuth, requireAdmin, async (req, res) => {
    const client = await pool.connect();
    
    try {
        const {
            customer_name,
            company_name,
            email,
            hours_purchased,
            hours_used,
            server_count,
            storage_gb,
            bandwidth_gb,
            active_services
        } = req.body;

        await client.query('BEGIN');

        // Insert customer
        const customerResult = await client.query(
            `INSERT INTO customers (customer_name, company_name, email, hours_purchased, hours_used)
             VALUES ($1, $2, $3, $4, $5) RETURNING id`,
            [customer_name, company_name, email, parseFloat(hours_purchased) || 0, parseFloat(hours_used) || 0]
        );

        const customerId = customerResult.rows[0].id;

        // Insert infrastructure stats
        await client.query(
            `INSERT INTO infrastructure_stats (customer_id, server_count, storage_gb, bandwidth_gb, active_services)
             VALUES ($1, $2, $3, $4, $5)`,
            [
                customerId,
                parseInt(server_count) || 0,
                parseFloat(storage_gb) || 0,
                parseFloat(bandwidth_gb) || 0,
                parseInt(active_services) || 0
            ]
        );

        await client.query('COMMIT');
        res.redirect('/manage?success=Customer created successfully');
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Create customer error:', error);
        res.redirect('/manage?error=Failed to create customer');
    } finally {
        client.release();
    }
});

// Show edit customer form - ADMIN ONLY
app.get('/customer/:id/edit', requireAuth, requireAdmin, async (req, res) => {
    try {
        const customerId = req.params.id;
        
        const customerResult = await pool.query(
            `SELECT c.*, i.id as infra_id, i.server_count, i.storage_gb, i.bandwidth_gb, i.active_services
             FROM customers c
             LEFT JOIN infrastructure_stats i ON c.id = i.customer_id
             WHERE c.id = $1`,
            [customerId]
        );
        
        if (customerResult.rows.length === 0) {
            return res.status(404).send('Customer not found');
        }
        
        res.render('customer-form', {
            user: { username: req.session.username, fullName: req.session.fullName },
            customer: customerResult.rows[0],
            error: null
        });
    } catch (error) {
        console.error('Edit customer error:', error);
        res.status(500).send('Error loading customer');
    }
});

// Update customer - ADMIN ONLY
app.post('/customer/:id/update', requireAuth, requireAdmin, async (req, res) => {
    const client = await pool.connect();
    
    try {
        const customerId = req.params.id;
        const {
            customer_name,
            company_name,
            email,
            hours_purchased,
            hours_used,
            server_count,
            storage_gb,
            bandwidth_gb,
            active_services
        } = req.body;

        await client.query('BEGIN');

        // Update customer
        await client.query(
            `UPDATE customers 
             SET customer_name = $1, company_name = $2, email = $3, 
                 hours_purchased = $4, hours_used = $5, updated_at = CURRENT_TIMESTAMP
             WHERE id = $6`,
            [customer_name, company_name, email, parseFloat(hours_purchased) || 0, parseFloat(hours_used) || 0, customerId]
        );

        // Update or insert infrastructure stats
        const infraCheck = await client.query(
            'SELECT id FROM infrastructure_stats WHERE customer_id = $1',
            [customerId]
        );

        if (infraCheck.rows.length > 0) {
            await client.query(
                `UPDATE infrastructure_stats 
                 SET server_count = $1, storage_gb = $2, bandwidth_gb = $3, 
                     active_services = $4, last_updated = CURRENT_TIMESTAMP
                 WHERE customer_id = $5`,
                [
                    parseInt(server_count) || 0,
                    parseFloat(storage_gb) || 0,
                    parseFloat(bandwidth_gb) || 0,
                    parseInt(active_services) || 0,
                    customerId
                ]
            );
        } else {
            await client.query(
                `INSERT INTO infrastructure_stats (customer_id, server_count, storage_gb, bandwidth_gb, active_services)
                 VALUES ($1, $2, $3, $4, $5)`,
                [
                    customerId,
                    parseInt(server_count) || 0,
                    parseFloat(storage_gb) || 0,
                    parseFloat(bandwidth_gb) || 0,
                    parseInt(active_services) || 0
                ]
            );
        }

        await client.query('COMMIT');
        res.redirect('/manage?success=Customer updated successfully');
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Update customer error:', error);
        res.redirect('/manage?error=Failed to update customer');
    } finally {
        client.release();
    }
});

// Delete customer - ADMIN ONLY
app.post('/customer/:id/delete', requireAuth, requireAdmin, async (req, res) => {
    try {
        const customerId = req.params.id;
        
        // Infrastructure stats and activity logs will be deleted automatically due to CASCADE
        await pool.query('DELETE FROM customers WHERE id = $1', [customerId]);
        
        res.redirect('/manage?success=Customer deleted successfully');
    } catch (error) {
        console.error('Delete customer error:', error);
        res.redirect('/manage?error=Failed to delete customer');
    }
});

app.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Logout error:', err);
        }
        res.redirect('/login');
    });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV}`);
});
