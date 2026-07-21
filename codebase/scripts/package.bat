@echo off
setlocal enabledelayedexpansion
REM ShelfPilot production packager (Windows batch).
REM Builds the UI (under base /shelfpilot/) + stages API and zips for Docker deploy.
REM The zip includes Dockerfile + docker-compose.yml; server runs: bash deploy.sh
REM
REM   scripts\package.bat
REM
REM Output: dist-package\shelfpilot-<version>-<stamp>.zip

REM Move to repo root (scripts\ -> codebase\)
cd /d "%~dp0.."
set "REPO=%CD%"

if "%VITE_BASE_PATH%"=="" set "VITE_BASE_PATH=/shelfpilot/"

REM Read version + build a timestamp using Node (avoids locale issues)
for /f "usebackq delims=" %%v in (`node -p "require('./package.json').version"`) do set "VERSION=%%v"
for /f "usebackq delims=" %%t in (`node -e "console.log(new Date().toISOString().replace(/[-:T]/g,'').slice(0,15))"`) do set "STAMP=%%t"
set "NAME=shelfpilot-%VERSION%-%STAMP%"
set "STAGE=%REPO%\.package\%NAME%"

echo ==^> Installing workspace dependencies (npm ci)
call npm ci || goto :err

echo ==^> Building web UI (base %VITE_BASE_PATH%)
call npm run build -w web || goto :err
if not exist "web\dist\index.html" ( echo !! web build missing web\dist\index.html & goto :err )

echo ==^> Staging package files
if exist "%REPO%\.package" rmdir /s /q "%REPO%\.package"
mkdir "%STAGE%\api"
mkdir "%STAGE%\web"
robocopy "api\src" "%STAGE%\api\src" /e /nfl /ndl /njh /njs /nc /ns >nul
copy /y "api\package.json" "%STAGE%\api\package.json" >nul
robocopy "web\dist" "%STAGE%\web\dist" /e /nfl /ndl /njh /njs /nc /ns >nul
copy /y "deploy\deploy.sh" "%STAGE%\" >nul
copy /y "deploy\start.sh" "%STAGE%\" >nul
copy /y "deploy\ecosystem.config.cjs" "%STAGE%\" >nul
copy /y "deploy\.env.example" "%STAGE%\" >nul
copy /y "deploy\README.md" "%STAGE%\README.md" >nul
copy /y "deploy\Dockerfile" "%STAGE%\Dockerfile" >nul
copy /y "deploy\docker-compose.yml" "%STAGE%\docker-compose.yml" >nul
> "%STAGE%\VERSION" echo %VERSION%
>> "%STAGE%\VERSION" echo %STAMP%

REM Lock API deps for reproducible server installs (npm ci inside the image)
echo ==^> Generating api/package-lock.json
pushd "%STAGE%\api"
call npm install --omit=dev --package-lock-only --no-audit --no-fund || ( popd & goto :err )
popd

REM Normalize shell scripts + Dockerfile to LF (CRLF breaks bash / Docker RUN on Linux)
node -e "const fs=require('fs');const d=process.argv[1];for(const f of ['deploy.sh','start.sh','Dockerfile','docker-compose.yml']){const p=d+'\\'+f;fs.writeFileSync(p,fs.readFileSync(p,'utf8').replace(/\r\n/g,'\n'));}" "%STAGE%"

echo ==^> Creating zip
if not exist "%REPO%\dist-package" mkdir "%REPO%\dist-package"
set "ZIP=%REPO%\dist-package\%NAME%.zip"
if exist "%ZIP%" del /q "%ZIP%"
pushd "%STAGE%"
tar -a -c -f "%ZIP%" api web deploy.sh start.sh ecosystem.config.cjs .env.example README.md Dockerfile docker-compose.yml VERSION || ( popd & goto :err )
popd

rmdir /s /q "%REPO%\.package"
echo.
echo ==^> Package ready: %ZIP%
echo     Copy to the server, unzip into a folder, then run ./deploy.sh
endlocal
exit /b 0

:err
echo.
echo Packaging failed.
endlocal
exit /b 1
