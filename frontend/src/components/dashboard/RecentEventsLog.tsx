import React from 'react';
import { Clock, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import { useOrbitStore } from '../../store/useOrbitStore';

export const RecentEventsLog: React.FC = () => {
  const { recentEvents } = useOrbitStore();

  return (
    <div className="space-y-2 select-none h-full flex flex-col">
      <div className="flex items-center justify-between">
        <h4 className="text-[10px] uppercase tracking-[0.15em] text-[#8295AC] font-semibold flex items-center gap-1.5">
          <Clock className="w-3 h-3 text-[#00D5FF]" />
          <span>Recent Mission Events Timeline</span>
        </h4>
        <span className="text-[10px] font-mono text-[#8295AC]">{recentEvents.length} Recorded</span>
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
                className="flex items-center justify-between p-1.5 rounded-lg bg-[#0B1B2E] border border-[#1A3450]/60 hover:bg-[#10243B]/60 transition-colors"
              >
                <div className="flex items-center gap-2 overflow-hidden">
                  {icon}
                  <span className="text-[#8295AC] text-[10px] shrink-0">[{timeStr}]</span>
                  <span className="text-[#E8F0FA] truncate">{evt.title}</span>
                </div>
                <span className={`text-[9px] px-1.5 py-0.5 rounded font-semibold uppercase shrink-0 ${colorClass} bg-[#10243B]`}>
                  {evt.event_type}
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

