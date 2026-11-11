import React from 'react';
import { Clock, AlertCircle, Info, AlertTriangle, RotateCcw } from 'lucide-react';
import { useOrbitStore } from '../../store/useOrbitStore';

export const RecentEventsLog: React.FC = () => {
  const { recentEvents } = useOrbitStore();

  const handleReplayEvent = async (evt: any) => {
    try {
      const evtEpoch = new Date(evt.epoch);
      const rewindEpoch = new Date(evtEpoch.getTime() - 10000);

      // Rewind simulation state buffer to T - 10s and set to 1x playback
      useOrbitStore.setState({
        simulationEpoch: rewindEpoch.toISOString(),
        timeAcceleration: 1.0,
        clockState: 'RUNNING'
      });

      await fetch('/api/v1/simulations/control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'SET_SPEED', rate: 1.0 })
      });
      await fetch('/api/v1/simulations/control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'PLAY' })
      });
    } catch (err) {
      console.error('Replay error:', err);
    }
  };

  return (
    <div className="space-y-2 select-none h-full flex flex-col">
      <div className="flex items-center justify-between">
        <h4 className="text-[10px] uppercase tracking-[0.15em] text-[#8295AC] font-semibold flex items-center gap-1.5">
          <Clock className="w-3 h-3 text-[#00D5FF]" />
          <span>Recent Mission Events Timeline</span>
        </h4>
        <span className="text-[10px] font-mono text-[#8295AC]">{recentEvents.length} Recorded (Click to Replay)</span>
      </div>

      <div className="rounded-xl overflow-hidden border border-[#1A3450] bg-[#071426] p-2 flex-1 overflow-y-auto max-h-44 space-y-1.5 font-mono text-[11px]">
        {recentEvents.length === 0 ? (
          <div className="text-center py-4 text-[#8295AC] text-xs">
            Waiting for simulation ticks...
          </div>
        ) : (
          recentEvents.slice(0, 15).map((evt) => {
            const isWarn = evt.severity === 'WARNING';
            const isCrit = evt.severity === 'CRITICAL';
            const colorClass = isCrit ? 'text-[#FF4D5E]' : isWarn ? 'text-[#FFB547]' : 'text-[#8295AC]';
            const icon = isCrit ? (
              <AlertCircle className="w-3 h-3 text-[#FF4D5E] shrink-0" />
            ) : isWarn ? (
              <AlertTriangle className="w-3 h-3 text-[#FFB547] shrink-0" />
            ) : (
              <Info className="w-3 h-3 text-[#00D5FF] shrink-0" />
            );

            const timeStr = new Date(evt.epoch).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: 'UTC' });

            return (
              <div 
                key={evt.id} 
                onClick={() => handleReplayEvent(evt)}
                className="group flex items-center justify-between p-1.5 rounded-lg bg-[#0B1B2E] border border-[#1A3450]/60 hover:border-[#00D5FF]/60 hover:bg-[#10243B] transition-all cursor-pointer"
                title="Click event to rewind state buffer to T - 10s and replay at 1x speed"
              >
                <div className="flex items-center gap-2 overflow-hidden">
                  {icon}
                  <span className="text-[#8295AC] text-[10px] shrink-0">[{timeStr}]</span>
                  <span className="text-[#E8F0FA] group-hover:text-[#00D5FF] truncate transition-colors">{evt.title}</span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <RotateCcw className="w-3 h-3 text-[#8295AC] opacity-0 group-hover:opacity-100 text-[#00D5FF] transition-opacity" />
                  <span className={`text-[9px] px-1.5 py-0.5 rounded font-semibold uppercase ${colorClass} bg-[#10243B]`}>
                    {evt.event_type}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

