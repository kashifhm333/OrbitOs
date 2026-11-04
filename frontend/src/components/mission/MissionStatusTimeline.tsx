import React from 'react';
import { CheckCircle, Circle, Clock } from 'lucide-react';

const phases = [
  { id: 'acq', label: 'Acquisition', done: true },
  { id: 'trk', label: 'Tracking', done: true },
  { id: 'img', label: 'Imaging', done: false, active: true },
  { id: 'dwn', label: 'Downlink', done: false },
];

export const MissionStatusTimeline: React.FC = () => (
  <div className="space-y-3">
    <h4 className="text-[10px] uppercase tracking-[0.15em] text-slate-500 font-semibold">Mission Phase</h4>
    <div className="flex items-center gap-0">
      {phases.map((phase, i) => (
        <React.Fragment key={phase.id}>
          <div className="flex flex-col items-center gap-1 flex-1">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center border-2 transition-all ${
              phase.done ? 'border-emerald-400 bg-emerald-400/15 text-emerald-400' :
              phase.active ? 'border-cyan-400 bg-cyan-400/15 text-cyan-400' :
              'border-space-600 text-slate-600'
            }`}>
              {phase.done ? <CheckCircle className="w-3 h-3" /> : phase.active ? <Clock className="w-3 h-3" /> : <Circle className="w-3 h-3" />}
            </div>
            <span className={`text-[9px] font-mono whitespace-nowrap ${
              phase.done ? 'text-emerald-400' : phase.active ? 'text-cyan-400' : 'text-slate-600'
            }`}>{phase.label}</span>
          </div>
          {i < phases.length - 1 && (
            <div className={`flex-1 h-px mb-4 ${phases[i + 1].done || phases[i + 1].active ? 'bg-emerald-400/40' : 'bg-space-600'}`} />
          )}
        </React.Fragment>
      ))}
    </div>
  </div>
);

