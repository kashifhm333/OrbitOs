# OrbitOS Open Architectural Questions & Decisions Register

> **Document Status:** Active Register  
> **Target Path:** `docs/OPEN_QUESTIONS.md`  
> **Last Updated:** 2026-11-03

This register tracks unresolved architectural questions, student/instructor trade-offs, and candidate enhancements for OrbitOS. No open question shall be silently converted into an approved architectural decision without formal review and ADR documentation.

---

## Active Open Questions

| ID | Title | Domain | Priority | Current Proposed Resolution | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **OQ-001** | Selection of Numerical Integration Algorithm for High Eccentricity Orbits | Orbital Mechanics | Medium | Use 4th-Order Runge-Kutta (RK4) with adaptive step size, falling back to analytical Kepler solving when eccentricity $e < 0.05$. | **PROPOSED** |
| **OQ-002** | Covariance Representation for Conjunction Probability ($P_c$) Calculations | Collision Analysis | High | MVP uses a spherical geometric miss-distance bubble ($\Delta r < r_{\text{threshold}}$). Advanced phase introduces 3x3 position covariance ellipsoids via Chan's or Akella-Alfriend analytical methods. | **UNDER REVIEW** |
| **OQ-003** | Mission Scheduling Engine: Pure Heuristic vs. Google OR-Tools CP-SAT | Mission Planning | Medium | MVP implements greedy priority-based topological sorting with deadline enforcement; evaluate OR-Tools constraint solver if schedule conflicts exceed 50 concurrent tasks. | **PROPOSED** |
| **OQ-004** | Level of Attitude Dynamics Modeling | Satellite Bus | Low | Keep satellite attitude simplified to Nadir-pointing / Sun-pointing binary state in MVP; full quaternion-based rigid body dynamics deferred to Research Extension. | **ACCEPTED FOR MVP** |
| **OQ-005** | External Space Weather Impact Modeling (NASA DONKI) | Intelligence / Telemetry | Low | Use Solar Flare (FLR) and Coronal Mass Ejection (CME) data from DONKI to probabilistically inject telemetry sensor noise and communication link attenuation during simulated space weather events. | **UNDER EVALUATION** |
| **OQ-006** | VDM-SL Tooling Integration in CI/CD Pipeline | Formal Verification | Medium | Run VDMJ command-line type-checker and proof obligation generator as a GitHub Actions step; maintain python-based executable assertions in `pytest` as runtime enforcement. | **PROPOSED** |
| **OQ-007** | Database Migration Tooling and Seed Dataset Size | Database / Ops | Low | Use Alembic with auto-generation; bundle a standard 10-satellite educational scenario with 3 global ground stations for instant onboarding. | **ACCEPTED FOR MVP** |
| **OQ-008** | CelesTrak TLE Group Refresh Interval | External Data | Medium | Cache CelesTrak active satellite catalogs locally for 24 hours; enforce HTTP conditional `If-Modified-Since` requests to prevent IP throttling. | **ACCEPTED** |

---

## Resolution Workflow

1. **Identification:** Propose an issue with specific architectural impact.
2. **Analysis:** Document technical trade-offs, compute constraints, and impact on laptop local deployment.
3. **Consensus:** Instructor / Principal Architect approval.
4. **Transition:** Update `docs/ARCHITECTURE_DECISIONS.md`, update affected technical documents, and mark question as `RESOLVED`.

