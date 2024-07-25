#!/bin/bash

# check if pipx is installed


# Check if poetry is installed
if ! command -v poetry &> /dev/null
then
    if ! command -v pipx &> /dev/null
    then
        echo "Please install pipx : https://pipx.pypa.io/stable/installation/"
        exit 1
    fi
    pipx install poetry
else
    echo "Poetry is already installed."
fi

poetry install

cd devon-tui
npm install
npm run build
# Try to install the package globally without sudo, if it fails, try with sudo
if ! npm install -g . 
then
    echo "Failed to install Devon globally without sudo. Trying with sudo..."
    sudo npm install -g .
fi

cd ..
export DEVON_TELEMETRY_DISABLED=true
echo "Devon is ready to use! Use the command 'devon' to start the Devon terminal."
