# Zammad Ticketing System Integration

## 🚀 Quick Start

### Step 1: Update Environment Variables

Copy the new variables to your `.env` file:

```bash
# Add these to your .env file
ZAMMAD_POSTGRES_PASS=zammad-secure-password
ZAMMAD_API_TOKEN=will-be-generated-after-setup
ZAMMAD_URL=http://zammad-nginx:8080
```

### Step 2: Start Zammad

```bash
cd SKDsystems_customer_dash
git pull

# Update your .env file with the new variables
nano .env  # or use your preferred editor

# Start all services (this will take 5-10 minutes on first run)
docker-compose up -d

# Watch the logs to see when Zammad is ready
docker-compose logs -f zammad-init
```

**Wait for this message:** `"Zammad initialization completed successfully"`

### Step 3: Initial Zammad Setup

1. Open Zammad in your browser: **http://localhost:8080**

2. Complete the setup wizard:
   - Create admin account (remember these credentials!)
   - Set organization name: `SKD Systems`
   - Configure email settings (optional for now)

3. Skip the agent/customer setup for now - we'll integrate this programmatically

### Step 4: Generate API Token

1. In Zammad, click your profile (bottom left)
2. Go to **Profile Settings** → **Token Access**
3. Click **Create** 
4. Name it: `Dashboard Integration`
5. Set permissions: **All access** (admin.*)
6. Copy the generated token
7. Add it to your `.env` file:
   ```
   ZAMMAD_API_TOKEN=your-copied-token-here
   ```

8. Restart the dashboard app:
   ```bash
   docker-compose restart app
   ```

### Step 5: Test the Integration

Once I finish the code integration, you'll be able to:
- View tickets in your dashboard
- Create tickets from the dashboard
- Link tickets to customers
- See ticket counts in dashboard widgets

## 🔧 Useful Commands

```bash
# View all logs
docker-compose logs -f

# View only Zammad logs
docker-compose logs -f zammad-railsserver

# Restart Zammad
docker-compose restart zammad-nginx zammad-railsserver

# Stop everything
docker-compose down

# Stop and remove all data (fresh start)
docker-compose down -v
```

## 📊 Services Running

- **Dashboard**: http://localhost:3000
- **Zammad**: http://localhost:8080
- **PostgreSQL**: localhost:5432

## 🎯 What's Integrated

The dashboard will show:
- **Tickets widget** - Open/closed ticket counts per customer
- **Recent tickets** - Latest ticket activity
- **Create ticket** - Quick ticket creation
- **Ticket list** - View all tickets with filtering

Admin features:
- Assign tickets
- Update ticket status
- View all customer tickets
- Link tickets to time entries

## 🔒 Security Notes

- Zammad admin account is separate from dashboard admin
- API token gives full access - keep it secure
- Change `ZAMMAD_POSTGRES_PASS` in production
- Use HTTPS in production (nginx reverse proxy recommended)

## ⚠️ Troubleshooting

**Zammad won't start:**
```bash
# Check logs
docker-compose logs zammad-init

# Common issue: Elasticsearch needs more memory
# Add to docker-compose.yml elasticsearch service:
environment:
  - "ES_JAVA_OPTS=-Xms1g -Xmx1g"
```

**Can't connect to Zammad from dashboard:**
- Ensure all containers are on the same network
- Check `ZAMMAD_URL` in .env is correct
- Verify API token is valid

**Port conflicts:**
- If port 8080 is in use, change it in docker-compose.yml:
  ```yaml
  ports:
    - "8081:8080"  # Use 8081 instead
  ```

## 📝 Next Steps

After setup is complete, I'll add:
1. Tickets page in dashboard
2. Ticket widgets on main dashboard
3. Customer-specific ticket views
4. Ticket creation form
5. Status update functionality
