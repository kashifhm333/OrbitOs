import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException
from typing import List, Dict, Any
from app.simulation.engine import simulation_engine
from app.schemas.schemas import FaultInjectRequest, FaultRecordResponse
from app.ml.anomaly_detector import TelemetryAnomalyDetector

router = APIRouter(prefix="/api/v1/faults", tags=["Simulation Fault Injection"])

_fault_audit_log: List[Dict[str, Any]] = []

@router.post("/inject", response_model=FaultRecordResponse)
async def inject_fault(req: FaultInjectRequest):
    """
    Injects a physical subsystem fault into a selected satellite:
    - SOLAR_ARRAY_DROP: Simulates solar cell string micro-meteoroid damage or shadowing.
    - BATTERY_DEGRADATION: Simulates high internal resistance and rapid capacity drop.
    - THERMAL_RUNAWAY: Simulates payload heater stuck ON or radiator loss.
    - VOLTAGE_SPIKE: Simulates power distribution unit (PDU) transient surge.
    - COMM_FAILURE: Simulates transmitter lockup or antenna pointing loss.
    """
    try:
        res = simulation_engine.inject_fault(req.satellite_id, req.fault_type, req.severity)
    except KeyError as e:
        raise HTTPException(status_code=404, detail=str(e))

    fault_id = f"flt-{str(uuid.uuid4())[:8]}"
    now = simulation_engine.current_epoch

    record = {
        "id": fault_id,
        "satellite_id": res["satellite_id"],
        "fault_type": req.fault_type,
        "severity": req.severity,
        "injected_epoch": now,
        "resolved_epoch": None,
        "status": "ACTIVE",
        "details": {
            "description": f"Injected {req.fault_type} with severity multiplier {req.severity}",
            "simulation_tick": simulation_engine.tick_number
        }
    }
    _fault_audit_log.insert(0, record)
    return record

@router.post("/clear/{satellite_id}")
async def clear_fault(satellite_id: str):
    """Clears all active faults on the satellite and restores nominal subsystem telemetry."""
    try:
        res = simulation_engine.clear_fault(satellite_id)
    except KeyError as e:
        raise HTTPException(status_code=404, detail=str(e))

    now = simulation_engine.current_epoch
    for rec in _fault_audit_log:
        if rec["satellite_id"] == res["satellite_id"] and rec["status"] == "ACTIVE":
            rec["status"] = "RESOLVED"
            rec["resolved_epoch"] = now

    return {
        "status": "RESOLVED",
        "satellite_id": res["satellite_id"],
        "message": "Subsystem restored to nominal operational state."
    }

@router.get("/active", response_model=List[Dict[str, Any]])
async def get_active_faults():
    """Lists all currently active faults across the constellation fleet."""
    return simulation_engine.get_active_faults()

@router.get("/history", response_model=List[FaultRecordResponse])
async def get_fault_history():
    """Retrieves chronological log of all injected and resolved simulation faults."""
    return _fault_audit_log

