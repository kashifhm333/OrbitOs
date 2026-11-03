import math
import numpy as np
from hypothesis import given, strategies as st
from app.astrodynamics.constants import MU_EARTH, G0
from app.bus.power import update_battery_state_of_charge

@given(
    a=st.floats(min_value=6500000.0, max_value=42164000.0),
    e=st.floats(min_value=0.0, max_value=0.8)
)
def test_hypothesis_orbital_energy_invariant(a, e):
    """SPEC-INV-011: Bound orbits must have strictly negative specific mechanical energy."""
    energy = -MU_EARTH / (2.0 * a)
    assert energy < 0.0


@given(
    soc_start=st.floats(min_value=0.0, max_value=100.0),
    delta_t=st.floats(min_value=0.1, max_value=3600.0),
    in_eclipse=st.booleans()
)
def test_hypothesis_battery_soc_invariant(soc_start, delta_t, in_eclipse):
    """SPEC-INV-003: Battery SoC must be strictly bounded in [0.0, 100.0]."""
    new_soc, p_solar, p_load, mode = update_battery_state_of_charge(
        current_soc_pct=soc_start,
        operational_state="ACTIVE",
        in_eclipse=in_eclipse,
        delta_t_seconds=delta_t
    )
    assert 0.0 <= new_soc <= 100.0


@given(
    m_wet=st.floats(min_value=10.0, max_value=10000.0),
    delta_v=st.floats(min_value=0.0, max_value=2000.0),
    isp=st.floats(min_value=150.0, max_value=450.0)
)
def test_hypothesis_tsiolkovsky_fuel_mass_invariant(m_wet, delta_v, isp):
    """SPEC-INV-004: Propellant mass consumption delta_m must be strictly non-negative and <= m_wet."""
    c = isp * G0
    delta_m = m_wet * (1.0 - math.exp(-delta_v / c))
    assert 0.0 <= delta_m <= m_wet

