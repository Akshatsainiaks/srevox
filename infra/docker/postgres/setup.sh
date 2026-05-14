#!/bin/bash
# Run on your VMware machine to set up Loopzen database

echo "Setting up Loopzen database..."

# Create database and user
docker exec podwatch-postgres psql -U postgres << 'SQL'
CREATE USER loopzen WITH PASSWORD 'loopzen_dev';
CREATE DATABASE loopzen OWNER loopzen;
GRANT ALL PRIVILEGES ON DATABASE loopzen TO loopzen;
SQL

# Load schema
docker exec -i podwatch-postgres psql -U loopzen -d loopzen < /path/to/init.sql

echo "✅ Database ready!"
echo "Host: localhost:5432"
echo "Database: loopzen"
echo "User: loopzen / loopzen_dev"
