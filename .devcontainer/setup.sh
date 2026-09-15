#!/bin/bash
echo "?? Setting up Agri-Guard Codespace Environment..."

# Update packages & install PHP + MySQL
sudo apt-get update
sudo apt-get install -y php php-mysqli php-curl mariadb-server

# Start MySQL service
sudo service mariadb start

# Initialize database
sudo mysql -e "CREATE DATABASE IF NOT EXISTS agri_guard_db;"
sudo mysql agri_guard_db < backend/database.sql
php backend/create_audit.php

# Install Python dependencies
echo "?? Installing AI Python dependencies..."
cd backend/ai_server
pip install flask tensorflow pillow numpy werkzeug
cd ../..

# Install Node dependencies
echo "?? Installing App dependencies..."
cd agri-guard-app
npm install
cd ..

echo "? Codespace setup complete! Run ./start_codespaces.sh to launch all servers."
