@echo off
setlocal
cd /d "%~dp0\.."
if not exist "Piyasa_Terminali_v23_4.py" (
 echo HATA: Orijinal Piyasa_Terminali_v23_4.py dosyasini depo ana klasorune kopyalayin.
 pause
 exit /b 1
)
where py >nul 2>&1
if errorlevel 1 (
 echo HATA: Python Launcher bulunamadi. Python 3.11 veya 3.12 kurun.
 pause
 exit /b 1
)
if not exist ".venv\Scripts\python.exe" (
 py -3 -m venv .venv
 if errorlevel 1 (echo Sanal ortam olusturulamadi.&pause&exit /b 1)
)
".venv\Scripts\python.exe" -m pip install -r api\requirements.txt
if errorlevel 1 (echo Paket kurulumu basarisiz.&pause&exit /b 1)
set "PT_ENGINE_FILE=%CD%\Piyasa_Terminali_v23_4.py"
if not defined PT_API_TOKEN (
 echo.
 echo Guclu bir API anahtari girin. Anahtar ekranda gorunecektir.
 set /p PT_API_TOKEN=API anahtari: 
)
if not defined PT_API_TOKEN (echo Anahtar bos olamaz.&pause&exit /b 1)
echo.
echo BIST Python motoru yerel adreste basliyor: http://127.0.0.1:8765
echo Android icin HTTPS erisimi gerekir. Tailscale Serve talimatlari: api\README.md
echo Bu pencereyi kapatmayin.
".venv\Scripts\python.exe" -m uvicorn api.bist_api:app --host 127.0.0.1 --port 8765
pause
