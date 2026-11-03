import { create } from 'zustand';
import { SatelliteTelemetry, ConjunctionAlert, TickSnapshotMessage } from '../types';

interface OrbitStore {
  simulationEpoch: string;
  clockState: 'STOPPED' | 'READY' | 'RUNNING' | 'PAUSED';
  timeAcceleration: number;
  tickNumber: number;
  satellites: Record<string, SatelliteTelemetry>;
  selectedSatelliteId: string | null;
  activeAlerts: ConjunctionAlert[];
  isWsConnected: boolean;

  setSnapshot: (snapshot: TickSnapshotMessage) => void;
  setSelectedSatellite: (id: string | null) => void;
  setWsConnected: (connected: boolean) => void;
}

export const useOrbitStore = create<OrbitStore>((set) => ({
  simulationEpoch: '2026-11-04T12:00:00Z',
  clockState: 'READY',
  timeAcceleration: 1.0,
  tickNumber: 0,
  satellites: {},
  selectedSatelliteId: 'sat-001',
  activeAlerts: [],
  isWsConnected: false,

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
      activeAlerts: snapshot.active_alerts,
    });
  },

  setSelectedSatellite: (id) => set({ selectedSatelliteId: id }),
  setWsConnected: (connected) => set({ isWsConnected: connected }),
}));

