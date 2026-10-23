@echo off
title LabPulse Smart Inventory & Asset Management System
echo ======================================================
echo  Starting LabPulse Smart Lab Inventory System...
echo ======================================================
cd /d "%~dp0"

if not exist node_modules (
    echo First time setup: Installing dependencies...
    call npm install
)

echo Starting Node.js server on port 3000...
start "" "http://localhost:3000"
npm start
pause
