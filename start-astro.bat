@echo off
set PATH=C:\nodejs20;%PATH%
cd /d "C:\Users\User\Desktop\Lightweight Web Architecture\web"
call npx astro dev --host 127.0.0.1 --port 4321 > "C:\Users\User\Desktop\Lightweight Web Architecture\.astro-dev.log" 2>&1
