import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_api_health_and_root():
    """Verifies system health and root endpoints."""
    resp = client.get("/healthz")
    assert resp.status_code == 200
    assert resp.json()["status"] == "HEALTHY"
    assert resp.json()["safety_mode"] == "SIMULATION_ONLY_ISOLATED"

def test_external_data_endpoints():
    """Verifies external data endpoints and offline fallbacks."""
    status_resp = client.get("/api/external/status")
    assert status_resp.status_code == 200
    assert len(status_resp.json()["providers"]) == 3

    weather_resp = client.get("/api/external/space-weather")
    assert weather_resp.status_code == 200
    assert "solar_flares" in weather_resp.json()

    celestrak_resp = client.get("/api/external/celestrak")
    assert celestrak_resp.status_code == 200
    assert "satellites" in celestrak_resp.json()

    horizons_resp = client.get("/api/external/horizons")
    assert horizons_resp.status_code == 200

def test_ground_stations_api():
    """Verifies ground station list, visibility, and pass prediction."""
    gs_resp = client.get("/api/ground-stations")
    assert gs_resp.status_code == 200
    stations = gs_resp.json()
    assert len(stations) >= 3

    vis_resp = client.get("/api/ground-stations/status")
    assert vis_resp.status_code == 200
    assert "visibility" in vis_resp.json()

    # Pass prediction for SAT-001
    pred_resp = client.get("/api/ground-stations/predict/SAT-001?horizon_hours=12")
    assert pred_resp.status_code == 200
    assert "passes" in pred_resp.json()

def test_missions_api_lifecycle():
    """Verifies creating, scheduling, and cancelling mission tasks."""
    create_payload = {
        "satellite_id": "SAT-001",
        "name": "Integration Test Imaging",
        "task_type": "EARTH_OBSERVATION",
        "priority": 4,
        "duration_seconds": 300.0,
        "energy_cost_wh": 12.0
    }
    resp = client.post("/api/missions/tasks", json=create_payload)
    assert resp.status_code == 200
    task_id = resp.json()["id"]

    # Schedule tasks
    sched_resp = client.post("/api/missions/schedule")
    assert sched_resp.status_code == 200

    # Delete task
    del_resp = client.delete(f"/api/missions/tasks/{task_id}")
    assert del_resp.status_code == 200
    assert del_resp.json()["status"] == "SUCCESS"

def test_conjunction_and_maneuvers_api():
    """Verifies screening trigger, maneuver plan generation, approval, and execution."""
    screen_resp = client.post("/api/conjunctions/screen-all?horizon_hours=6")
    assert screen_resp.status_code == 200
    assert "conjunctions_flagged" in screen_resp.json()

    # Plan maneuver for SAT-001
    plan_resp = client.post("/api/maneuvers/plan/SAT-001?nominal_dv_mps=1.0")
    assert plan_resp.status_code == 200
    candidates = plan_resp.json()["candidates"]
    assert len(candidates) > 0

    top_candidate_id = plan_resp.json()["recommended_candidate_id"]

    # Approve candidate
    appr_resp = client.post(f"/api/maneuvers/{top_candidate_id}/approve")
    assert appr_resp.status_code == 200
    assert appr_resp.json()["status"] == "ARMED"

    # Execute candidate
    exec_resp = client.post(f"/api/maneuvers/{top_candidate_id}/execute")
    assert exec_resp.status_code == 200
    assert exec_resp.json()["status"] == "SUCCESS"

def test_ai_intelligence_api():
    """Verifies anomaly evaluation, fault injection, and 24-hr resource forecast."""
    anom_resp = client.get("/api/intelligence/anomaly/SAT-001")
    assert anom_resp.status_code == 200
    assert "anomaly_detected" in anom_resp.json()

    # Fault injection
    fault_payload = {
        "satellite_id": "SAT-001",
        "fault_type": "SOLAR_ARRAY_DROP",
        "severity": 1.2
    }
    inj_resp = client.post("/api/intelligence/fault-inject", json=fault_payload)
    assert inj_resp.status_code == 200

    # Resource forecast
    fc_resp = client.get("/api/intelligence/forecast/SAT-001?horizon_hours=12")
    assert fc_resp.status_code == 200
    assert "trajectory" in fc_resp.json()

