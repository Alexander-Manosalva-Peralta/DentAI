@echo off
title DentAI - Puente SQL Server SMILE QA
echo ============================================================
echo   DentAI - Microservicio Bridge para SQL Server SMILE QA
echo ============================================================
echo.
echo Iniciando servicio local en http://localhost:3000...
echo Mantenga esta ventana abierta mientras use la extension DentAI.
echo.
python "%~dp0server.py"
pause
