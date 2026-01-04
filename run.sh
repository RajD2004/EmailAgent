#!/bin/bash
# Run script for chess game

cd "$(dirname "$0")"

# Activate virtual environment
source venv/bin/activate

# Run the application
python3 main.py

