-- Create customers table
CREATE TABLE IF NOT EXISTS customers (
    id SERIAL PRIMARY KEY,
    customer_name VARCHAR(255) NOT NULL,
    company_name VARCHAR(255),
    email VARCHAR(255) UNIQUE,
    hours_purchased DECIMAL(10, 2) DEFAULT 0,
    hours_used DECIMAL(10, 2) DEFAULT 0,
    user_id INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create infrastructure_stats table
CREATE TABLE IF NOT EXISTS infrastructure_stats (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
    server_count INTEGER DEFAULT 0,
    storage_gb DECIMAL(10, 2) DEFAULT 0,
    bandwidth_gb DECIMAL(10, 2) DEFAULT 0,
    active_services INTEGER DEFAULT 0,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create users table for authentication
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE,
    full_name VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    is_admin BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP
);

-- Create activity_log table for tracking usage
CREATE TABLE IF NOT EXISTS activity_log (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
    activity_type VARCHAR(100),
    hours_consumed DECIMAL(10, 2),
    description TEXT,
    activity_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add foreign key constraint for user_id in customers
ALTER TABLE customers ADD CONSTRAINT fk_customer_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;

-- Insert sample customer data
INSERT INTO customers (customer_name, company_name, email, hours_purchased, hours_used) VALUES
    ('John Doe', 'Acme Corp', 'john@acmecorp.com', 100.00, 45.50),
    ('Jane Smith', 'Tech Solutions', 'jane@techsolutions.com', 200.00, 150.25),
    ('Bob Johnson', 'Digital Industries', 'bob@digitalind.com', 150.00, 75.00);

-- Insert sample infrastructure stats
INSERT INTO infrastructure_stats (customer_id, server_count, storage_gb, bandwidth_gb, active_services) VALUES
    (1, 5, 500.00, 1000.00, 12),
    (2, 10, 1500.00, 2500.00, 25),
    (3, 7, 750.00, 1200.00, 15);

-- Insert sample activity logs
INSERT INTO activity_log (customer_id, activity_type, hours_consumed, description) VALUES
    (1, 'Server Maintenance', 5.5, 'Routine server maintenance and updates'),
    (1, 'Security Audit', 8.0, 'Comprehensive security review'),
    (2, 'Infrastructure Setup', 25.5, 'New server deployment and configuration'),
    (2, 'Database Optimization', 12.0, 'Performance tuning and optimization'),
    (3, 'Network Configuration', 15.0, 'Network infrastructure setup');

-- Create indexes for better performance
CREATE INDEX idx_customers_email ON customers(email);
CREATE INDEX idx_customers_user ON customers(user_id);
CREATE INDEX idx_infrastructure_customer ON infrastructure_stats(customer_id);
CREATE INDEX idx_activity_customer ON activity_log(customer_id);
CREATE INDEX idx_activity_date ON activity_log(activity_date);
CREATE INDEX idx_users_username ON users(username);

-- Note: Default admin user will be created by the application on first run
