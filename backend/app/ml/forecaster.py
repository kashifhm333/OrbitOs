import math
from datetime import datetime, timedelta, timezone
from typing import Dict, Any, List
import numpy as np

from app.astrodynamics.propagator import propagate_orbit_keplerian
from app.bus.eclipse import is_in_eclipse
from app.bus.power import simulate_power_step

class ResourceForecaster:
    """
    Forecasting Engine for 24-Hour Battery State of Charge (SoC) and Propellant Reserves.
    Computes expected resource trajectory and 95% confidence bounds.
    """

    @staticmethod
    def forecast_resources(
        satellite_meta: Dict[str, Any],
        keplerian_elements: Dict[str, float],
        start_epoch: datetime,
        current_soc_pct: float,
        current_propellant_kg: float,
        horizon_hours: float = 24.0,
        step_minutes: float = 5.0
    ) -> Dict[str, Any]:
        """
        Projects battery SoC and propellant mass forward over horizon_hours.
        """
        total_steps = int((horizon_hours * 60.0) / step_minutes)
        step_seconds = step_minutes * 60.0

        soc_curve = []
        propellant_curve = []

        sim_soc = current_soc_pct
        sim_prop = current_propellant_kg

        # Orbital period to estimate eclipse frequency
        a_m = keplerian_elements["semi_major_axis_m"]
        period_s = 2.0 * math.pi * math.sqrt((a_m ** 3) / 398600.4418e9)

        # Baseline noise standard deviation
        sigma_residual = 1.8  # ~1.8% SoC modeling uncertainty

        for step in range(total_steps + 1):
            t_offset = step * step_seconds
            step_epoch = start_epoch + timedelta(seconds=t_offset)

            # Propagate position to check eclipse
            r_eci, _ = propagate_orbit_keplerian(keplerian_elements, t_offset)
            in_shadow = is_in_eclipse(r_eci, step_epoch)

            # Step power dynamics
            sim_soc, net_power = simulate_power_step(
                current_soc_pct=sim_soc,
                in_eclipse=in_shadow,
                dt_seconds=step_seconds,
                battery_capacity_wh=200.0,
                solar_max_w=240.0,
                bus_load_w=120.0
            )

            lower_bound = max(0.0, sim_soc - 1.96 * sigma_residual)
            upper_bound = min(100.0, sim_soc + 1.96 * sigma_residual)

            # Passive atmospheric drag fuel expenditure (~0.0001 kg/hr in LEO)
            sim_prop = max(0.0, sim_prop - (0.0001 * (step_minutes / 60.0)))

            if step % 2 == 0:  # Sample every 10 minutes to keep response lightweight
                soc_curve.append({
                    "epoch": step_epoch.isoformat(),
                    "predicted_soc_pct": round(sim_soc, 2),
                    "lower_ci_95": round(lower_bound, 2),
                    "upper_ci_95": round(upper_bound, 2),
                    "in_eclipse": in_shadow
                })

        return {
            "satellite_id": satellite_meta.get("id"),
            "satellite_name": satellite_meta.get("name"),
            "forecast_start_epoch": start_epoch.isoformat(),
            "horizon_hours": horizon_hours,
            "final_predicted_soc_pct": round(sim_soc, 2),
            "final_predicted_propellant_kg": round(sim_prop, 4),
            "min_soc_projected": round(min(p["predicted_soc_pct"] for p in soc_curve), 2),
            "brownout_risk": min(p["predicted_soc_pct"] for p in soc_curve) < 20.0,
            "trajectory": soc_curve
        }

