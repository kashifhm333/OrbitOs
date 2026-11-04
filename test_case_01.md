# OrbitOS Test Case Report — TC-ORB-001
## Autonomous Satellite Deployment, Orbital Conjunction Screening & Debris Collision Avoidance Verification

---

### Document Metadata

| Attribute | Specification |
|:---|:---|
| **Test Identifier** | `TC-ORB-001` |
| **System Under Test** | OrbitOS Mission Control Platform v1.0.0 |
| **Test Classification** | High-Fidelity Astrodynamics, Space Safety & Cockpit Execution |
| **Test Epoch** | `2026-11-04T12:00:00.000Z` |
| **Primary Test Asset** | `OrbitOS-Pioneer-X (Interceptor)` (`sat-ec1fd363`) |
| **Secondary Threat Object** | `Cosmos 2251 Fragment #4812` (`DEBRIS-COSMOS-2251`) |
| **Test Environment** | Ubuntu Linux 24.04 LTS, Python 3.12, FastAPI, React 18 / Three.js |
| **Execution Result** | **PASSED (100% Invariants Satisfied)** |

---

## 1. Executive Summary & Objective

In modern mega-constellation operations in Low Earth Orbit (LEO), orbital congestion poses a lethal threat. Spacecraft must detect hypervelocity conjunctions with cataloged orbital debris hours in advance, classify collision risk levels, and synthesize fuel-optimal evasive burns without human bottleneck delays.

The objective of **Test Case `TC-ORB-001`** is to:
1. **Deploy / Launch a Satellite**: Test launch a new synthetic spacecraft (`OrbitOS-Pioneer-X`) into LEO (~500.8 km altitude) directly onto an orbital trajectory that converges on resident space debris (`Cosmos 2251 Fragment #4812`).
2. **Execute Multi-Tier Conjunction Screening**: Subject the constellation to the 3-Tier screening pipeline ($\mathcal{O}(1)$ altitude envelope filter $\to$ coarse time-mesh sampling $\to$ Brent's scalar TCA minimization) to detect an impending collision touch scenario.
3. **Trigger Critical Hazard Alarms**: Verify that when the miss distance drops below 50 meters (in this run, **8.72 meters**), the flight software raises a `CRITICAL` collision alarm across telemetry and central alerts.
4. **Plan & Arm Autonomous Collision Avoidance Maneuver (CAM)**: Evaluate four autonomous burn strategies (In-Track Retrograde, In-Track Prograde, Cross-Track Normal, NO_ACTION) governed by the Tsiolkovsky Rocket Equation ($I_{sp} = 220$ s) and verify operator approval / arming.
5. **Verify Safety Invariants**: Confirm propellant reserve safety (`SPEC-PRE-002`), isolation safety (`SAF-BND-001`), and projected miss distance expansion ($> 4.9$ km).

---

## 2. Orbital Mechanics Setup & Ephemeris

The test injects `OrbitOS-Pioneer-X` into a Sun-synchronous circular orbit co-planar with cataloged debris fragment `DEBRIS-COSMOS-2251` (originating from the catastrophic 2009 Iridium 33 / Cosmos 2251 collision).

### 2.1 Orbital Elements Comparison

$$\begin{array}{|l|c|c|c|}
\hline
\textbf{Orbital Parameter} & \textbf{Debris Target (Cosmos 2251)} & \textbf{Interceptor (Pioneer-X)} & \textbf{Delta / Margin} \\
\hline
\text{Semi-Major Axis } (a) & 6878.937\text{ km} & 6878.937\text{ km} & 0.000\text{ km} \\
\text{Perigee Altitude } (h_p) & 500.80\text{ km} & 500.80\text{ km} & 0.00\text{ km} \\
\text{Eccentricity } (e) & 0.00150 & 0.00150 & 0.00000 \\
\text{Inclination } (i) & 97.4028^\circ \ (1.7000\text{ rad}) & 97.4028^\circ \ (1.7000\text{ rad}) & 0.0000^\circ \\
\text{RAAN } (\Omega) & 2.8648^\circ \ (0.0500\text{ rad}) & 2.8648^\circ \ (0.0500\text{ rad}) & 0.0000^\circ \\
\text{Arg. Periapsis } (\omega) & 0.0000^\circ \ (0.0000\text{ rad}) & 0.0000^\circ \ (0.0000\text{ rad}) & 0.0000^\circ \\
\text{Initial True Anomaly } (\nu) & 1.14591^\circ \ (0.020000\text{ rad}) & 1.14599^\circ \ (0.020001\text{ rad}) & +0.00008^\circ \\
\hline
\text{Dry Mass } (m_{\text{dry}}) & \text{N/A (Junk)} & 250.0\text{ kg} & - \\
\text{Propellant Mass } (m_{\text{prop}}) & 0.0\text{ kg} & 25.0\text{ kg} & \text{Hydrazine Monoprop} \\
\text{Specific Impulse } (I_{sp}) & \text{N/A} & 220.0\text{ s} & g_0 = 9.80665\text{ m/s}^2 \\
\hline
\end{array}$$

Because $\Delta \nu = 0.00008^\circ$, both spacecraft orbit in the same orbital plane at identical orbital velocities ($v \approx 7.60\text{ km/s}$), producing a close approach of **less than 10 meters**—virtually physical contact.

---

## 3. Step-by-Step Test Execution & Visual Inspection

### Phase 1: Spacecraft Launch & Constellation Insertion

The satellite is commissioned via the Mission Control Satellites API (`POST /api/v1/satellites`) and persisted asynchronously to SQLite/PostgreSQL with an active telemetry state, full battery charge ($100.0\%$), and nominal avionics.

```http
POST /api/v1/satellites HTTP/1.1
Content-Type: application/json

{
  "name": "OrbitOS-Pioneer-X (Interceptor)",
  "dry_mass_kg": 250.0,
  "propellant_mass_kg": 25.0,
  "semi_major_axis_km": 6878.937,
  "eccentricity": 0.0015,
  "inclination_deg": 97.4028,
  "raan_deg": 2.8648,
  "arg_periapsis_deg": 0.0,
  "true_anomaly_deg": 1.14599
}
```

**Response**:
`HTTP/1.1 201 Created` — Assigned UUID: `sat-ec1fd363`, ECI Position: `[6859549.07, 325543.14, 136227.16] m`, ECI Velocity: `[-102.97, -988.44, 7558.54] m/s`.

![01 Satellite Launch & Fleet Management](docs/screenshots/test_case_01/01_satellite_launch_fleet.png)
*Figure 1: Satellites Fleet Management cockpit showing `OrbitOS-Pioneer-X (Interceptor)` successfully deployed into active constellation alongside Sun-Sync Alpha, Polar Beta, and Equatorial Gamma.*

---

### Phase 2: Live Mission Control Dashboard & Proximity Geometry

Upon deployment, the main Mission Control dashboard integrates the new satellite into the real-time simulation WebSocket stream (`ws://localhost:3000/ws/v1/simulation`).

The central 3D WebGL geocentric viewport renders the satellite trajectory and Earth day/night terminator. The right telemetry pane reports orbital mechanics ($a = 6,878.9$ km, $e = 0.0015$, $i = 97.4^\circ$), 3-axis reaction wheel attitude, and EPS power status ($240$ W solar generation).

![02 Mission Control Dashboard](docs/screenshots/test_case_01/02_mission_control_dashboard.png)
*Figure 2: OrbitOS Mission Control Dashboard displaying 3D Earth, active constellation, and real-time telemetry readouts.*

---

### Phase 3: 3D Orbital Tracking & Close Approach Vector

Switching to the **3D Orbital Tracking View** allows the flight operations team to lock onto `OrbitOS-Pioneer-X (Interceptor)`. 

The HUD displays:
- **Frame**: 3D ECI J2000 Geocentric Inertial
- **Orbital Altitude**: $500.8$ km
- **Orbital Speed**: $7.62$ km/s
- **Sub-Satellite Position**: $1.13^\circ\text{ N}, 2.72^\circ\text{ E}$
- **Solar Flux**: Direct Sunlit (100% illumination)
- **Tracked Debris Layer**: Cosmos 2251 Fragment #4812 tracked in immediate vicinity.

![03 3D Orbital Tracking Close Approach](docs/screenshots/test_case_01/03_orbital_tracking_close_approach.png)
*Figure 3: 3D Orbital Tracking HUD locked onto Pioneer-X, illustrating orbital trajectory and proximity to Cosmos 2251 debris fragment.*

---

### Phase 4: Conjunction Screening & Critical Collision Touch Detection

The operator initiates the automated conjunction screening pipeline (`POST /api/v1/conjunctions/screen-all`).

#### Screening Mathematics

1. **Tier 1 Altitude Filter**:
   $$r_{p,\text{sat}} = a(1 - e) = 6878937(1 - 0.0015) = 6868618.59\text{ m}$$
   $$r_{a,\text{sat}} = a(1 + e) = 6878937(1 + 0.0015) = 6889255.41\text{ m}$$
   The debris orbital envelope overlaps within the $d_{\text{thresh}} = 50.0\text{ km}$ boundary. The pair passes Tier 1.

2. **Tier 2 Coarse Sampling**:
   Samples relative separation over a 24-hour horizon ($H = 86,400\text{ s}$) at $\Delta t = 60\text{ s}$ intervals. Detects minimum coarse separation at $t \approx 47,880\text{ s}$.

3. **Tier 3 Fine TCA Minimization**:
   Brent's bounded scalar minimization finds the exact zero of $\vec{r}_{\text{rel}} \cdot \vec{v}_{\text{rel}}$:
   $$\min_{t} f(t) = \lVert \vec{r}_{\text{debris}}(t) - \vec{r}_{\text{sat}}(t) \rVert$$
   - **Time to TCA ($t_{\text{TCA}}$)**: $47,877.28\text{ s}$ ($\approx 13\text{ hr } 17\text{ min}$)
   - **TCA Epoch**: `2026-11-05T01:17:57.277Z`
   - **Predicted Miss Distance**: **$8.72\text{ meters}$**
   - **Relative Velocity**: $0.01\text{ m/s}$ (Co-orbital grazing encounter)
   - **Risk Classification**: **`CRITICAL`** (Threshold $< 1,000\text{ m}$)

![04 Conjunction Screening & Critical Touch Alert](docs/screenshots/test_case_01/04_conjunction_critical_touch.png)
*Figure 4: Conjunction Screening View displaying the flashing red CRITICAL CONJUNCTION alert: OrbitOS-Pioneer-X & Cosmos 2251 Fragment #4812 with Predicted Miss Distance of 8.72 m.*

---

### Phase 5: Autonomous Collision Avoidance Maneuver (CAM) Evaluation

Under `CRITICAL` risk, OrbitOS automatically triggers [`ManeuverPlanner`](file:///home/kashifhm333/Desktop/Project/orbit/backend/app/maneuver/planner.py) to synthesize four candidate burn options scheduled 30 minutes prior to TCA ($t_{\text{burn}} = t_{\text{TCA}} - 1800\text{ s}$).

#### Propellant Consumption Formula (Tsiolkovsky)
$$\Delta m = m_0 \left(1 - \exp\left(-\frac{\Delta v}{I_{sp} \cdot g_0}\right)\right)$$

For $m_0 = 250.0 + 25.0 = 275.0\text{ kg}$, $I_{sp} = 220\text{ s}$, $g_0 = 9.80665\text{ m/s}^2$:
$$\Delta m = 275.0 \left(1 - \exp\left(-\frac{1.5}{220 \times 9.80665}\right)\right) = 0.1911\text{ kg}$$

#### Maneuver Evaluation Matrix

$$\begin{array}{|l|c|c|c|c|c|c|}
\hline
\textbf{Burn Strategy} & \mathbf{\Delta v} & \textbf{Fuel Burned} & \textbf{Projected Miss} & \textbf{Miss Gain} & \textbf{Utility} & \textbf{Status} \\
\hline
\textbf{IN_TRACK_RETROGRADE} & 1.50\text{ m/s} & 0.191\text{ kg} & \mathbf{4,956.5\text{ m}} & \mathbf{+4,947.8\text{ m}} & \mathbf{0.5498} & \textbf{ARMED / APPROVED} \\
\text{IN_TRACK_PROGRADE} & 1.50\text{ m/s} & 0.191\text{ kg} & 4,943.7\text{ m} & +4,935.0\text{ m} & 0.5482 & \text{CANDIDATE} \\
\text{CROSS_TRACK_NORMAL} & 3.00\text{ m/s} & 0.382\text{ kg} & 2,475.9\text{ m} & +2,467.2\text{ m} & 0.2071 & \text{CANDIDATE} \\
\text{NO_ACTION} & 0.00\text{ m/s} & 0.000\text{ kg} & 8.7\text{ m} & 0.0\text{ m} & 0.0010 & \text{UNACCEPTABLE} \\
\hline
\end{array}$$

The flight director approved and armed the recommended **`IN_TRACK_RETROGRADE`** burn (`id: 9cb0b7f0-5a25-48ae-8f31-9c4ad2676c6d`), locking in a **$4,947.8\text{ meter}$ safe miss distance gain** for only $0.191\text{ kg}$ of propellant (leaving $24.81\text{ kg}$ reserve, far above the $2.0\text{ kg}$ required minimum).

![05 Autonomous Evasion Candidates](docs/screenshots/test_case_01/05_autonomous_evasion_maneuver.png)
*Figure 5: Evasion Maneuver Candidates panel showing Candidate #1 (In-Track Retrograde) approved and ARMED for execution.*

---

### Phase 6: Central Mission Alerts & Flight Safety Log

Navigating to the **Hazard Alerts View** confirms that the incident was logged to the centralized operations event queue:
- **Alert Type**: `CONJUNCTION`
- **Severity**: `CRITICAL`
- **Target Entity**: `sat-ec1fd363` (`OrbitOS-Pioneer-X`)
- **Message**: *"Miss distance 8.72 m. Close approach warning."*
- **Acknowledge Capability**: Available with one click for flight controller audit trail.

![06 Hazard Alerts Cockpit](docs/screenshots/test_case_01/06_hazard_alerts_cockpit.png)
*Figure 6: Central Alerts Cockpit showing the active CRITICAL Conjunction Warning alongside fleet alerts.*

---

## 4. Verification Invariants & Pass/Fail Criteria

$$\begin{array}{|l|l|l|c|}
\hline
\textbf{Invariant / Requirement} & \textbf{Standard} & \textbf{Observed Metric} & \textbf{Verdict} \\
\hline
\text{REQ-CONJ-001 (Tier 1 Envelope Filter)} & \Delta r_{\text{envelope}} \le 50\text{ km} & \text{Overlap detected } (\Delta r = 0.0\text{ km}) & \textbf{PASS} \\
\text{REQ-CONJ-002 (TCA Root-Finding)} & \lvert \vec{r}_{\text{rel}} \cdot \vec{v}_{\text{rel}} \rvert < 10^{-3} & \text{Brent minimizer converged } (t = 47877.28\text{ s}) & \textbf{PASS} \\
\text{REQ-CONJ-003 (Critical Risk Classification)} & d_{\text{miss}} < 1000\text{ m} \implies \text{CRITICAL} & d_{\text{miss}} = 8.72\text{ m} \to \text{CRITICAL} & \textbf{PASS} \\
\text{REQ-MANV-001 (Tsiolkovsky Accuracy)} & \text{Mass ratio exact to } 10^{-4} & \Delta m = 0.1911\text{ kg vs theoretical } 0.1911\text{ kg} & \textbf{PASS} \\
\text{REQ-MANV-002 (Fuel Reserve Check)} & m_{\text{prop}} - \Delta m \ge 2.0\text{ kg} & 25.0 - 0.191 = 24.809\text{ kg} \ge 2.0\text{ kg} & \textbf{PASS} \\
\text{REQ-MANV-003 (Miss Distance Expansion)} & d_{\text{projected}} > 2000\text{ m} & d_{\text{projected}} = 4,956.5\text{ m} & \textbf{PASS} \\
\text{SAF-BND-001 (Isolated Simulation Boundary)} & \text{No external actuators} & Simulated in-memory propagation & \textbf{PASS} \\
\hline
\end{array}$$

---

## 5. Conclusion & Operational Readiness

**Test Case `TC-ORB-001` has completed successfully.**

OrbitOS demonstrated that:
1. Satellites can be dynamically deployed into orbit via both REST API and GUI with full astrodynamics propagation.
2. The 3-Tier conjunction screening pipeline reliably pinpoints sub-10-meter collision touch hazards against space debris swarms.
3. Autonomous maneuver planning calculates viable evasion trajectories adhering to rocket dynamics, preventing catastrophic in-orbit breakup without human guesswork.
4. The mission control dashboard, 3D tracking visualization, and hazard alert consoles provide intuitive situational awareness.

