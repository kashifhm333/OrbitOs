import React, { useState } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { UpcomingPassesTable } from '../passes/UpcomingPassesTable';
import { OrbitalParametersCard } from '../passes/OrbitalParametersCard';
import { RecentEventsLog } from '../dashboard/RecentEventsLog';

export const BottomStrip: React.FC = () => {
  const [expanded, setExpanded] = useState(true);

  return (
    <div className={`bg-[#071426] border-t border-[#1A3450] transition-all duration-300 shrink-0 select-none ${expanded ? 'h-64' : 'h-8'}`}>
      {/* Toggle bar */}
      <div
        className="h-8 px-4 flex items-center justify-between cursor-pointer hover:bg-[#10243B]/60 transition-colors border-b border-[#1A3450]/60"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3 text-[10px] font-mono text-[#8295AC]">
          <span className="text-[#00D5FF] font-semibold uppercase tracking-widest">▼ MISSION DATA STRIP</span>
          <span>Contact Passes · Orbital Vectors · Events Timeline</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-[#8295AC]">
          <span className="text-[10px]">{expanded ? 'Collapse' : 'Expand'}</span>
          {expanded ? <ChevronDown className="w-3.5 h-3.5 text-[#00D5FF]" /> : <ChevronUp className="w-3.5 h-3.5 text-[#00D5FF]" />}
        </div>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div className="h-[calc(100%-32px)] p-3 overflow-y-auto">
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 h-full">
            <div className="xl:col-span-1">
              <UpcomingPassesTable />
            </div>
            <div className="xl:col-span-1">
              <OrbitalParametersCard />
            </div>
            <div className="xl:col-span-1">
              <RecentEventsLog />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
