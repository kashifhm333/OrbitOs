import React, { useState, useEffect, useRef } from 'react';
import { Search, Satellite, Sparkles, ShieldAlert, Zap, CheckCircle2, LayoutDashboard, AlertTriangle, Cpu } from 'lucide-react';
import { useOrbitStore } from '../../store/useOrbitStore';
import { NavPage } from '../layout/Sidebar';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate?: (page: NavPage) => void;
}

interface ActionItem {
  id: string;
  category: string;
  title: string;
  shortcut?: string;
  icon: React.ReactNode;
  perform: () => void | Promise<void>;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({ isOpen, onClose, onNavigate }) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const {
    satellites,
    setSelectedSatellite,
    loadScenario,
    timeAcceleration
  } = useOrbitStore();

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const handleControl = async (action: string, rate?: number) => {
    try {
      await fetch('/api/v1/simulations/control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, rate: rate ?? timeAcceleration }),
      });
    } catch (err) {
      console.error('Control error:', err);
    }
  };

  const handleScreenConjunctions = async () => {
    try {
      await fetch('/api/conjunctions/screen-all', { method: 'POST' });
      onNavigate?.('conjunctions');
    } catch (err) {
      console.error('Screening error:', err);
    }
  };

  const handleInjectFault = async (faultType: string) => {
    try {
      const satId = Object.keys(satellites)[0] || 'sat-001';
      await fetch('/api/v1/faults/inject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          satellite_id: satId,
          fault_type: faultType,
          severity_multiplier: 1.5
        })
      });
      onNavigate?.('faults');
    } catch (err) {
      console.error('Fault error:', err);
    }
  };

  const handleAcknowledgeAll = async () => {
    try {
      await fetch('/api/v1/alerts/acknowledge-all', { method: 'POST' });
      onNavigate?.('alerts');
    } catch (err) {
      console.error('Ack error:', err);
    }
  };

  // Build commands list
  const actions: ActionItem[] = [
    // Scenarios
    {
      id: 'scen-1',
      category: 'Scenarios',
      title: 'Run Scenario 1: Nominal Clean Launch',
      icon: <Sparkles className="w-4 h-4 text-[#00D5FF]" />,
      perform: () => loadScenario('nominal')
    },
    {
      id: 'scen-2',
      category: 'Scenarios',
      title: 'Run Scenario 2: Debris Collision Strike',
      icon: <Sparkles className="w-4 h-4 text-[#FFB547]" />,
      perform: () => loadScenario('debris_strike')
    },
    {
      id: 'scen-3',
      category: 'Scenarios',
      title: 'Run Scenario 3: Sat-to-Sat Collision (Fail)',
      icon: <Sparkles className="w-4 h-4 text-[#FF4D5E]" />,
      perform: () => loadScenario('sat_collision')
    },

    // Spacecraft selection
    ...Object.values(satellites).map((sat) => ({
      id: `sat-${sat.satellite_id}`,
      category: 'Select Spacecraft',
      title: `Select Satellite: ${sat.name}`,
      icon: <Satellite className="w-4 h-4 text-[#00D69A]" />,
      perform: () => setSelectedSatellite(sat.satellite_id)
    })),

    // Simulation Clock Controls
    {
      id: 'sim-play',
      category: 'Simulation Controls',
      title: 'Play / Resume Simulation Clock',
      shortcut: 'Space',
      icon: <Sparkles className="w-4 h-4 text-[#00D69A]" />,
      perform: () => handleControl('PLAY')
    },
    {
      id: 'sim-pause',
      category: 'Simulation Controls',
      title: 'Pause Simulation Clock',
      shortcut: 'Space',
      icon: <Sparkles className="w-4 h-4 text-[#FFB547]" />,
      perform: () => handleControl('PAUSE')
    },
    {
      id: 'sim-speed-1',
      category: 'Simulation Controls',
      title: 'Set Speed: 1x (Real-time)',
      shortcut: '1',
      icon: <Sparkles className="w-4 h-4 text-[#00D5FF]" />,
      perform: () => handleControl('SET_SPEED', 1.0)
    },
    {
      id: 'sim-speed-5',
      category: 'Simulation Controls',
      title: 'Set Speed: 5x',
      shortcut: '2',
      icon: <Sparkles className="w-4 h-4 text-[#00D5FF]" />,
      perform: () => handleControl('SET_SPEED', 5.0)
    },
    {
      id: 'sim-speed-10',
      category: 'Simulation Controls',
      title: 'Set Speed: 10x',
      shortcut: '3',
      icon: <Sparkles className="w-4 h-4 text-[#00D5FF]" />,
      perform: () => handleControl('SET_SPEED', 10.0)
    },
    {
      id: 'sim-speed-50',
      category: 'Simulation Controls',
      title: 'Set Speed: 50x (Maximum)',
      shortcut: '4',
      icon: <Sparkles className="w-4 h-4 text-[#00D5FF]" />,
      perform: () => handleControl('SET_SPEED', 50.0)
    },

    // Operations
    {
      id: 'op-screen',
      category: 'Astrodynamics & Conjunctions',
      title: 'Screen Fleet Conjunctions (24h)',
      icon: <ShieldAlert className="w-4 h-4 text-[#FF4D5E]" />,
      perform: handleScreenConjunctions
    },
    {
      id: 'op-fault-solar',
      category: 'Fault Injection',
      title: 'Inject Subsystem Fault: SOLAR_ARRAY_DEGRADATION',
      icon: <Zap className="w-4 h-4 text-[#FFB547]" />,
      perform: () => handleInjectFault('SOLAR_ARRAY_DEGRADATION')
    },
    {
      id: 'op-fault-rwheel',
      category: 'Fault Injection',
      title: 'Inject Subsystem Fault: REACTION_WHEEL_JITTER',
      icon: <Zap className="w-4 h-4 text-[#FF4D5E]" />,
      perform: () => handleInjectFault('REACTION_WHEEL_JITTER')
    },
    {
      id: 'op-ack-all',
      category: 'Alert Management',
      title: 'Acknowledge All Non-Critical Alerts',
      icon: <CheckCircle2 className="w-4 h-4 text-[#00D69A]" />,
      perform: handleAcknowledgeAll
    },

    // Navigation
    {
      id: 'nav-dashboard',
      category: 'Navigation',
      title: 'Go to Mission Dashboard',
      icon: <LayoutDashboard className="w-4 h-4 text-[#00D5FF]" />,
      perform: () => onNavigate?.('dashboard')
    },
    {
      id: 'nav-alerts',
      category: 'Navigation',
      title: 'Go to Hazard Alerts Cockpit',
      icon: <AlertTriangle className="w-4 h-4 text-[#FF4D5E]" />,
      perform: () => onNavigate?.('alerts')
    },
    {
      id: 'nav-intel',
      category: 'Navigation',
      title: 'Go to AI / ML Intelligence',
      icon: <Cpu className="w-4 h-4 text-[#00D69A]" />,
      perform: () => onNavigate?.('intelligence')
    }
  ];

  const filtered = actions.filter((act) =>
    act.title.toLowerCase().includes(query.toLowerCase()) ||
    act.category.toLowerCase().includes(query.toLowerCase())
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, filtered.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filtered.length) % Math.max(1, filtered.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filtered[selectedIndex]) {
        filtered[selectedIndex].perform();
        onClose();
      }
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-[#050B16]/80 backdrop-blur-sm select-none p-4 animate-in fade-in duration-150">
      <div 
        className="w-full max-w-xl bg-[#071426] border border-[#1A3450] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[70vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="p-3.5 border-b border-[#1A3450] flex items-center gap-3 bg-[#0B1B2E]">
          <Search className="w-4 h-4 text-[#00D5FF] shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Type a command or search action (e.g. > Select, Scenario, Screen, Fault)..."
            className="w-full bg-transparent text-[#E8F0FA] text-sm font-mono placeholder-[#8295AC] focus:outline-none"
          />
          <kbd className="hidden sm:inline-block px-2 py-0.5 rounded text-[10px] font-mono bg-[#10243B] text-[#8295AC] border border-[#1A3450]">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div className="overflow-y-auto p-2 space-y-1">
          {filtered.length === 0 ? (
            <div className="p-6 text-center text-xs font-mono text-[#8295AC]">
              No commands found matching "{query}"
            </div>
          ) : (
            filtered.map((item, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={item.id}
                  onClick={() => {
                    item.perform();
                    onClose();
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-mono transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[#10243B] border border-[#00D5FF]/40 text-[#E8F0FA] shadow-md shadow-cyan-500/5'
                      : 'text-[#8295AC] hover:bg-[#0B1B2E] border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2.5 overflow-hidden">
                    <span className="shrink-0">{item.icon}</span>
                    <span className="truncate text-[#E8F0FA] font-medium">{item.title}</span>
                  </div>
                  <span className="text-[10px] text-[#8295AC] shrink-0 uppercase tracking-wider ml-2">
                    {item.category}
                  </span>
                </div>
              );
            })
          )}
        </div>

        {/* Bottom Helper Bar */}
        <div className="p-2 border-t border-[#1A3450] bg-[#050B16] text-[10px] font-mono text-[#8295AC] flex items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <span>↑↓ Navigate</span>
            <span>↵ Select</span>
            <span>ESC Close</span>
          </div>
          <div className="flex items-center gap-2 text-[#00D5FF]">
            <span>Space: Play/Pause</span>
            <span>1-4: Speeds</span>
          </div>
        </div>
      </div>
    </div>
  );
};
