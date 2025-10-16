# SKD Systems Customer Dashboard 🚀

A professional customer management dashboard with integrated ticketing, time tracking, and documentation capabilities.

## ✨ Current Features

✅ **Customer Management** - Full CRUD operations  
✅ **User Authentication** - Secure login with roles  
✅ **Admin Controls** - Protected management interfaces  
✅ **Customer Portal** - Customers see only their data  
✅ **Hours Tracking** - Monitor usage  
✅ **Infrastructure Stats** - Track resources  
✅ **Zammad Integration** - Professional ticketing (in progress)  

## 🚀 Quick Start

```bash
git clone https://github.com/sborzillo/SKDsystems_customer_dash.git
cd SKDsystems_customer_dash

# Setup environment
cp .env.example .env
nano .env  # Add your configuration

# Start services
docker-compose up -d

# Access
# Dashboard: http://localhost:3000
# Zammad: http://localhost:8080
# Default login: admin / admin123
```

## 📖 Documentation

- [Zammad Setup Guide](docs/ZAMMAD_SETUP.md)

## 🔄 Next Steps

1. Complete Zammad setup (see docs/ZAMMAD_SETUP.md)
2. Add ticket routes to server.js
3. Integrate Clockify API
4. Add documentation system

See full documentation in project wiki.
