#!/bin/bash
echo "?? Starting Agri-Guard Servers in Codespaces..."

# Ensure MariaDB is running
sudo service mariadb start

# 1. Start PHP Backend Server on port 8000
echo "1?? Starting PHP Backend on http://localhost:8000..."
php -S 0.0.0.0:8000 -t backend &

# 2. Start AI Model Server on port 5000
echo "2?? Starting AI Flask Server on http://localhost:5000..."
cd backend/ai_server
python app.py &
cd ../..

# 3. Start Expo App
echo "3?? Starting Expo React Native App..."
cd agri-guard-app
export EXPO_ROUTER_DISABLE_RN_NAVIGATION_CHECK=1
npx expo start --web

