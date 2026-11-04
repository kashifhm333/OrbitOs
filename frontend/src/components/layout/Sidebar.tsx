import React from 'react';
import {
  LayoutDashboard,
  Layers,
  Compass,
  Image,
  Activity,
  Rocket,
  ShieldAlert,
  Radio,
  Brain,
  Flame,
  Bell,
  FileText,
  Settings,
  ChevronRight,
  Satellite
} from 'lucide-react';
import { useOrbitStore } from '../../store/useOrbitStore';

export type NavPage = 
  | 'dashboard'
  | 'satellites'
  | 'tracking'
  | 'imagery'
  | 'telemetry'
  | 'missions'
  | 'conjunctions'
  | 'ground'
  | 'intelligence'
  | 'faults'
  | 'alerts'
  | 'reports'
  | 'settings';

interface SidebarProps {
  activePage: NavPage;
  onNavigate: (page: NavPage) => void;
}

const navItems: { id: NavPage; icon: React.ReactNode; label: string; accentColor?: string; badgeKey?: string }[] = [
  { id: 'dashboard', icon: <LayoutDashboard className="w-4 h-4" />, label: 'Dashboard' },
  { id: 'satellites', icon: <Layers className="w-4 h-4" />, label: 'Satellites' },
  { id: 'tracking', icon: <Compass className="w-4 h-4" />, label: 'Tracking' },
  { id: 'imagery', icon: <Image className="w-4 h-4" />, label: 'Imagery' },
  { id: 'telemetry', icon: <Activity className="w-4 h-4" />, label: 'Telemetry' },
  { id: 'missions', icon: <Rocket className="w-4 h-4" />, label: 'Missions' },
  { id: 'conjunctions', icon: <ShieldAlert className="w-4 h-4" />, label: 'Conjunctions', accentColor: 'text-amber-400', badgeKey: 'alerts' },
  { id: 'ground', icon: <Radio className="w-4 h-4" />, label: 'Ground Stations' },
  { id: 'intelligence', icon: <Brain className="w-4 h-4" />, label: 'AI / ML Intelligence', accentColor: 'text-violet-400' },
  { id: 'faults', icon: <Flame className="w-4 h-4" />, label: 'Fault Injection', accentColor: 'text-rose-400' },
  { id: 'alerts', icon: <Bell className="w-4 h-4" />, label: 'Alerts', accentColor: 'text-amber-400', badgeKey: 'alerts' },
  { id: 'reports', icon: <FileText className="w-4 h-4" />, label: 'Reports & Export' },
];

export const Sidebar: React.FC<SidebarProps> = ({ activePage, onNavigate }) => {
  const { activeAlerts } = useOrbitStore();
  const alertCount = activeAlerts.length;

  return (
    <nav className="w-16 bg-[#071426] border-r border-[#1A3450] flex flex-col items-center py-3 gap-1 z-20 shrink-0 select-none">
      {/* Brand Icon */}
      <button 
        onClick={() => onNavigate('dashboard')}
        className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-700 flex items-center justify-center shadow-lg shadow-cyan-500/20 mb-3 shrink-0 hover:scale-105 transition-transform"
        title="OrbitOS Mission Control"
      >
        <Satellite className="w-5 h-5 text-white" />
      </button>

      {/* Primary Navigation Items */}
      <div className="flex-1 w-full space-y-1 overflow-y-auto overflow-x-hidden flex flex-col items-center py-1">
        {navItems.map((item) => {
          const isActive = activePage === item.id;
          const showBadge = item.badgeKey === 'alerts' && alertCount > 0;
          return (
            <div key={item.id} className="relative group w-full flex justify-center">
              <button
                onClick={() => onNavigate(item.id)}
                title={item.label}
                className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-150 relative ${
                  isActive
                    ? 'bg-[#00D5FF]/15 text-[#00D5FF] shadow-sm shadow-cyan-500/10'
                    : `text-[#8295AC] hover:text-[#E8F0FA] hover:bg-[#10243B] ${item.accentColor ? `hover:${item.accentColor}` : ''}`
                }`}
              >
                {item.icon}
                {isActive && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 bg-[#00D5FF] rounded-r-full" />
                )}
                {showBadge && (
                  <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-[#FF4D5E] animate-pulse" />
                )}
              </button>
              {/* Tooltip */}
              <div className="absolute left-14 top-1/2 -translate-y-1/2 bg-[#10243B] border border-[#1A3450] text-[#E8F0FA] text-xs font-medium px-2.5 py-1.5 rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 shadow-xl">
                {item.label}
                <ChevronRight className="inline w-3 h-3 ml-1 text-[#8295AC]" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Settings at bottom */}
      <div className="mt-auto group relative flex justify-center pt-2 border-t border-[#1A3450]/60 w-full">
        <button
          onClick={() => onNavigate('settings')}
          title="System Settings"
          className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
            activePage === 'settings' ? 'bg-[#10243B] text-[#00D5FF]' : 'text-[#8295AC] hover:text-[#E8F0FA] hover:bg-[#10243B]'
          }`}
        >
          <Settings className="w-4 h-4" />
        </button>
        <div className="absolute left-14 top-1/2 -translate-y-1/2 bg-[#10243B] border border-[#1A3450] text-[#E8F0FA] text-xs font-medium px-2.5 py-1.5 rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 shadow-xl">
          System Settings
        </div>
      </div>
    </nav>
  );
};

