# SKD Systems Customer Dashboard

A secure customer metrics dashboard built with Node.js, PostgreSQL, and Docker. Track customer hours, infrastructure statistics, and activity logs with an intuitive web interface.

## 🚀 Features

- **🔐 Secure Authentication**: Password-based login with bcrypt encryption
- **📊 Customer Metrics**: Track hours purchased, hours used, and utilization rates
- **🖥️ Infrastructure Stats**: Monitor server count, storage, bandwidth, and active services
- **📈 Activity Logging**: Record and view customer activity history
- **🐳 Docker Ready**: Complete Docker containerization for easy deployment
- **💾 PostgreSQL Database**: Robust data storage with sample data included
- **📱 Responsive Design**: Works beautifully on desktop and mobile devices

## 🛠️ Tech Stack

- **Backend**: Node.js with Express
- **Database**: PostgreSQL 15
- **Authentication**: bcrypt for password hashing, express-session for session management
- **Frontend**: EJS templating with responsive CSS
- **Containerization**: Docker & Docker Compose

## 📋 Prerequisites

- Docker and Docker Compose installed
- Git

## 🚀 Quick Start

### 1. Clone the repository
```bash
git clone https://github.com/sborzillo/SKDsystems_customer_dash.git
cd SKDsystems_customer_dash
```

### 2. Create environment file
```bash
cp .env.example .env
```

### 3. Edit the .env file
Change the default values (especially passwords):
```bash
nano .env  # or use your preferred editor
```

**Important variables to change:**
- `SESSION_SECRET` - Use a strong random string
- `DB_PASSWORD` - Use a secure password

### 4. Start the application
```bash
docker-compose up -d
```

This will:
- Pull the required Docker images
- Build the application container
- Initialize the PostgreSQL database with sample data
- Start both the app and database containers

### 5. Access the dashboard
Open your browser to `http://localhost:3000`

**Default credentials:**
- Username: `admin`
- Password: `admin123`

**⚠️ IMPORTANT**: Change the default password immediately after first login!

## 📁 Project Structure

```
SKDsystems_customer_dash/
├── database/
│   └── init.sql              # Database schema and sample data
├── views/
│   ├── login.ejs             # Login page
│   ├── dashboard.ejs         # Main dashboard
│   └── customer-detail.ejs   # Customer detail view
├── public/
│   └── styles.css            # Additional styling
├── server.js                 # Main application server
├── package.json              # Node.js dependencies
├── Dockerfile                # Docker container config
├── docker-compose.yml        # Docker orchestration
├── .env.example              # Environment variables template
├── .gitignore                # Git ignore rules
└── README.md                 # This file
```

## 🗄️ Database Schema

### Tables

1. **customers** - Customer information and hours tracking
   - id, customer_name, company_name, email
   - hours_purchased, hours_used
   - created_at, updated_at

2. **infrastructure_stats** - Infrastructure metrics per customer
   - server_count, storage_gb, bandwidth_gb
   - active_services, last_updated

3. **users** - Authentication credentials (encrypted)
   - username, password_hash, email, full_name
   - is_active, created_at, last_login

4. **activity_log** - Customer activity history
   - activity_type, hours_consumed
   - description, activity_date

### Sample Data

The database initializes with 3 sample customers and their associated infrastructure stats and activity logs for testing purposes.

## 💻 Usage

### Viewing the Dashboard

After logging in, you'll see:
- **Summary cards** with total customers, hours purchased/used/remaining
- **Customer table** with all customers, their usage percentages, and status indicators
- **Color-coded status badges**: 
  - Green (Good) - Under 70% usage
  - Orange (Warning) - 70-89% usage
  - Red (Critical) - 90%+ usage

### Viewing Customer Details

Click "View Details" on any customer to see:
- Detailed hours breakdown
- Infrastructure statistics (servers, storage, bandwidth, services)
- Recent activity log with timestamps

### Adding New Metrics

To add new metrics to track:

1. **Update the database schema** in `database/init.sql`:
```sql
ALTER TABLE infrastructure_stats 
ADD COLUMN new_metric_name DECIMAL(10, 2) DEFAULT 0;
```

2. **Modify queries** in `server.js` to include the new field
3. **Update views** in `views/` to display the new metrics

### Creating New Users

Users can be added directly to the database. First, hash the password:

```javascript
const bcrypt = require('bcrypt');
const hashedPassword = await bcrypt.hash('yourpassword', 10);
// Use this hashed password in your INSERT statement
```

Then insert into the database:
```sql
INSERT INTO users (username, password_hash, email, full_name) 
VALUES ('newuser', 'hashed_password_here', 'user@example.com', 'Full Name');
```

## 🔧 Development

### Running in Development Mode

For development with auto-reload:

```bash
npm install
npm run dev
```

Make sure to set `DB_HOST=localhost` in your `.env` file when running locally without Docker.

### Docker Commands

```bash
# Start containers
docker-compose up -d

# Stop containers
docker-compose down

# View logs
docker-compose logs -f

# View app logs only
docker-compose logs -f app

# Restart application
docker-compose restart app

# Rebuild and restart
docker-compose up -d --build

# Stop and remove volumes (deletes database data)
docker-compose down -v
```

### Database Access

To access the PostgreSQL database directly:

```bash
docker exec -it customer_dash_db psql -U dashboard_user -d customer_dashboard
```

Common SQL commands:
```sql
-- View all customers
SELECT * FROM customers;

-- View infrastructure stats
SELECT c.customer_name, i.* 
FROM customers c 
JOIN infrastructure_stats i ON c.id = i.customer_id;

-- View activity log
SELECT c.customer_name, a.* 
FROM customers c 
JOIN activity_log a ON c.id = a.customer_id 
ORDER BY a.activity_date DESC;
```

## 🔒 Security Considerations

### Implemented Security Features
- ✅ Passwords hashed using bcrypt (salt rounds: 10)
- ✅ Sessions secured with httpOnly cookies
- ✅ SQL injection protection via parameterized queries
- ✅ Environment variables for sensitive configuration
- ✅ Session expiration (24 hours)

### Production Recommendations
- ⚠️ Change all default credentials immediately
- ⚠️ Use a strong, random SESSION_SECRET (at least 32 characters)
- ⚠️ Enable HTTPS/TLS in production
- ⚠️ Set `secure: true` for cookies in production
- ⚠️ Use strong database passwords
- ⚠️ Implement rate limiting for login attempts
- ⚠️ Add CSRF protection for forms
- ⚠️ Keep dependencies updated regularly
- ⚠️ Consider adding 2FA for admin accounts
- ⚠️ Implement proper logging and monitoring

## 🌍 Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| PORT | Application port | 3000 | No |
| NODE_ENV | Environment mode | development | No |
| SESSION_SECRET | Session encryption key | - | **Yes** |
| DB_HOST | Database host | postgres | Yes |
| DB_PORT | Database port | 5432 | Yes |
| DB_NAME | Database name | customer_dashboard | Yes |
| DB_USER | Database user | dashboard_user | Yes |
| DB_PASSWORD | Database password | - | **Yes** |

## 🎨 Customization

The dashboard is designed to be easily customizable:

### Styling
- Edit inline CSS in `views/*.ejs` files
- Add global styles to `public/styles.css`
- Colors, fonts, and layouts can be modified in the `<style>` sections

### Branding
- Update company name in `views/login.ejs` and `views/dashboard.ejs`
- Change color scheme (currently purple gradient) by modifying CSS
- Add your logo by placing an image in `public/` and referencing it in views

### Metrics
- Add new database columns in `database/init.sql`
- Update queries in `server.js` to fetch new data
- Display new metrics in the appropriate view templates

### Reports
- Create new routes in `server.js` for custom reports
- Add new view templates in `views/` directory
- Link to reports from the dashboard navigation

## 🐛 Troubleshooting

### Database connection errors
**Problem**: App can't connect to database

**Solutions**:
- Ensure Docker containers are running: `docker ps`
- Check database logs: `docker-compose logs postgres`
- Verify environment variables in `.env` match docker-compose.yml
- Wait a few seconds after starting - database needs time to initialize

### Port already in use
**Problem**: Port 3000 is already in use

**Solutions**:
- Change the PORT in `.env` to an available port (e.g., 3001)
- Find and stop the process using port 3000:
  ```bash
  # On macOS/Linux
  lsof -ti:3000 | xargs kill
  
  # On Windows
  netstat -ano | findstr :3000
  taskkill /PID <PID> /F
  ```

### Cannot login with default credentials
**Problem**: Admin/admin123 doesn't work

**Solutions**:
- Check app logs: `docker-compose logs app`
- Verify database initialization completed successfully
- Try recreating the database:
  ```bash
  docker-compose down -v
  docker-compose up -d
  ```
- Check the logs for "Default admin user created" message

### Database data persists after docker-compose down
**Issue**: Old data remains after restarting

**Explanation**: This is expected! Docker volumes persist data.

**To reset**: Use `docker-compose down -v` to remove volumes

## 📝 Adding Features

### Example: Adding a "Notes" field to customers

1. **Update database schema**:
```sql
ALTER TABLE customers ADD COLUMN notes TEXT;
```

2. **Update the query in server.js**:
```javascript
const customersResult = await pool.query(
    `SELECT c.*, c.notes, i.server_count...
```

3. **Display in the view** (`views/customer-detail.ejs`):
```html
<div class="section">
    <h3>Notes</h3>
    <p><%= customer.notes || 'No notes available' %></p>
</div>
```

## 🤝 Contributing

Feel free to fork this repository and customize it for your needs! If you make improvements that could benefit others:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📄 License

ISC

## 📧 Support

For issues or questions:
- Open an issue on GitHub
- Check existing issues for solutions
- Review this README for common problems

## 🎯 Roadmap

Potential future enhancements:
- [ ] API endpoints for programmatic access
- [ ] Export data to CSV/Excel
- [ ] Email notifications for critical usage levels
- [ ] Advanced reporting and analytics
- [ ] User role management (admin, viewer, etc.)
- [ ] Dashboard widgets and customization
- [ ] Automated data import from external systems
- [ ] Mobile app

## ✨ Credits

Built with ❤️ using Node.js, Express, PostgreSQL, and Docker.
