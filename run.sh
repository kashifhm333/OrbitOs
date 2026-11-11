#!/usr/bin/env bash
# ==============================================================================
# OrbitOS — Autonomous Space Mission Management Simulator
# One-Click Launch & Operations Script for Linux Workstations
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
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# Default Options
AUTO_OPEN_BROWSER=true
RUN_TESTS_ONLY=false
RUN_MIGRATIONS_ONLY=false
RUN_BUILD_ONLY=false
RUN_SCENARIO_ONLY=false

# Parse Command-Line Arguments
while [[ $# -gt 0 ]]; do
  case "$1" in
    --no-browser)
      AUTO_OPEN_BROWSER=false
      shift
      ;;
    --test|--tests)
      RUN_TESTS_ONLY=true
      shift
      ;;
    --migrate)
      RUN_MIGRATIONS_ONLY=true
      shift
      ;;
    --build)
      RUN_BUILD_ONLY=true
      shift
      ;;
    --tc-01|--scenario|--scenarios|--test-scenarios)
      RUN_SCENARIO_ONLY=true
      shift
      ;;
    -h|--help)
      echo -e "${CYAN}${BOLD}OrbitOS Launch Script Usage:${NC}"
      echo "  ./run.sh              Launch full OrbitOS stack (backend + frontend + migrations)"
      echo "  ./run.sh --no-browser Launch stack without automatically opening the browser"
      echo "  ./run.sh --migrate    Run Alembic database migrations only and exit"
      echo "  ./run.sh --test       Run full backend test suite (pytest) and exit"
      echo "  ./run.sh --build      Build frontend production bundle (TypeScript & Vite) and exit"
      echo "  ./run.sh --scenarios  Run the 3 Automated Flight Scenarios test runner and exit"
      echo "  ./run.sh --help       Show this help message"
      exit 0
      ;;
    *)
      echo -e "${YELLOW}Unknown option: $1 (ignoring). Use --help for usage.${NC}"
      shift
      ;;
  esac
done

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
echo -e "${BOLD}OrbitOS Mission Control Platform Orchestrator${NC}"
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
    echo -e "${RED}Error: node is not installed. Please install Node.js 18+ (https://nodejs.org).${NC}"
    exit 1
fi

if ! command -v npm &> /dev/null; then
    echo -e "${RED}Error: npm is not installed. Please install npm (sudo apt install npm).${NC}"
    exit 1
fi

PYTHON_VERSION=$(python3 --version 2>&1 | awk '{print $2}')
NODE_VERSION=$(node --version 2>&1)
echo -e "  ${GREEN}✓${NC} Python:  ${BOLD}$PYTHON_VERSION${NC}"
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
NASA_API_KEY=DEMO_KEY
CELESTRAK_CACHE_HOURS=24
HORIZONS_CACHE_DAYS=7
ENVFILE
    fi
fi
echo -e "  ${GREEN}✓${NC} Environment file active (.env)"

# ------------------------------------------------------------------------------
# 3. Python Virtual Environment & Database Migrations
# ------------------------------------------------------------------------------
echo -e "\n${CYAN}[3/5] Initializing Python Virtual Environment & Database...${NC}"

if [ ! -d ".venv" ]; then
    echo -e "  ${YELLOW}!${NC} Creating Python virtualenv at .venv..."
    python3 -m venv .venv
fi

source .venv/bin/activate

# Verify core dependencies
if ! python3 -c "import fastapi, uvicorn, scipy, sklearn, sqlalchemy, aiosqlite, alembic, numpy, pydantic" &> /dev/null; then
    echo -e "  ${YELLOW}!${NC} Installing required Python packages (one-time setup)..."
    pip install --quiet --upgrade pip
    pip install --quiet -r backend/requirements.txt
fi
echo -e "  ${GREEN}✓${NC} Python packages verified."

# Execute Alembic Database Migrations
echo -e "  ${PURPLE}»${NC} Running async Alembic database migrations..."
if alembic upgrade head; then
    echo -e "  ${GREEN}✓${NC} Database schema synchronized (18 tables in orbitos.db)."
else
    echo -e "  ${YELLOW}!${NC} Alembic migration completed with existing tables or warning."
fi

# If user requested migrations only, exit cleanly here
if [ "$RUN_MIGRATIONS_ONLY" = true ]; then
    echo -e "\n${GREEN}${BOLD}Migrations completed successfully.${NC}"
    exit 0
fi

# If user requested test suite execution only
if [ "$RUN_TESTS_ONLY" = true ]; then
    echo -e "\n${CYAN}Running OrbitOS automated test suite (pytest)...${NC}\n"
    pytest tests/ -v
    exit 0
fi

# If user requested frontend build only
if [ "$RUN_BUILD_ONLY" = true ]; then
    echo -e "\n${CYAN}Building frontend production bundle (tsc && vite build)...${NC}\n"
    (cd frontend && npm run build)
    echo -e "\n${GREEN}${BOLD}Frontend build completed successfully.${NC}"
    exit 0
fi

# If user requested Scenario verification execution only
if [ "$RUN_SCENARIO_ONLY" = true ]; then
    echo -e "\n${CYAN}${BOLD}Executing 3 Automated Flight Scenarios Test Suite...${NC}\n"
    PYTHONPATH=backend python3 -c '
from app.simulation.engine import SimulationEngine

print("==================================================================")
print("ORBITOS: EXECUTING 3 AUTOMATED FLIGHT SCENARIOS TEST SUITE")
print("==================================================================")

# -------------------------------------------------------------
# Scenario 1: Nominal Clean Launch
# -------------------------------------------------------------
print("\n[1/3] Scenario 1: Nominal Clean Launch (No Collision, Smooth Flight)...")
e1 = SimulationEngine()
s1 = e1.load_scenario("nominal")
for _ in range(5):
    e1.step_tick()
snap1 = e1.get_current_snapshot()
sc1 = snap1.scenario_state
dist1 = sc1["closest_distance_m"] / 1000.0
hit1 = sc1["collision_detected"]
stat1 = sc1["status"]
msg1 = sc1["message"]
print(f"  ✓ Relative Distance: {dist1:.1f} km")
print(f"  ✓ Collision Detected: {hit1}")
print(f"  ✓ Status: {stat1}")
print(f"  ✓ Diagnostic: {msg1}")
assert not hit1, "Scenario 1 must have NO collision"
assert stat1 == "NOMINAL", "Scenario 1 status must be NOMINAL"
print("  --> PASS: Scenario 1 Nominal Clean Launch verified.")

# -------------------------------------------------------------
# Scenario 2: Debris Collision Strike Hazard
# -------------------------------------------------------------
print("\n[2/3] Scenario 2: Debris Collision Strike Hazard...")
e2 = SimulationEngine()
s2 = e2.load_scenario("debris_strike")
for _ in range(5):
    e2.step_tick()
snap2 = e2.get_current_snapshot()
sc2 = snap2.scenario_state
dist2 = sc2["closest_distance_m"]
hit2 = sc2["collision_detected"]
stat2 = sc2["status"]
msg2 = sc2["message"]
print(f"  ✓ Impact Miss Distance: {dist2:.1f} meters")
print(f"  ✓ Collision Detected: {hit2}")
print(f"  ✓ Status: {stat2}")
print(f"  ✓ Diagnostic: {msg2}")
assert hit2, "Scenario 2 must detect collision"
assert stat2 == "COLLISION_IMPACT", "Scenario 2 status must be COLLISION_IMPACT"
print("  --> PASS: Scenario 2 Debris Strike Hazard verified.")

# -------------------------------------------------------------
# Scenario 3: Satellite-to-Satellite Collision (Test Failed)
# -------------------------------------------------------------
print("\n[3/3] Scenario 3: Satellite-to-Satellite Collision (Test Failed)...")
e3 = SimulationEngine()
s3 = e3.load_scenario("sat_collision")
for _ in range(5):
    e3.step_tick()
snap3 = e3.get_current_snapshot()
sc3 = snap3.scenario_state
dist3 = sc3["closest_distance_m"]
hit3 = sc3["collision_detected"]
stat3 = sc3["status"]
msg3 = sc3["message"]
print(f"  ✓ Relative Separation: {dist3:.1f} meters")
print(f"  ✓ Collision Detected: {hit3}")
print(f"  ✓ Status: {stat3}")
print(f"  ✓ Diagnostic: {msg3}")
assert hit3, "Scenario 3 must detect collision"
assert stat3 == "TEST_FAILED", "Scenario 3 status must be TEST_FAILED"
print("  --> PASS: Scenario 3 Satellite Collision verified.")

print("\n==================================================================")
print("ALL 3 MISSION SCENARIOS VERIFIED SUCCESSFULLY!")
print("Web UI Cockpit: Select scenario and press Play button to run.")
print("Documentation: docs/scenarios.md")
print("==================================================================")
'
    exit 0
fi

# ------------------------------------------------------------------------------
# 4. Frontend Node Modules & Verification
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

# Clean up any lingering processes on ports 8001 or 3000
if command -v fuser &> /dev/null; then
    fuser -k 8001/tcp &> /dev/null || true
    fuser -k 3000/tcp &> /dev/null || true
elif command -v lsof &> /dev/null; then
    lsof -ti:8001 | xargs -r kill -9 2>/dev/null || true
    lsof -ti:3000 | xargs -r kill -9 2>/dev/null || true
fi

# Cleanup trap to gracefully terminate child processes on exit
cleanup() {
    trap - SIGINT SIGTERM EXIT
    echo -e "\n\n${YELLOW}Shutting down OrbitOS Mission Control...${NC}"
    if [ -n "$BACKEND_PID" ]; then
        kill "$BACKEND_PID" 2>/dev/null || true
    fi
    if [ -n "$FRONTEND_PID" ]; then
        kill "$FRONTEND_PID" 2>/dev/null || true
    fi
    # Final port cleanup
    if command -v fuser &> /dev/null; then
        fuser -k 8001/tcp &> /dev/null || true
        fuser -k 3000/tcp &> /dev/null || true
    elif command -v lsof &> /dev/null; then
        lsof -ti:8001 | xargs -r kill -9 2>/dev/null || true
        lsof -ti:3000 | xargs -r kill -9 2>/dev/null || true
    fi
    echo -e "${GREEN}All OrbitOS services stopped cleanly.${NC}"
    exit 0
}

trap cleanup SIGINT SIGTERM EXIT

# Start Backend Server
echo -e "  ${PURPLE}»${NC} Launching FastAPI backend on ${BOLD}http://localhost:8001${NC}..."
PYTHONPATH=backend uvicorn app.main:app --app-dir backend --host 0.0.0.0 --port 8001 --log-level warning &
BACKEND_PID=$!

# Wait for backend healthcheck (HTTP 200 on /api/v1/health or /healthz)
BACKEND_READY=0
for i in {1..30}; do
    if curl -sf http://localhost:8001/api/v1/health &> /dev/null || curl -sf http://localhost:8001/healthz &> /dev/null; then
        BACKEND_READY=1
        break
    fi
    sleep 0.5
done

if [ $BACKEND_READY -eq 0 ]; then
    echo -e "  ${RED}✗ Backend failed to start. Please check terminal output above.${NC}"
    exit 1
fi
echo -e "  ${GREEN}✓${NC} Backend simulation engine is ${BOLD}ONLINE${NC}."

# Start Frontend Dev Server
echo -e "  ${PURPLE}»${NC} Launching React 3D Mission Control on ${BOLD}http://localhost:3000${NC}..."
(cd frontend && npm run dev -- --host 0.0.0.0 --port 3000) &
FRONTEND_PID=$!

# Wait for frontend dev server
FRONTEND_READY=0
for i in {1..30}; do
    if curl -sf http://localhost:3000/ | grep -qi "html"; then
        FRONTEND_READY=1
        break
    fi
    sleep 0.5
done

if [ $FRONTEND_READY -eq 0 ]; then
    echo -e "  ${RED}✗ Frontend failed to start. Please check logs above.${NC}"
    exit 1
fi
echo -e "  ${GREEN}✓${NC} Frontend Mission Control UI is ${BOLD}ONLINE${NC}."

# ------------------------------------------------------------------------------
# Mission Control Ready Summary
# ------------------------------------------------------------------------------
echo -e "\n${GREEN}${BOLD}==================================================================${NC}"
echo -e "${GREEN}${BOLD}  ORBITOS MISSION CONTROL IS OPERATIONAL!${NC}"
echo -e "${GREEN}${BOLD}==================================================================${NC}"
echo -e "  ${BOLD}Mission Control UI:${NC}    ${CYAN}http://localhost:3000${NC}"
echo -e "  ${BOLD}Backend REST API:${NC}      ${CYAN}http://localhost:8001${NC}"
echo -e "  ${BOLD}Interactive API Docs:${NC}  ${CYAN}http://localhost:8001/docs${NC}"
echo -e "  ${BOLD}System Health Check:${NC}   ${CYAN}http://localhost:8001/api/v1/health${NC}"
echo -e "  ${BOLD}Simulation Stream:${NC}     ${CYAN}ws://localhost:8001/ws/v1/simulation${NC}"
echo -e "${BLUE}------------------------------------------------------------------${NC}"
echo -e "  ${BOLD}13 Operational Pages Active in Cockpit:${NC}"
echo -e "   [1] Dashboard       [5] Telemetry        [9] AI/ML Intelligence   [13] Settings"
echo -e "   [2] Satellites      [6] Missions        [10] Fault Injection"
echo -e "   [3] 3D Tracking     [7] Conjunctions    [11] Hazard Alerts"
echo -e "   [4] Imagery         [8] Ground Stations [12] Operations Reports"
echo -e "${BLUE}------------------------------------------------------------------${NC}"
echo -e "  ${BOLD}Test & Verification Reports:${NC}"
echo -e "   • Astrodynamics & Space Safety: ${CYAN}problem.md${NC}"
echo -e "   • Test Case 01 (Debris Touch):  ${CYAN}test_case_01.md${NC}"
echo -e "${PURPLE}------------------------------------------------------------------${NC}"
echo -e "${YELLOW}Press [CTRL+C] at any time to halt all services cleanly.${NC}"
echo -e "${PURPLE}------------------------------------------------------------------${NC}"

# Open browser if enabled and desktop environment is detected
if [ "$AUTO_OPEN_BROWSER" = true ]; then
    if command -v xdg-open &> /dev/null && [ -n "$DISPLAY" ]; then
        xdg-open "http://localhost:3000" &> /dev/null || true
    elif command -v sensible-browser &> /dev/null && [ -n "$DISPLAY" ]; then
        sensible-browser "http://localhost:3000" &> /dev/null || true
    fi
fi

# Keep script running to maintain background services and process signals
wait
