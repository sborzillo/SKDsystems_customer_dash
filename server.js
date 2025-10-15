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

// Initialize default admin user
async function initializeDefaultUser() {
    try {
        const checkUser = await pool.query('SELECT * FROM users WHERE username = $1', ['admin']);
        
        if (checkUser.rows.length === 0) {
            const hashedPassword = await bcrypt.hash('admin123', 10);
            await pool.query(
                'INSERT INTO users (username, password_hash, email, full_name) VALUES ($1, $2, $3, $4)',
                ['admin', hashedPassword, 'admin@skdsystems.com', 'System Administrator']
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
            user: { username: req.session.username, fullName: req.session.fullName },
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
