from fastapi import APIRouter, HTTPException
from app.simulation.engine import simulation_engine
from app.schemas.schemas import SimulationControlRequest, SimulationStatusResponse

router = APIRouter(tags=["Simulations"])

@router.get("/api/v1/simulations/status", response_model=SimulationStatusResponse)
@router.get("/api/v1/simulation/status", response_model=SimulationStatusResponse)
async def get_simulation_status():
    return SimulationStatusResponse(
        simulation_id=simulation_engine.simulation_id,
        scenario_name=simulation_engine.scenario_name,
        clock_state=simulation_engine.clock_state,
        current_epoch=simulation_engine.current_epoch,
        tick_number=simulation_engine.tick_number,
        time_acceleration=simulation_engine.time_acceleration,
        satellite_count=len(simulation_engine.satellites)
    )

@router.post("/api/v1/simulations/control")
@router.post("/api/v1/simulation/control")
async def control_simulation(req: SimulationControlRequest):
    action = req.action.upper()
    
    if action == "PLAY":
        simulation_engine.start(rate=req.rate)
    elif action == "PAUSE":
        simulation_engine.pause()
    elif action == "STEP":
        simulation_engine.pause()
        snapshot = simulation_engine.step_tick()
        await simulation_engine.broadcast_tick(snapshot)
    elif action == "RESET":
        simulation_engine.reset()
    elif action == "SET_SPEED":
        if req.rate:
            simulation_engine.set_speed(req.rate)
    else:
        raise HTTPException(status_code=400, detail=f"Invalid simulation action: {action}")
        
    return {
        "status": "OK",
        "action_executed": action,
        "clock_state": simulation_engine.clock_state,
        "time_acceleration": simulation_engine.time_acceleration,
        "current_epoch": simulation_engine.current_epoch.isoformat()
    }


AVAILABLE_SCENARIOS = [
    {
        "id": "nominal",
        "number": 1,
        "name": "Scenario 1: Nominal Clean Launch",
        "description": "Satellite launched into safe 650 km LEO orbit. No debris collisions, zero hazards, smooth nominal flight.",
        "expected_outcome": "PASS / NOMINAL"
    },
    {
        "id": "debris_strike",
        "number": 2,
        "name": "Scenario 2: Orbital Debris Strike",
        "description": "Satellite launched at 500.8 km altitude, 80.2° inclination directly intersecting Cosmos 2251 debris path. Strikes debris and is destroyed.",
        "expected_outcome": "COLLISION / ORBITAL HAZARD"
    },
    {
        "id": "sat_collision",
        "number": 3,
        "name": "Scenario 3: Satellite-to-Satellite Collision",
        "description": "Two fleet satellites (Alpha & Crosser) on intersecting crossing tracks collide head-on at orbital node. Test Case FAILED.",
        "expected_outcome": "FAIL / MISSION COLLISION"
    }
]

@router.get("/api/v1/simulations/scenarios")
@router.get("/api/simulations/scenarios")
async def list_scenarios():
    return {
        "active_scenario": simulation_engine.active_scenario,
        "scenario_state": simulation_engine.scenario_state,
        "scenarios": AVAILABLE_SCENARIOS
    }

@router.post("/api/v1/simulations/scenarios/{scenario_id}")
@router.post("/api/simulations/scenarios/{scenario_id}")
async def load_simulation_scenario(scenario_id: str):
    state = simulation_engine.load_scenario(scenario_id)
    snap = simulation_engine.get_current_snapshot()
    await simulation_engine.broadcast_tick(snap)
    return {
        "status": "LOADED",
        "active_scenario": simulation_engine.active_scenario,
        "scenario_state": state
    }
