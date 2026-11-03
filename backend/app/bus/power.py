from typing import Tuple
from app.astrodynamics.constants import SOLAR_FLUX

# Default satellite bus power parameters
BATTERY_CAPACITY_JOULES = 1.08e6  # 300 Wh
SOLAR_PANEL_AREA_M2 = 0.5
SOLAR_CELL_EFFICIENCY = 0.28
CHARGE_EFFICIENCY = 0.90

POWER_LOADS = {
    "STANDBY": 20.0,       # Watts
    "ACTIVE": 45.0,        # Watts (Bus + Payload)
    "MANEUVERING": 80.0,   # Watts (Bus + Heaters/Valves)
    "SAFE_HOLD": 8.0,      # Watts (Minimal Survival)
    "DECOMMISSIONED": 0.0  # Off
}

def update_battery_state_of_charge(
    current_soc_pct: float,
    operational_state: str,
    in_eclipse: bool,
    delta_t_seconds: float,
    battery_capacity_joules: float = BATTERY_CAPACITY_JOULES,
    solar_area: float = SOLAR_PANEL_AREA_M2,
    solar_efficiency: float = SOLAR_CELL_EFFICIENCY
) -> Tuple[float, float, float, str]:
    """
    Computes updated battery state of charge (SoC) for a simulation step delta_t.
    
    Returns:
        (new_soc_pct, solar_power_w, load_power_w, updated_operational_state)
    """
    load_power = POWER_LOADS.get(operational_state, 20.0)
    
    if in_eclipse or operational_state == "DECOMMISSIONED":
        solar_power = 0.0
    else:
        solar_power = SOLAR_FLUX * solar_area * solar_efficiency  # ~190.5 W
        
    net_power = (solar_power * CHARGE_EFFICIENCY) - load_power
    delta_energy = net_power * delta_t_seconds
    
    # Delta percentage of battery capacity
    delta_pct = (delta_energy / battery_capacity_joules) * 100.0
    raw_soc = current_soc_pct + delta_pct
    
    # Enforce formal invariant SPEC-INV-003: 0.0 <= SoC <= 100.0
    new_soc = max(0.0, min(100.0, raw_soc))
    
    # Safe-hold mode trigger if battery critically depleted
    updated_state = operational_state
    if new_soc < 15.0 and operational_state not in ("SAFE_HOLD", "DECOMMISSIONED"):
        updated_state = "SAFE_HOLD"
        
    return new_soc, solar_power, load_power, updated_state


def simulate_power_step(
    current_soc_pct: float,
    in_eclipse: bool,
    dt_seconds: float,
    battery_capacity_wh: float = 200.0,
    solar_max_w: float = 240.0,
    bus_load_w: float = 120.0
) -> Tuple[float, float]:
    """
    Simulates a power step for resource forecasting.
    Returns:
        (new_soc_pct, net_power_w)
    """
    capacity_joules = battery_capacity_wh * 3600.0
    solar_power = 0.0 if in_eclipse else solar_max_w
    net_power = (solar_power * CHARGE_EFFICIENCY) - bus_load_w
    delta_energy = net_power * dt_seconds
    delta_pct = (delta_energy / capacity_joules) * 100.0
    new_soc = max(0.0, min(100.0, current_soc_pct + delta_pct))
    return new_soc, net_power


