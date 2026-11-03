import pytest
from datetime import datetime, timedelta, timezone
from app.mission.scheduler import MissionScheduler, MissionTaskItem

def test_circular_dependency_detection():
    """TC-MIS-001: Verifies that circular task dependencies raise ValueError."""
    scheduler = MissionScheduler()
    now = datetime(2026, 11, 4, 12, 0, 0, tzinfo=timezone.utc)
    
    t1 = MissionTaskItem(
        id="T1", satellite_id="SAT-001", name="Task 1", task_type="EARTH_OBSERVATION",
        priority=3, duration_seconds=300, energy_cost_wh=10,
        earliest_start_epoch=now, deadline_epoch=now + timedelta(hours=2),
        prerequisites=["T2"]
    )
    t2 = MissionTaskItem(
        id="T2", satellite_id="SAT-001", name="Task 2", task_type="EARTH_OBSERVATION",
        priority=3, duration_seconds=300, energy_cost_wh=10,
        earliest_start_epoch=now, deadline_epoch=now + timedelta(hours=2),
        prerequisites=["T1"]
    )
    
    with pytest.raises(ValueError, match="Circular dependency detected"):
        scheduler.check_circular_dependencies([t1, t2])

def test_excessive_energy_rejection():
    """TC-MIS-002: Verifies that tasks exceeding usable battery SoC margin are cancelled."""
    scheduler = MissionScheduler(battery_capacity_wh=200.0, min_soc_pct=25.0)
    now = datetime(2026, 11, 4, 12, 0, 0, tzinfo=timezone.utc)
    
    # Usable energy is 200 * (1 - 0.25) = 150 Wh. Task requests 180 Wh.
    t_heavy = MissionTaskItem(
        id="T-HEAVY", satellite_id="SAT-001", name="High Power Radar", task_type="RF_SURVEILLANCE",
        priority=3, duration_seconds=1800, energy_cost_wh=180.0,
        earliest_start_epoch=now, deadline_epoch=now + timedelta(hours=4)
    )
    scheduler.add_task(t_heavy)
    results = scheduler.schedule_all(now)
    
    assert results[0].state == "CANCELLED"
    assert "exceeds satellite usable battery margin" in results[0].rejection_reason

def test_priority_preemption():
    """TC-MIS-003: Higher priority task preempts overlapping lower priority task."""
    scheduler = MissionScheduler()
    now = datetime(2026, 11, 4, 12, 0, 0, tzinfo=timezone.utc)
    
    # Low priority routine task (Priority 2)
    t_routine = MissionTaskItem(
        id="T-ROUTINE", satellite_id="SAT-001", name="Routine Cal", task_type="SUBSYSTEM_CALIBRATION",
        priority=2, duration_seconds=600, energy_cost_wh=10,
        earliest_start_epoch=now, deadline_epoch=now + timedelta(hours=1)
    )
    # High priority avoidance or critical task (Priority 5) at exactly the same time window
    t_urgent = MissionTaskItem(
        id="T-URGENT", satellite_id="SAT-001", name="Emergency Imaging", task_type="EARTH_OBSERVATION",
        priority=5, duration_seconds=600, energy_cost_wh=10,
        earliest_start_epoch=now, deadline_epoch=now + timedelta(hours=1)
    )
    scheduler.add_task(t_routine)
    scheduler.add_task(t_urgent)
    
    results = scheduler.schedule_all(now)
    res_map = {t.id: t for t in results}
    
    assert res_map["T-URGENT"].state == "SCHEDULED"
    assert res_map["T-URGENT"].scheduled_start_epoch == now
    # T-ROUTINE should have been displaced or rescheduled after T-URGENT
    assert res_map["T-ROUTINE"].scheduled_start_epoch is None or res_map["T-ROUTINE"].scheduled_start_epoch >= now + timedelta(seconds=600)

