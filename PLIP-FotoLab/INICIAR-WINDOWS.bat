@echo off
start "PLIP FotoLab" cmd /k "node server.mjs"
timeout /t 2 /nobreak >nul
start http://127.0.0.1:8080
