import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Query
from typing import List, Dict, Any, Optional
from app.simulation.engine import simulation_engine
from app.schemas.schemas import AlertItemResponse

router = APIRouter(prefix="/api/v1/alerts", tags=["Mission Control Alert Management"])

_acknowledged_alerts: Dict[str, Dict[str, Any]] = {}

@router.get("", response_model=List[AlertItemResponse])
async def list_active_alerts(
    severity: Optional[str] = Query(None, description="INFO, WARNING, CRITICAL")
):
    """Retrieves all active alerts from conjunction screening, subsystem faults, and anomaly detection."""
    alerts = []
    
    # 1. From active conjunction alerts
    for conj in simulation_engine.active_alerts:
        alert_id = conj.get("id", str(uuid.uuid4()))
        ack_info = _acknowledged_alerts.get(alert_id, {})
        alerts.append({
            "id": alert_id,
            "alert_type": "CONJUNCTION",
            "severity": conj.get("risk_level", "WARNING"),
            "title": conj.get("title", "Orbital Conjunction Warning"),
            "message": f"Miss distance {conj.get('miss_distance_m')} m. Close approach warning.",
            "source_entity_id": conj.get("id"),
            "epoch": datetime.fromisoformat(conj.get("epoch", simulation_engine.current_epoch.isoformat())),
            "is_acknowledged": ack_info.get("is_acknowledged", False),
            "acknowledged_at": ack_info.get("acknowledged_at")
        })

    # 2. From active satellite faults
    for sat in simulation_engine.satellites.values():
        for f_type, sev in sat.get("active_faults", {}).items():
            f_id = f"alert-fault-{sat['id']}-{f_type}"
            ack_info = _acknowledged_alerts.get(f_id, {})
            alerts.append({
                "id": f_id,
                "alert_type": "SUBSYSTEM_FAULT",
                "severity": "CRITICAL" if sev > 1.2 else "WARNING",
                "title": f"Subsystem Failure: {f_type}",
                "message": f"{sat['name']} experiencing {f_type} (severity {sev}x). Subsystem status: {sat.get('subsystem_status')}.",
                "source_entity_id": sat["id"],
                "epoch": simulation_engine.current_epoch,
                "is_acknowledged": ack_info.get("is_acknowledged", False),
                "acknowledged_at": ack_info.get("acknowledged_at")
            })

    # 3. From low battery state (< 25%)
    for sat in simulation_engine.satellites.values():
        if sat.get("battery_soc_pct", 100.0) < 25.0:
            b_id = f"alert-batt-{sat['id']}"
            ack_info = _acknowledged_alerts.get(b_id, {})
            alerts.append({
                "id": b_id,
                "alert_type": "POWER_DEPLETION",
                "severity": "CRITICAL" if sat["battery_soc_pct"] < 15.0 else "WARNING",
                "title": f"Low Battery SoC: {sat['name']}",
                "message": f"State of charge at {sat['battery_soc_pct']}%. Below 25% contingency threshold.",
                "source_entity_id": sat["id"],
                "epoch": simulation_engine.current_epoch,
                "is_acknowledged": ack_info.get("is_acknowledged", False),
                "acknowledged_at": ack_info.get("acknowledged_at")
            })

    if severity:
        alerts = [a for a in alerts if a["severity"].upper() == severity.upper()]

    return alerts

@router.post("/{alert_id}/acknowledge", response_model=AlertItemResponse)
async def acknowledge_alert(alert_id: str):
    """Operator acknowledgment of a mission alert."""
    now = simulation_engine.current_epoch
    _acknowledged_alerts[alert_id] = {
        "is_acknowledged": True,
        "acknowledged_at": now
    }

    simulation_engine.record_event(
        "ALERT_ACKNOWLEDGED",
        f"Alert {alert_id} acknowledged by flight director",
        "INFO"
    )

    return {
        "id": alert_id,
        "alert_type": "GENERIC",
        "severity": "INFO",
        "title": "Alert Acknowledged",
        "message": f"Alert {alert_id} has been acknowledged.",
        "source_entity_id": None,
        "epoch": now,
        "is_acknowledged": True,
        "acknowledged_at": now
    }

@router.get("/history", response_model=List[Dict[str, Any]])
async def get_alerts_history():
    """Returns chronological audit history of all recorded events and alert transitions."""
    return simulation_engine.recent_events

