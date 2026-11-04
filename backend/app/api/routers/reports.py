import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Response
from typing import List, Dict, Any, Optional
from app.simulation.engine import simulation_engine
from app.schemas.schemas import GenerateReportRequest, ReportResponse

router = APIRouter(prefix="/api/v1/reports", tags=["Mission Operations Reporting & Export"])

_reports_store: Dict[str, Dict[str, Any]] = {}

@router.post("/generate", response_model=ReportResponse)
async def generate_report(req: GenerateReportRequest):
    """
    Generates a formal aerospace mission report:
    - MISSION_SUMMARY: Fleet orbital status, mission completion rates, and power trends.
    - TELEMETRY_LOG: Subsystem telemetry metrics, bus voltages, and thermal states.
    - CONJUNCTION_ASSESSMENT: Collision screening results, close approach miss distances.
    - FLEET_STATUS: Comprehensive overview of all constellation satellites.
    """
    report_id = f"rep-{str(uuid.uuid4())[:8]}"
    now = simulation_engine.current_epoch

    sat_list = list(simulation_engine.satellites.values())
    if req.satellite_id:
        sat_list = [s for s in sat_list if s["id"] == req.satellite_id]

    content_lines = [
        f"# OrbitOS Mission Operations Report: {req.title}",
        f"**Report ID**: `{report_id}`  ",
        f"**Generated Epoch**: `{now.isoformat()}` (UTC)  ",
        f"**Simulation Tick**: #{simulation_engine.tick_number}  ",
        f"**Clock State**: {simulation_engine.clock_state} (Accel: {simulation_engine.time_acceleration}x)  ",
        f"**Report Type**: {req.report_type}  ",
        "---",
        "## 1. Constellation Fleet Summary",
        f"- Total Satellites Monitored: {len(sat_list)}",
        f"- Active Conjunction Alerts: {len(simulation_engine.active_alerts)}",
        f"- Active Hardware Faults: {len(simulation_engine.get_active_faults())}",
        "",
        "### Fleet Status Table",
        "| Satellite ID | Name | State | Battery SoC | Propellant | Eclipse | Subsystem |",
        "|---|---|---|---|---|---|---|"
    ]

    for s in sat_list:
        content_lines.append(
            f"| `{s['id']}` | {s['name']} | `{s['operational_state']}` | {s['battery_soc_pct']:.1f}% | {s['propellant_mass_kg']:.2f} kg | {'YES' if s.get('in_eclipse') else 'NO'} | {s.get('subsystem_status', 'NOMINAL')} |"
        )

    content_lines.extend([
        "",
        "## 2. Active Conjunction Safety Assessment"
    ])

    if not simulation_engine.active_alerts:
        content_lines.append("No conjunction hazards detected within the 24-hour screening horizon.")
    else:
        for a in simulation_engine.active_alerts:
            content_lines.append(
                f"- **{a.get('title')}**: Miss Distance = {a.get('miss_distance_m')} m | Risk Level = {a.get('risk_level')} | Epoch = {a.get('epoch')}"
            )

    content_lines.extend([
        "",
        "## 3. Mission Operations Event Log (Recent)"
    ])

    for evt in simulation_engine.recent_events[:10]:
        content_lines.append(
            f"- `[{evt['epoch']}]` **{evt['event_type']}**: {evt['title']} ({evt['severity']})"
        )

    content_lines.extend([
        "",
        "---",
        "*Safety Notice: OrbitOS is an autonomous space mission management simulator. This report is synthetically produced for simulation and research analysis only.*"
    ])

    full_markdown = "\n".join(content_lines)

    report_record = {
        "id": report_id,
        "report_type": req.report_type,
        "title": req.title,
        "generated_epoch": now,
        "format": req.format.upper(),
        "content": full_markdown,
        "file_path": f"/api/v1/reports/{report_id}/download"
    }

    _reports_store[report_id] = report_record
    simulation_engine.record_event(
        "REPORT_GENERATED",
        f"Mission Report '{req.title}' generated successfully",
        "INFO"
    )

    return report_record

@router.get("", response_model=List[ReportResponse])
async def list_reports():
    """Lists all previously generated operations reports."""
    return list(_reports_store.values())

@router.get("/{report_id}", response_model=ReportResponse)
async def get_report(report_id: str):
    """Retrieves full content of an operations report."""
    rep = _reports_store.get(report_id)
    if not rep:
        raise HTTPException(status_code=404, detail="Report not found")
    return rep

@router.get("/{report_id}/download")
async def download_report(report_id: str):
    """Downloads report as markdown or json document."""
    rep = _reports_store.get(report_id)
    if not rep:
        raise HTTPException(status_code=404, detail="Report not found")

    filename = f"OrbitOS-Report-{rep['id']}.md"
    return Response(
        content=rep["content"],
        media_type="text/markdown",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

