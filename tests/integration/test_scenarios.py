import pytest
from app.simulation.engine import SimulationEngine

def test_scenario_01_nominal_launch():
    """Scenario 1: Clean satellite launch with zero debris collision, smooth flight."""
    engine = SimulationEngine()
    state = engine.load_scenario("nominal")
    assert state["scenario_id"] == "nominal"
    assert state["collision_detected"] is False
    assert state["status"] == "NOMINAL"
    assert len(engine.satellites) == 1
    assert len(engine.resident_debris) == 1

    # Run for 5 ticks
    for _ in range(5):
        engine.step_tick()

    snap = engine.get_current_snapshot()
    sc_state = snap.scenario_state
    assert sc_state["collision_detected"] is False
    assert sc_state["status"] == "NOMINAL"
    assert sc_state["closest_distance_m"] > 100000.0  # > 100 km separation
    assert "Nominal orbit verified" in sc_state["message"]

def test_scenario_02_debris_collision_strike():
    """Scenario 2: Launch into hazardous 500.8km orbit, directly strikes Cosmos 2251 fragment."""
    engine = SimulationEngine()
    state = engine.load_scenario("debris_strike")
    assert state["scenario_id"] == "debris_strike"
    assert state["collision_detected"] is False

    # At t=0 separation is ~9.1 km. Run 4 ticks to impact
    for _ in range(4):
        engine.step_tick()

    snap = engine.get_current_snapshot()
    sc_state = snap.scenario_state
    assert sc_state["collision_detected"] is True
    assert sc_state["status"] == "COLLISION_IMPACT"
    assert sc_state["closest_distance_m"] <= 50.0
    assert "COLLISION DETECTED" in sc_state["message"]
    assert "500.8 km" in sc_state["message"]
    assert "Cosmos 2251" in sc_state["message"]

def test_scenario_03_satellite_collision_test_fail():
    """Scenario 3: Two satellites on intersecting crossing tracks collide head-on, test failed."""
    engine = SimulationEngine()
    state = engine.load_scenario("sat_collision")
    assert state["scenario_id"] == "sat_collision"
    assert state["collision_detected"] is False
    assert len(engine.satellites) == 2

    # At t=0 separation is ~43.1 km. Run 4 ticks to impact
    for _ in range(4):
        engine.step_tick()

    snap = engine.get_current_snapshot()
    sc_state = snap.scenario_state
    assert sc_state["collision_detected"] is True
    assert sc_state["status"] == "TEST_FAILED"
    assert sc_state["closest_distance_m"] <= 50.0
    assert "TEST FAILED: SATELLITE-TO-SATELLITE COLLISION!" in sc_state["message"]
