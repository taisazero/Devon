@echo off

call conda activate devon
REM Check if poetry is installed

poetry --version >nul 2>&1
if %errorlevel% neq 0 (
    echo Poetry is not installed, installing now...
    pipx install poetry
) else (
    echo Poetry is already installed.
)
REM Install dependencies and build the project
poetry install

cd devon-tui
npm install --no-audit --no-fund
npm run build
npm install -g . --no-audit --no-fund
cd ..

echo Devon is ready to use! Use the command 'devon' to start the Devon terminal.