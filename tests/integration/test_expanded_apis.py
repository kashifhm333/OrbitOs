import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_health_v1_endpoint():
    resp = client.get("/api/v1/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "HEALTHY"
    assert data["safety_mode"] == "SIMULATION_ONLY_ISOLATED"
    assert "active_satellites" in data

def test_telemetry_latest_and_history():
    resp = client.get("/api/v1/telemetry/sat-001/latest")
    assert resp.status_code == 200
    data = resp.json()
    assert data["satellite_id"] == "sat-001"
    assert "power" in data
    assert "thermal" in data
    assert "orbit" in data
    assert "communication" in data
    assert data["power"]["bus_voltage_v"] > 0

    # Advance clock to ensure history points exist
    client.post("/api/v1/simulations/control", json={"action": "STEP"})

    hist_resp = client.get("/api/v1/telemetry/sat-001/history")
    assert hist_resp.status_code == 200
    hist = hist_resp.json()
    assert hist["count"] >= 1
    assert len(hist["history"]) >= 1

def test_orbits_endpoints():
    orb_resp = client.get("/api/v1/orbits/sat-001")
    assert orb_resp.status_code == 200
    orb = orb_resp.json()
    assert orb["semi_major_axis_km"] > 6000
    assert orb["orbital_period_minutes"] > 80

    traj_resp = client.get("/api/v1/orbits/sat-001/trajectory?points=32")
    assert traj_resp.status_code == 200
    assert len(traj_resp.json()["trajectory"]) == 32

    prop_resp = client.post("/api/v1/orbits/propagate", json={
        "semi_major_axis_km": 6878.137,
        "eccentricity": 0.001,
        "inclination_deg": 97.4,
        "delta_t_seconds": 600.0
    })
    assert prop_resp.status_code == 200
    assert "final_true_anomaly_deg" in prop_resp.json()

def test_ground_passes_endpoints():
    passes_resp = client.get("/api/v1/passes/upcoming?horizon_hours=12")
    assert passes_resp.status_code == 200
    data = passes_resp.json()
    assert "passes" in data
    assert data["count"] > 0

    sat_passes = client.get("/api/v1/passes/sat-001?horizon_hours=12")
    assert sat_passes.status_code == 200
    assert len(sat_passes.json()["passes"]) > 0

def test_imagery_lifecycle():
    list_resp = client.get("/api/v1/imagery")
    assert list_resp.status_code == 200
    items = list_resp.json()
    assert len(items) >= 3

    gen_resp = client.post("/api/v1/imagery/generate", json={
        "satellite_id": "sat-002",
        "target_name": "Test Observation Target",
        "target_lat": 15.0,
        "target_lon": 45.0,
        "spectral_band": "RGB"
    })
    assert gen_resp.status_code == 200
    img = gen_resp.json()
    assert img["is_synthetic"] is True

    down_resp = client.get(f"/api/v1/imagery/{img['id']}/download")
    assert down_resp.status_code == 200
    assert "image/svg+xml" in down_resp.headers["content-type"]
    assert "OrbitOS" in down_resp.text

def test_fault_injection_and_recovery():
    # Inject fault
    inj_resp = client.post("/api/v1/faults/inject", json={
        "satellite_id": "sat-001",
        "fault_type": "SOLAR_ARRAY_DROP",
        "severity": 1.5
    })
    assert inj_resp.status_code == 200
    assert inj_resp.json()["status"] == "ACTIVE"

    # Verify active faults list
    act_resp = client.get("/api/v1/faults/active")
    assert act_resp.status_code == 200
    assert any(f["fault_type"] == "SOLAR_ARRAY_DROP" for f in act_resp.json())

    # Step simulation and check telemetry reflects degradation
    client.post("/api/v1/simulations/control", json={"action": "STEP"})
    tel_resp = client.get("/api/v1/telemetry/sat-001/latest")
    assert tel_resp.json()["power"]["solar_power_w"] < 50.0

    # Clear fault
    clear_resp = client.post("/api/v1/faults/clear/sat-001")
    assert clear_resp.status_code == 200

    # Step again and check recovery
    client.post("/api/v1/simulations/control", json={"action": "STEP"})
    tel_rec = client.get("/api/v1/telemetry/sat-001/latest")
    assert tel_rec.json()["power"]["solar_power_w"] > 200.0

def test_alerts_and_acknowledgment():
    alerts_resp = client.get("/api/v1/alerts")
    assert alerts_resp.status_code == 200
    alerts = alerts_resp.json()
    assert isinstance(alerts, list)

    if alerts:
        a_id = alerts[0]["id"]
        ack_resp = client.post(f"/api/v1/alerts/{a_id}/acknowledge")
        assert ack_resp.status_code == 200
        assert ack_resp.json()["is_acknowledged"] is True

def test_reports_generation_and_download():
    gen_resp = client.post("/api/v1/reports/generate", json={
        "report_type": "MISSION_SUMMARY",
        "title": "Automated Constellation Assessment",
        "format": "MARKDOWN"
    })
    assert gen_resp.status_code == 200
    rep = gen_resp.json()
    assert "Fleet Summary" in rep["content"]

    down_resp = client.get(f"/api/v1/reports/{rep['id']}/download")
    assert down_resp.status_code == 200
    assert "OrbitOS Mission Operations Report" in down_resp.text

def test_ml_models_metadata():
    resp = client.get("/api/v1/ml/models")
    assert resp.status_code == 200
    data = resp.json()
    assert "anomaly_detector" in data
    assert "resource_forecaster" in data

