@echo off
REM Stop all node processes (use with caution)
REM No need to change directory; this stops all Node.js processes globally
taskkill /F /IM node.exe
pause
