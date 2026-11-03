from fastapi import APIRouter, HTTPException
from app.simulation.engine import simulation_engine
from app.schemas.schemas import SimulationControlRequest, SimulationStatusResponse

router = APIRouter(prefix="/api/v1/simulations", tags=["Simulations"])

@router.get("/status", response_model=SimulationStatusResponse)
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

@router.post("/control")
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

