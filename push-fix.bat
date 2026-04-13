@echo off
cd /d "c:\Users\54265\Downloads\diseñov0sistemagym"
git add package.json
git commit -m "fix: optimize sqlite3 postinstall - use prebuilt binaries"
git push origin main
pause
