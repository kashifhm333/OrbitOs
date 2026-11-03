#!/usr/bin/env bash
# ==============================================================================
# OrbitOS — Autonomous Space Mission Management Simulator
# One-Click Launch Script for Ubuntu / Linux Workstations
# ==============================================================================

set -eo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# ANSI Color Codes
CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
PURPLE='\033[0;35m'
BOLD='\033[1m'
NC='\033[0m' # No Color

echo -e "${CYAN}${BOLD}"
cat << "EOF"
   ____       _     _ _    ___  ____  
  / __ \_____| |__ (_) |_ / _ \/ ___| 
 / / _` | '__| '_ \| | __| | | \___ \ 
| | (_| | |  | |_) | | |_| |_| |___) |
 \ \__,_|_|  |_.__/|_|\__|\___/|____/ 
  \____/  AUTONOMOUS SPACE MISSION MANAGEMENT SIMULATOR
EOF
echo -e "${NC}"
echo -e "${PURPLE}==================================================================${NC}"
echo -e "${BOLD}Starting OrbitOS Local Mission Control Stack...${NC}"
echo -e "${PURPLE}==================================================================${NC}"

# ------------------------------------------------------------------------------
# 1. Dependency Pre-Flight Checks
# ------------------------------------------------------------------------------
echo -e "\n${CYAN}[1/5] Checking System Dependencies...${NC}"

if ! command -v python3 &> /dev/null; then
    echo -e "${RED}Error: python3 is not installed. Please install Python 3.12+ (sudo apt install python3 python3-venv).${NC}"
    exit 1
fi

if ! command -v node &> /dev/null; then
    echo -e "${RED}Error: node is not installed. Please install Node.js (https://nodejs.org).${NC}"
    exit 1
fi

if ! command -v npm &> /dev/null; then
    echo -e "${RED}Error: npm is not installed. Please install npm (sudo apt install npm).${NC}"
    exit 1
fi

PYTHON_VERSION=$(python3 --version | awk '{print $2}')
NODE_VERSION=$(node --version)
echo -e "  ${GREEN}✓${NC} Python: ${BOLD}$PYTHON_VERSION${NC}"
echo -e "  ${GREEN}✓${NC} Node.js: ${BOLD}$NODE_VERSION${NC}"

# ------------------------------------------------------------------------------
# 2. Environment Configuration
# ------------------------------------------------------------------------------
echo -e "\n${CYAN}[2/5] Checking Configuration Environment...${NC}"

if [ ! -f .env ]; then
    if [ -f .env.example ]; then
        echo -e "  ${YELLOW}!${NC} .env not found. Copying from .env.example..."
        cp .env.example .env
    else
        echo -e "  ${YELLOW}!${NC} Creating default .env file..."
        cat << 'ENVFILE' > .env
ENVIRONMENT=development
LOG_LEVEL=INFO
API_HOST=0.0.0.0
API_PORT=8001
CORS_ORIGINS=["http://localhost:3000", "http://127.0.0.1:3000"]
DATABASE_URL=sqlite+aiosqlite:///./orbitos.db
SIMULATION_TICK_SECONDS=1.0
DEFAULT_SCENARIO_SEED=42
NASA_API_KEY=mCB7BzpD6WCzrJgfJgngMMtgmBmFWhbHCdp8WkJg
CELESTRAK_CACHE_HOURS=24
HORIZONS_CACHE_DAYS=7
ENVFILE
    fi
fi
echo -e "  ${GREEN}✓${NC} Environment file active (.env)"

# ------------------------------------------------------------------------------
# 3. Backend Virtualenv & Dependencies
# ------------------------------------------------------------------------------
echo -e "\n${CYAN}[3/5] Initializing Python Virtual Environment...${NC}"

if [ ! -d ".venv" ]; then
    echo -e "  ${YELLOW}!${NC} Creating Python virtualenv at .venv..."
    python3 -m venv .venv
fi

source .venv/bin/activate

if ! python3 -c "import fastapi, uvicorn, scipy, sklearn, sqlalchemy, aiosqlite" &> /dev/null; then
    echo -e "  ${YELLOW}!${NC} Installing required Python packages (one-time setup)..."
    pip install --quiet --upgrade pip
    pip install --quiet -r backend/requirements.txt
fi
echo -e "  ${GREEN}✓${NC} Python virtual environment verified."

# ------------------------------------------------------------------------------
# 4. Frontend Node Modules
# ------------------------------------------------------------------------------
echo -e "\n${CYAN}[4/5] Checking Frontend Dependencies...${NC}"

if [ ! -d "frontend/node_modules" ]; then
    echo -e "  ${YELLOW}!${NC} Installing frontend dependencies (one-time npm install)..."
    (cd frontend && npm install --silent)
fi
echo -e "  ${GREEN}✓${NC} Frontend dependencies verified."

# ------------------------------------------------------------------------------
# 5. Process Cleanup & Launch Daemons
# ------------------------------------------------------------------------------
echo -e "\n${CYAN}[5/5] Launching OrbitOS Mission Control Stack...${NC}"

# Kill any previous OrbitOS instance on ports 8001 or 3000
fuser -k 8001/tcp &> /dev/null || true
fuser -k 3000/tcp &> /dev/null || true

# Cleanup trap to kill child background processes on exit
cleanup() {
    echo -e "\n\n${YELLOW}Shutting down OrbitOS Mission Control...${NC}"
    if [ -n "$BACKEND_PID" ]; then
        kill "$BACKEND_PID" 2>/dev/null || true
    fi
    if [ -n "$FRONTEND_PID" ]; then
        kill "$FRONTEND_PID" 2>/dev/null || true
    fi
    echo -e "${GREEN}All OrbitOS services stopped cleanly.${NC}"
    exit 0
}

trap cleanup SIGINT SIGTERM EXIT

# Start Backend Server
echo -e "  ${PURPLE}»${NC} Launching FastAPI backend on ${BOLD}http://localhost:8001${NC}..."
PYTHONPATH=backend uvicorn app.main:app --host 0.0.0.0 --port 8001 --log-level warning &
BACKEND_PID=$!

# Wait for backend healthcheck
BACKEND_READY=0
for i in {1..30}; do
    if curl -s http://localhost:8001/healthz | grep -q "HEALTHY"; then
        BACKEND_READY=1
        break
    fi
    sleep 0.5
done

if [ $BACKEND_READY -eq 0 ]; then
    echo -e "  ${RED}✗ Backend failed to start. Check logs above.${NC}"
    exit 1
fi
echo -e "  ${GREEN}✓${NC} Backend simulation engine is ${BOLD}ONLINE${NC}."

# Start Frontend Dev Server
echo -e "  ${PURPLE}»${NC} Launching React 3D dashboard on ${BOLD}http://localhost:3000${NC}..."
(cd frontend && npm run dev -- --host 0.0.0.0 --port 3000) &
FRONTEND_PID=$!

# Wait for frontend dev server
FRONTEND_READY=0
for i in {1..30}; do
    if curl -s http://localhost:3000/ | grep -q "html"; then
        FRONTEND_READY=1
        break
    fi
    sleep 0.5
done

if [ $FRONTEND_READY -eq 0 ]; then
    echo -e "  ${RED}✗ Frontend failed to start. Check logs above.${NC}"
    exit 1
fi
echo -e "  ${GREEN}✓${NC} Frontend 3D interface is ${BOLD}ONLINE${NC}."

# ------------------------------------------------------------------------------
# Stack Ready & Browser Launch
# ------------------------------------------------------------------------------
echo -e "\n${GREEN}${BOLD}==================================================================${NC}"
echo -e "${GREEN}${BOLD}  ORBITOS MISSION CONTROL IS READY!${NC}"
echo -e "${GREEN}${BOLD}==================================================================${NC}"
echo -e "  ${BOLD}Dashboard URL:${NC}      ${CYAN}http://localhost:3000${NC}"
echo -e "  ${BOLD}Backend API:${NC}        ${CYAN}http://localhost:8001${NC}"
echo -e "  ${BOLD}API Documentation:${NC}  ${CYAN}http://localhost:8001/docs${NC}"
echo -e "  ${BOLD}Health Check:${NC}       ${CYAN}http://localhost:8001/healthz${NC}"
echo -e "${PURPLE}------------------------------------------------------------------${NC}"
echo -e "${YELLOW}Press [CTRL+C] at any time to halt all services cleanly.${NC}"
echo -e "${PURPLE}------------------------------------------------------------------${NC}"

# Open browser if in desktop environment
if command -v xdg-open &> /dev/null && [ -n "$DISPLAY" ]; then
    xdg-open "http://localhost:3000" &> /dev/null || true
elif command -v sensible-browser &> /dev/null && [ -n "$DISPLAY" ]; then
    sensible-browser "http://localhost:3000" &> /dev/null || true
fi

# Keep script foregrounded waiting for signals
wait

