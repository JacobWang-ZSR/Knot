# git

## local git
\\NAS-PAOPAO\git\knot.git
git init --bare

git remote add local \\NAS-PAOPAO\git\knot.git   
git config --global --add safe.directory "\\NAS-PAOPAO\git\knot.git"

git push local main

## github
git remote add github https://github.com/JacobWang-ZSR/Knot

git push github main

# Distro

## Use source on NAS

https://docker.1ms.run

## Install

sudo docker compose up -d

# Local run

cd D:\Workspace\codex\RopeNod
npm install
npm start

This is rerun everything
$pid = (netstat -ano | Select-String ':8081' | Select-String 'LISTENING' | ForEach-Object { ($_ -split '\s+')[-1] } | Select-Object -First 1); if ($pid) { Stop-Process -Id $pid -Force }; node src/app.js


# quick command

git push local main
git push github main

sudo docker compose up --build -d

$pid = (netstat -ano | Select-String ':8081' | Select-String 'LISTENING' | ForEach-Object { ($_ -split '\s+')[-1] } | Select-Object -First 1); if ($pid) { Stop-Process -Id $pid -Force }; node src/app.js
