@echo off
set NODE_ENV=production
set PATH=C:\nodejs20;%PATH%
cd /d "C:\Users\User\Desktop\Lightweight Web Architecture\cms"
call npm run start > "C:\Users\User\Desktop\Lightweight Web Architecture\.strapi.log" 2>&1
