import uuid
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

from app.mission.scheduler import MissionScheduler, MissionTaskItem
from app.simulation.engine import simulation_engine

router = APIRouter(tags=["Mission Planning & Optimization"])

scheduler = MissionScheduler(battery_capacity_wh=200.0, min_soc_pct=25.0)

class TaskCreatePayload(BaseModel):
    satellite_id: str
    name: str
    task_type: str = Field(default="EARTH_OBSERVATION", description="EARTH_OBSERVATION, RF_SURVEILLANCE, GROUND_DOWNLINK_DUMP, ORBITAL_MANEUVER")
    priority: int = Field(default=3, ge=1, le=5)
    duration_seconds: float = Field(default=300.0, gt=0.0)
    energy_cost_wh: float = Field(default=15.0, gt=0.0)
    earliest_start_epoch: Optional[datetime] = None
    deadline_epoch: Optional[datetime] = None
    prerequisites: List[str] = Field(default_factory=list)

class TaskResponsePayload(BaseModel):
    id: str
    satellite_id: str
    name: str
    task_type: str
    priority: int
    duration_seconds: float
    energy_cost_wh: float
    earliest_start_epoch: datetime
    deadline_epoch: datetime
    prerequisites: List[str]
    state: str
    scheduled_start_epoch: Optional[datetime] = None
    scheduled_end_epoch: Optional[datetime] = None
    rejection_reason: Optional[str] = None

@router.post("/tasks", response_model=TaskResponsePayload)
async def create_mission_task(payload: TaskCreatePayload):
    """
    Submits a new mission payload task to the constellation scheduling queue.
    """
    now = simulation_engine.current_epoch
    earliest = payload.earliest_start_epoch or now
    deadline = payload.deadline_epoch or (earliest + datetime.resolution * 86400 * 1000)
    
    if deadline <= earliest:
        raise HTTPException(status_code=400, detail="deadline_epoch must be strictly after earliest_start_epoch")

    task = MissionTaskItem(
        id=str(uuid.uuid4()),
        satellite_id=payload.satellite_id,
        name=payload.name,
        task_type=payload.task_type,
        priority=payload.priority,
        duration_seconds=payload.duration_seconds,
        energy_cost_wh=payload.energy_cost_wh,
        earliest_start_epoch=earliest,
        deadline_epoch=deadline,
        prerequisites=payload.prerequisites,
        state="SUBMITTED"
    )

    # Validate circular dependencies if any prerequisites are added
    temp_tasks = list(scheduler.tasks.values()) + [task]
    try:
        scheduler.check_circular_dependencies(temp_tasks)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))

    scheduler.add_task(task)
    return task

@router.get("/tasks", response_model=List[TaskResponsePayload])
async def list_mission_tasks(satellite_id: Optional[str] = Query(None)):
    """
    Retrieves all mission tasks, optionally filtered by satellite.
    """
    tasks = list(scheduler.tasks.values())
    if satellite_id:
        tasks = [t for t in tasks if t.satellite_id == satellite_id]
    return tasks

@router.post("/schedule", response_model=List[TaskResponsePayload])
async def trigger_schedule_optimization():
    """
    Executes the Priority-Weighted Greedy EDF optimization algorithm across all pending tasks.
    """
    now = simulation_engine.current_epoch
    results = scheduler.schedule_all(now)
    return results

@router.get("/tasks/{task_id}", response_model=TaskResponsePayload)
async def get_mission_task(task_id: str):
    """Retrieves details of a specific mission task."""
    task = scheduler.tasks.get(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return task

@router.put("/tasks/{task_id}", response_model=TaskResponsePayload)
async def update_mission_task(task_id: str, payload: TaskCreatePayload):
    """Updates parameters of an existing submitted mission task."""
    task = scheduler.tasks.get(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    task.name = payload.name
    task.satellite_id = payload.satellite_id
    task.task_type = payload.task_type
    task.priority = payload.priority
    task.duration_seconds = payload.duration_seconds
    task.energy_cost_wh = payload.energy_cost_wh
    if payload.earliest_start_epoch:
        task.earliest_start_epoch = payload.earliest_start_epoch
    if payload.deadline_epoch:
        task.deadline_epoch = payload.deadline_epoch
    task.prerequisites = payload.prerequisites
    return task

@router.delete("/tasks/{task_id}")
async def cancel_task(task_id: str):
    """
    Cancels and removes a mission task from the schedule queue.
    """
    if task_id not in scheduler.tasks:
        raise HTTPException(status_code=404, detail="Task not found")
    del scheduler.tasks[task_id]
    return {"status": "SUCCESS", "deleted_task_id": task_id}

