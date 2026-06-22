@echo off
cd /d "F:\Claude学習\100kin-blog"
git add .
for /f "tokens=1-5 delims=/ " %%a in ('date /t') do set d=%%a-%%b-%%c
for /f "tokens=1-2 delims=: " %%a in ('time /t') do set t=%%a:%%b
git commit -m "auto save %d% %t%"
git push
pause
