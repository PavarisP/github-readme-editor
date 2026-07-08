@echo off
REM ============================================================
REM  Start the GitHub README Editor on a local web server so the
REM  File System Access API works (direct folder open + save,
REM  and no "upload all files" browser popup).
REM
REM  Use this to run the app offline / locally. Just double-click
REM  this file. It serves the current folder at
REM  http://localhost:3000 and opens it in your browser once the
REM  server is actually online.
REM
REM  The server runs IN this window. Closing this window (the X
REM  button) or pressing Ctrl+C stops the server too - nothing is
REM  left running in the background.
REM ============================================================

REM --- Internal mode: wait for the server, then open the browser.
REM     Launched in the background by the main flow below. ---
if /i "%~1"=="openbrowser" goto open_browser

REM --- On first launch, relaunch this window MINIMIZED so it stays
REM     out of the way in the taskbar (but is still there to close
REM     when you want to stop the server). The relaunched copy is
REM     passed "min" so it skips this step and runs for real. ---
if /i not "%~1"=="min" (
  start "" /min cmd /c ""%~f0" min"
  goto :eof
)

cd /d "%~dp0"

REM --- Safety net: kill any orphaned server still on port 3000 ---
REM (e.g. from an older version of this script that left one behind)
for /f "tokens=5" %%p in ('netstat -ano ^| findstr /r /c:"LISTENING" ^| findstr ":3000 "') do (
  taskkill /PID %%p /T /F >nul 2>nul
)

REM --- Pick a server: Node first, then Python ---
set "SERVER_CMD="
where node >nul 2>nul
if %errorlevel%==0 (
  set "SERVER_CMD=npx --yes serve -l 3000 ."
  goto have_server
)

where python >nul 2>nul
if %errorlevel%==0 (
  set "SERVER_CMD=python -m http.server 3000"
  goto have_server
)

echo Could not find Node.js or Python to run a local server.
echo Install either one, or use any static file server, then open
echo http://localhost:3000 in Chrome or Edge.
pause
goto :eof

:have_server

echo Starting local server at http://localhost:3000 ...
echo.

REM --- Launch this same script (in the background) to wait for the
REM     server and open the browser. It exits on its own. The server
REM     itself runs in the FOREGROUND below, so closing this window
REM     or pressing Ctrl+C stops the server with it. ---
start "" /b cmd /c ""%~f0" openbrowser"

echo ============================================================
echo  Server is running at http://localhost:3000 
echo  If the browser didn't open automatically, copy and paste that URL into your browser.
echo  Keep this window open - the app needs the server to work.
echo. 
echo  ^>^>^>  To STOP the server: close this window  ^<^<^<
echo ============================================================
echo.

REM --- Run the server in the foreground (this line blocks). Output
REM     is hidden to keep this window clean. Because it still runs in
REM     the foreground, closing this window or pressing Ctrl+C kills
REM     the server with it. ---
%SERVER_CMD% >nul 2>&1

echo.
echo Server stopped. http://localhost:3000 is now offline.
timeout /t 2 >nul
goto :eof

REM ============================================================
:open_browser
REM Poll the port for up to 30s; open the browser once it answers.
for /l %%i in (1,1,30) do (
  powershell -NoProfile -Command "try { (New-Object Net.Sockets.TcpClient('localhost',3000)).Close(); exit 0 } catch { exit 1 }" >nul 2>&1
  if not errorlevel 1 (
    start "" "http://localhost:3000"
    goto :eof
  )
  timeout /t 1 >nul
)
REM Timed out - open anyway so the user sees something.
start "" "http://localhost:3000"
goto :eof
