import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.simulation.engine import simulation_engine

@pytest.mark.asyncio
async def test_health_check_endpoint():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get("/healthz")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "HEALTHY"
        assert data["active_satellites"] >= 3
        assert data["safety_mode"] == "SIMULATION_ONLY_ISOLATED"


@pytest.mark.asyncio
async def test_list_and_create_satellite():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # List initial satellites
        res = await client.get("/api/v1/satellites")
        assert res.status_code == 200
        sats = res.json()
        assert len(sats) >= 3

        # Create new satellite
        new_sat = {
            "name": "TestSat-Delta",
            "dry_mass_kg": 180.0,
            "propellant_mass_kg": 25.0,
            "semi_major_axis_km": 6878.137,
            "eccentricity": 0.001,
            "inclination_deg": 97.4,
            "raan_deg": 45.0,
            "arg_periapsis_deg": 0.0,
            "true_anomaly_deg": 0.0
        }
        res_create = await client.post("/api/v1/satellites", json=new_sat)
        assert res_create.status_code == 201
        created = res_create.json()
        assert created["name"] == "TestSat-Delta"
        assert created["dry_mass_kg"] == 180.0
        assert created["is_synthetic"] is True


@pytest.mark.asyncio
async def test_simulation_control_flow():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # Step exactly one tick
        res_step = await client.post("/api/v1/simulations/control", json={"action": "STEP"})
        assert res_step.status_code == 200
        
        # Check status
        res_status = await client.get("/api/v1/simulations/status")
        assert res_status.status_code == 200
        status_data = res_status.json()
        assert status_data["tick_number"] >= 1
        
        # Reset simulation
        res_reset = await client.post("/api/v1/simulations/control", json={"action": "RESET"})
        assert res_reset.status_code == 200
        assert res_reset.json()["clock_state"] == "READY"

