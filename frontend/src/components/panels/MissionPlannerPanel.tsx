import React, { useState, useEffect } from 'react';
import { Target, Play, Plus, Clock, Battery, AlertCircle } from 'lucide-react';
import { useOrbitStore } from '../../store/useOrbitStore';

interface MissionTask {
  id: string;
  satellite_id: string;
  name: string;
  task_type: string;
  priority: number;
  duration_seconds: number;
  energy_cost_wh: number;
  state: string;
  scheduled_start_epoch?: string;
  scheduled_end_epoch?: string;
  rejection_reason?: string;
}

export const MissionPlannerPanel: React.FC = () => {
  const { selectedSatelliteId, satellites } = useOrbitStore();
  const [tasks, setTasks] = useState<MissionTask[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [taskName, setTaskName] = useState<string>('Earth Observation Run');
  const [taskType, setTaskType] = useState<string>('EARTH_OBSERVATION');
  const [priority, setPriority] = useState<number>(3);
  const [duration, setDuration] = useState<number>(300);
  const [energyCost, setEnergyCost] = useState<number>(15);

  const satId = selectedSatelliteId || Object.keys(satellites)[0] || 'sat-001';

  const fetchTasks = async () => {
    try {
      const resp = await fetch('/api/missions/tasks');
      if (resp.ok) {
        const data = await resp.json();
        setTasks(data);
      }
    } catch (err) {
      console.error('Failed to fetch mission tasks:', err);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const resp = await fetch('/api/missions/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          satellite_id: satId,
          name: taskName,
          task_type: taskType,
          priority,
          duration_seconds: duration,
          energy_cost_wh: energyCost
        })
      });
      if (resp.ok) {
        await fetchTasks();
      }
    } catch (err) {
      console.error('Error creating task:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOptimizeSchedule = async () => {
    setLoading(true);
    try {
      const resp = await fetch('/api/missions/schedule', { method: 'POST' });
      if (resp.ok) {
        const data = await resp.json();
        setTasks(data);
      }
    } catch (err) {
      console.error('Error optimizing schedule:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4 text-xs font-mono">
      {/* Action Header */}
      <div className="flex items-center justify-between bg-space-900/80 p-3 rounded-xl border border-space-700">
        <div className="flex items-center space-x-2">
          <Target className="w-4 h-4 text-cyan-400" />
          <span className="font-bold text-white text-sm">MISSION SCHEDULER</span>
        </div>
        <button
          onClick={handleOptimizeSchedule}
          disabled={loading}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold transition-all shadow-md active:scale-95 disabled:opacity-50"
        >
          <Play className="w-3.5 h-3.5 fill-current" />
          <span>OPTIMIZE (EDF)</span>
        </button>
      </div>

      {/* Task Creation Form */}
      <form onSubmit={handleCreateTask} className="p-3.5 rounded-xl bg-space-900/60 border border-space-700 space-y-2.5">
        <div className="flex items-center justify-between text-slate-300 font-semibold border-b border-space-800 pb-1.5">
          <span className="flex items-center space-x-1.5">
            <Plus className="w-3.5 h-3.5 text-cyan-400" />
            <span>SUBMIT MISSION TASK</span>
          </span>
          <span className="text-[10px] text-slate-400">Target: {selectedSatelliteId || 'sat-001'}</span>
        </div>

        <div>
          <label className="text-[10px] text-slate-400 block mb-0.5">Task Name</label>
          <input
            type="text"
            value={taskName}
            onChange={(e) => setTaskName(e.target.value)}
            className="w-full bg-space-950 border border-space-700 rounded px-2.5 py-1 text-slate-200 text-xs focus:border-cyan-500 outline-none"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[10px] text-slate-400 block mb-0.5">Task Type</label>
            <select
              value={taskType}
              onChange={(e) => setTaskType(e.target.value)}
              className="w-full bg-space-950 border border-space-700 rounded px-2 py-1 text-slate-200 text-xs focus:border-cyan-500 outline-none"
            >
              <option value="EARTH_OBSERVATION">Earth Observation</option>
              <option value="RF_SURVEILLANCE">RF Surveillance</option>
              <option value="GROUND_DOWNLINK_DUMP">Data Downlink</option>
              <option value="SUBSYSTEM_CALIBRATION">Calibration</option>
            </select>
          </div>
          <div>
            <label className="text-[10px] text-slate-400 block mb-0.5">Priority (1-5)</label>
            <input
              type="number"
              min="1"
              max="5"
              value={priority}
              onChange={(e) => setPriority(parseInt(e.target.value) || 1)}
              className="w-full bg-space-950 border border-space-700 rounded px-2 py-1 text-slate-200 text-xs focus:border-cyan-500 outline-none"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[10px] text-slate-400 block mb-0.5">Duration (s)</label>
            <input
              type="number"
              min="30"
              max="3600"
              value={duration}
              onChange={(e) => setDuration(parseFloat(e.target.value) || 30)}
              className="w-full bg-space-950 border border-space-700 rounded px-2 py-1 text-slate-200 text-xs focus:border-cyan-500 outline-none"
            />
          </div>
          <div>
            <label className="text-[10px] text-slate-400 block mb-0.5">Energy Cost (Wh)</label>
            <input
              type="number"
              min="1"
              max="200"
              value={energyCost}
              onChange={(e) => setEnergyCost(parseFloat(e.target.value) || 1)}
              className="w-full bg-space-950 border border-space-700 rounded px-2 py-1 text-slate-200 text-xs focus:border-cyan-500 outline-none"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-1.5 rounded-lg bg-space-700 hover:bg-space-600 text-cyan-300 font-bold text-xs transition-all border border-cyan-500/30"
        >
          {loading ? 'SUBMITTING...' : 'ENQUEUE TASK'}
        </button>
      </form>

      {/* Task Queue List */}
      <div className="space-y-2">
        <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex justify-between">
          <span>SCHEDULED TASKS ({tasks.length})</span>
          <button onClick={fetchTasks} className="text-cyan-400 hover:underline">REFRESH</button>
        </div>

        {tasks.length === 0 ? (
          <div className="p-4 rounded-xl bg-space-900/40 border border-space-800 text-center text-slate-500">
            No active mission tasks. Submit a task above.
          </div>
        ) : (
          tasks.map((task) => (
            <div key={task.id} className="p-3 rounded-xl bg-space-900/80 border border-space-700 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-200">{task.name}</span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  task.state === 'SCHEDULED' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                  task.state === 'CANCELLED' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' :
                  'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                }`}>
                  {task.state}
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span className="flex items-center space-x-1">
                  <Clock className="w-3 h-3 text-slate-500" />
                  <span>{task.duration_seconds}s (P{task.priority})</span>
                </span>
                <span className="flex items-center space-x-1">
                  <Battery className="w-3 h-3 text-amber-400" />
                  <span>{task.energy_cost_wh} Wh</span>
                </span>
              </div>
              {task.scheduled_start_epoch && (
                <div className="text-[10px] text-cyan-400 bg-space-950 px-2 py-1 rounded border border-space-800">
                  Window: {new Date(task.scheduled_start_epoch).toLocaleTimeString()} &ndash; {task.scheduled_end_epoch ? new Date(task.scheduled_end_epoch).toLocaleTimeString() : ''}
                </div>
              )}
              {task.rejection_reason && (
                <div className="text-[10px] text-rose-400 flex items-start space-x-1 bg-rose-950/30 p-1.5 rounded">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <span>{task.rejection_reason}</span>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
