@echo off
setlocal

REM Start the Tech Turf server (development mode)
for /f "tokens=5" %%a in ('netstat -ano ^| findstr /R /C:":4000 .*LISTENING"') do (
	echo Stopping process %%a using port 4000...
	taskkill /F /PID %%a >nul 2>nul
)

call npm run dev

REM If startup fails (for example after a Node version change),
REM rebuild native modules and retry once.
if errorlevel 1 (
	echo.
	echo Startup failed. Attempting automatic native module repair...
	call npm rebuild better-sqlite3

	if errorlevel 1 (
		echo.
		echo Automatic repair failed. Run "npm install" and try again.
		goto :done
	)

	echo.
	echo Repair complete. Retrying startup...
	call npm run dev
)

:done
pause
endlocal
