from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from typing import List, Dict, Any, Optional, Set
import uuid

@dataclass
class MissionTaskItem:
    id: str
    satellite_id: str
    name: str
    task_type: str  # EARTH_OBSERVATION, RF_SURVEILLANCE, GROUND_DOWNLINK_DUMP, ORBITAL_MANEUVER
    priority: int  # 1 (lowest) to 5 (critical)
    duration_seconds: float
    energy_cost_wh: float
    earliest_start_epoch: datetime
    deadline_epoch: datetime
    prerequisites: List[str] = field(default_factory=list)
    state: str = "SUBMITTED"  # SUBMITTED, SCHEDULED, EXECUTING, SUCCEEDED, FAILED, CANCELLED
    scheduled_start_epoch: Optional[datetime] = None
    scheduled_end_epoch: Optional[datetime] = None
    rejection_reason: Optional[str] = None


class MissionScheduler:
    """
    Priority-Weighted Greedy EDF Mission Scheduler with Dependency Resolution and Subsystem Constraints.
    """

    def __init__(self, battery_capacity_wh: float = 200.0, min_soc_pct: float = 25.0):
        self.battery_capacity_wh = battery_capacity_wh
        self.min_soc_pct = min_soc_pct
        self.tasks: Dict[str, MissionTaskItem] = {}

    def add_task(self, task: MissionTaskItem) -> MissionTaskItem:
        self.tasks[task.id] = task
        return task

    def check_circular_dependencies(self, task_list: List[MissionTaskItem]) -> None:
        """
        Validates that task prerequisite graph is a Directed Acyclic Graph (DAG).
        Raises ValueError if a cycle is detected (TC-MIS-001).
        """
        task_map = {t.id: t for t in task_list}
        visited: Set[str] = set()
        recursion_stack: Set[str] = set()

        def dfs(task_id: str):
            visited.add(task_id)
            recursion_stack.add(task_id)
            
            task = task_map.get(task_id)
            if task:
                for prereq_id in task.prerequisites:
                    if prereq_id in task_map:
                        if prereq_id not in visited:
                            dfs(prereq_id)
                        elif prereq_id in recursion_stack:
                            raise ValueError(f"Circular dependency detected involving task {task_id} -> {prereq_id}")

            recursion_stack.remove(task_id)

        for t in task_list:
            if t.id not in visited:
                dfs(t.id)

    def schedule_all(self, current_epoch: datetime) -> List[MissionTaskItem]:
        """
        Schedules all submitted tasks across satellites using priority-weighted Greedy EDF.
        """
        pending = [t for t in self.tasks.values() if t.state in ("SUBMITTED", "SCHEDULED")]
        
        # 1. Check DAG cycle freedom
        self.check_circular_dependencies(pending)

        # 2. Sort by Priority descending, then earliest deadline ascending
        # Score R(t) = priority * 1000 - (deadline - current_epoch in seconds) / 60
        def ranking_score(t: MissionTaskItem) -> float:
            time_to_deadline = max(1.0, (t.deadline_epoch - current_epoch).total_seconds())
            return (t.priority * 10000.0) - (time_to_deadline / 60.0)

        pending.sort(key=ranking_score, reverse=True)

        # 3. Maintain scheduled intervals per satellite: list of (start, end, task_id, priority)
        timeline_per_sat: Dict[str, List[tuple]] = {}

        scheduled_results: List[MissionTaskItem] = []

        usable_energy_wh = self.battery_capacity_wh * (1.0 - self.min_soc_pct / 100.0)

        for task in pending:
            # Check energy budget invariant
            if task.energy_cost_wh > usable_energy_wh:
                task.state = "CANCELLED"
                task.rejection_reason = (
                    f"Energy demand ({task.energy_cost_wh:.1f} Wh) exceeds satellite usable battery margin "
                    f"({usable_energy_wh:.1f} Wh) above {self.min_soc_pct}% SoC"
                )
                scheduled_results.append(task)
                continue

            sat_id = task.satellite_id
            if sat_id not in timeline_per_sat:
                timeline_per_sat[sat_id] = []

            # Earliest start considering prerequisites
            earliest_possible = max(current_epoch, task.earliest_start_epoch)
            for prereq_id in task.prerequisites:
                prereq_task = self.tasks.get(prereq_id)
                if prereq_task and prereq_task.scheduled_end_epoch:
                    earliest_possible = max(earliest_possible, prereq_task.scheduled_end_epoch)

            # Find earliest gap in satellite timeline
            duration = timedelta(seconds=task.duration_seconds)
            candidate_start = earliest_possible
            scheduled = False

            while candidate_start + duration <= task.deadline_epoch:
                candidate_end = candidate_start + duration
                
                # Check overlaps with existing intervals
                overlap = False
                conflicting_slot = None
                
                for slot in timeline_per_sat[sat_id]:
                    s_start, s_end, s_tid, s_prio = slot
                    if not (candidate_end <= s_start or candidate_start >= s_end):
                        overlap = True
                        conflicting_slot = slot
                        break

                if not overlap:
                    # Slot is free
                    task.scheduled_start_epoch = candidate_start
                    task.scheduled_end_epoch = candidate_end
                    task.state = "SCHEDULED"
                    task.rejection_reason = None
                    timeline_per_sat[sat_id].append((candidate_start, candidate_end, task.id, task.priority))
                    timeline_per_sat[sat_id].sort(key=lambda x: x[0])
                    scheduled = True
                    break
                else:
                    # Slot occupied. Can we preempt if our priority is higher?
                    s_start, s_end, s_tid, s_prio = conflicting_slot
                    if task.priority > s_prio:
                        # Preempt lower priority task
                        preempted_task = self.tasks.get(s_tid)
                        if preempted_task:
                            preempted_task.state = "SUBMITTED"
                            preempted_task.scheduled_start_epoch = None
                            preempted_task.scheduled_end_epoch = None
                            preempted_task.rejection_reason = f"Preempted by higher priority task {task.name} (P{task.priority})"
                        timeline_per_sat[sat_id].remove(conflicting_slot)
                        # retry this candidate slot
                        continue
                    else:
                        # Step forward past this conflicting slot
                        candidate_start = s_end

            if not scheduled:
                task.state = "FAILED"
                task.rejection_reason = f"Could not find feasible window before deadline {task.deadline_epoch.isoformat()}"

            scheduled_results.append(task)

        return scheduled_results

