import { create } from 'zustand';
import { SatelliteTelemetry, ConjunctionAlert, TickSnapshotMessage, SimulationEvent } from '../types';

interface OrbitStore {
  simulationEpoch: string;
  clockState: 'STOPPED' | 'READY' | 'RUNNING' | 'PAUSED';
  timeAcceleration: number;
  tickNumber: number;
  satellites: Record<string, SatelliteTelemetry>;
  selectedSatelliteId: string | null;
  activeAlerts: ConjunctionAlert[];
  recentEvents: SimulationEvent[];
  debrisList: any[];
  isWsConnected: boolean;
  showDebris: boolean;
  showGroundStations: boolean;
  showTracks: boolean;

  setSnapshot: (snapshot: TickSnapshotMessage) => void;
  setSelectedSatellite: (id: string | null) => void;
  setWsConnected: (connected: boolean) => void;
  setShowDebris: (show: boolean) => void;
  setShowGroundStations: (show: boolean) => void;
  setShowTracks: (show: boolean) => void;
}

export const useOrbitStore = create<OrbitStore>((set) => ({
  simulationEpoch: '2026-11-04T12:00:00Z',
  clockState: 'READY',
  timeAcceleration: 1.0,
  tickNumber: 0,
  satellites: {},
  selectedSatelliteId: 'sat-001',
  activeAlerts: [],
  recentEvents: [],
  debrisList: [],
  isWsConnected: false,
  showDebris: true,
  showGroundStations: true,
  showTracks: true,

  setSnapshot: (snapshot) => {
    const satMap: Record<string, SatelliteTelemetry> = {};
    for (const s of snapshot.satellites) {
      satMap[s.satellite_id] = s;
    }
    set({
      simulationEpoch: snapshot.simulation_epoch,
      clockState: snapshot.clock_state,
      timeAcceleration: snapshot.time_acceleration,
      tickNumber: snapshot.tick_number,
      satellites: satMap,
      activeAlerts: snapshot.active_alerts || [],
      recentEvents: snapshot.recent_events || [],
      debrisList: snapshot.debris || [],
    });
  },

  setSelectedSatellite: (id) => set({ selectedSatelliteId: id }),
  setWsConnected: (connected) => set({ isWsConnected: connected }),
  setShowDebris: (show) => set({ showDebris: show }),
  setShowGroundStations: (show) => set({ showGroundStations: show }),
  setShowTracks: (show) => set({ showTracks: show }),
}));

