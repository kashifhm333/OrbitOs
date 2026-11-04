import React, { useState, useEffect } from 'react';
import { Rocket, Play, Plus, Trash2 } from 'lucide-react';
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

export const MissionsView: React.FC = () => {
  const { selectedSatelliteId, satellites } = useOrbitStore();
  const [tasks, setTasks] = useState<MissionTask[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Form states
  const [taskName, setTaskName] = useState('High-Res Optical Imaging Pass');
  const [taskType, setTaskType] = useState('EARTH_OBSERVATION');
  const [priority, setPriority] = useState(4);
  const [duration, setDuration] = useState(300);
  const [energyCost, setEnergyCost] = useState(18.5);

  const satId = selectedSatelliteId || Object.keys(satellites)[0] || 'sat-002';

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const resp = await fetch('/api/missions/tasks');
      if (resp.ok) {
        setTasks(await resp.json());
      }
    } catch (err) {
      console.error('Failed to fetch mission tasks:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const resp = await fetch('/api/missions/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          satellite_id: satId,
          name: taskName,
          task_type: taskType,
          priority: Number(priority),
          duration_seconds: Number(duration),
          energy_cost_wh: Number(energyCost)
        })
      });
      if (resp.ok) {
        setShowCreateModal(false);
        await fetchTasks();
      }
    } catch (err) {
      console.error('Error creating task:', err);
    }
  };

  const handleOptimize = async () => {
    setLoading(true);
    try {
      const resp = await fetch('/api/missions/schedule', { method: 'POST' });
      if (resp.ok) {
        setTasks(await resp.json());
      }
    } catch (err) {
      console.error('Error running scheduler:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (taskId: string) => {
    try {
      const resp = await fetch(`/api/missions/tasks/${taskId}`, { method: 'DELETE' });
      if (resp.ok) {
        await fetchTasks();
      }
    } catch (err) {
      console.error('Error canceling task:', err);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6 font-mono text-xs select-none bg-[#050B16]">
      {/* Header */}
      <div className="flex items-center justify-between p-4 rounded-xl bg-[#071426] border border-[#1A3450]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#00D5FF]/10 border border-[#00D5FF]/30 flex items-center justify-center">
            <Rocket className="w-5 h-5 text-[#00D5FF]" />
          </div>
          <div>
            <h1 className="text-base font-bold text-[#E8F0FA]">MISSION PLANNING & EDF SCHEDULER</h1>
            <p className="text-[11px] text-[#8295AC]">Autonomous timeline scheduling with energy constraint validation and priority preemption.</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleOptimize}
            disabled={loading}
            className="px-3.5 py-1.5 rounded-lg bg-[#00D69A] text-[#050B16] font-bold hover:bg-[#00D69A]/90 flex items-center gap-1.5 shadow-md shadow-emerald-500/20 active:scale-95 transition-all"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Optimize EDF Schedule</span>
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-3.5 py-1.5 rounded-lg bg-[#00D5FF] text-[#050B16] font-bold hover:bg-[#00D5FF]/90 flex items-center gap-1.5 shadow-md shadow-cyan-500/20 active:scale-95 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Submit Task</span>
          </button>
        </div>
      </div>

      {/* Scheduler Summary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-[#0B1B2E] border border-[#1A3450] space-y-1">
          <div className="text-[10px] text-[#8295AC] uppercase">Queue Tasks</div>
          <div className="text-2xl font-bold text-[#E8F0FA]">{tasks.length}</div>
          <div className="text-[10px] text-[#8295AC]">All Subscribed Missions</div>
        </div>
        <div className="p-4 rounded-xl bg-[#0B1B2E] border border-[#1A3450] space-y-1">
          <div className="text-[10px] text-[#8295AC] uppercase">Scheduled Ready</div>
          <div className="text-2xl font-bold text-[#00D69A]">
            {tasks.filter(t => t.state === 'SCHEDULED' || t.state === 'IN_PROGRESS').length}
          </div>
          <div className="text-[10px] text-[#00D69A]">Feasible & Allocated</div>
        </div>
        <div className="p-4 rounded-xl bg-[#0B1B2E] border border-[#1A3450] space-y-1">
          <div className="text-[10px] text-[#8295AC] uppercase">Submitted Pending</div>
          <div className="text-2xl font-bold text-[#00D5FF]">
            {tasks.filter(t => t.state === 'SUBMITTED').length}
          </div>
          <div className="text-[10px] text-[#8295AC]">Awaiting Next Optimization</div>
        </div>
        <div className="p-4 rounded-xl bg-[#0B1B2E] border border-[#1A3450] space-y-1">
          <div className="text-[10px] text-[#8295AC] uppercase">Resource Rejections</div>
          <div className="text-2xl font-bold text-[#FF4D5E]">
            {tasks.filter(t => t.state === 'REJECTED').length}
          </div>
          <div className="text-[10px] text-[#FF4D5E]">Battery/Deadline Constraints</div>
        </div>
      </div>

      {/* Mission Tasks Queue Table */}
      <div className="rounded-xl overflow-hidden border border-[#1A3450] bg-[#071426]">
        <table className="w-full text-left font-mono">
          <thead>
            <tr className="bg-[#0B1B2E] border-b border-[#1A3450] text-[#8295AC] text-[10px] uppercase tracking-wider">
              <th className="px-4 py-3">Task Name</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Assigned Satellite</th>
              <th className="px-4 py-3">Priority</th>
              <th className="px-4 py-3">Duration</th>
              <th className="px-4 py-3">Energy Cost</th>
              <th className="px-4 py-3">State</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1A3450]/60">
            {tasks.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-[#8295AC]">
                  No mission tasks in queue. Click "Submit Task" to stage payload activities.
                </td>
              </tr>
            ) : (
              tasks.map((task) => (
                <tr key={task.id} className="hover:bg-[#10243B]/60 transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-semibold text-[#E8F0FA]">{task.name}</div>
                    <div className="text-[10px] text-[#8295AC]">{task.id.slice(0, 8)}...</div>
                  </td>
                  <td className="px-4 py-3 text-[#00D5FF]">{task.task_type}</td>
                  <td className="px-4 py-3 text-[#E8F0FA]">{satellites[task.satellite_id]?.name || task.satellite_id}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded font-bold ${
                      task.priority >= 4 ? 'bg-[#FF4D5E]/20 text-[#FF4D5E]' :
                      task.priority === 3 ? 'bg-[#FFB547]/20 text-[#FFB547]' :
                      'bg-[#00D5FF]/20 text-[#00D5FF]'
                    }`}>
                      P{task.priority}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[#8295AC]">{task.duration_seconds}s</td>
                  <td className="px-4 py-3 text-[#E8F0FA]">{task.energy_cost_wh} Wh</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-[9px] font-semibold ${
                      task.state === 'SCHEDULED' ? 'bg-[#00D69A]/20 text-[#00D69A] border border-[#00D69A]/30' :
                      task.state === 'REJECTED' ? 'bg-[#FF4D5E]/20 text-[#FF4D5E] border border-[#FF4D5E]/30' :
                      'bg-[#00D5FF]/20 text-[#00D5FF] border border-[#00D5FF]/30'
                    }`}>
                      {task.state}
                    </span>
                    {task.rejection_reason && (
                      <div className="text-[9px] text-[#FF4D5E] mt-0.5">{task.rejection_reason}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleDelete(task.id)}
                      className="p-1.5 rounded-lg text-[#FF4D5E] hover:bg-[#FF4D5E]/15 border border-transparent hover:border-[#FF4D5E]/30 transition-all"
                      title="Cancel Task"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Task Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#071426] border border-[#1A3450] rounded-xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#1A3450] pb-3">
              <h3 className="text-sm font-bold text-[#E8F0FA] flex items-center gap-2">
                <Rocket className="w-4 h-4 text-[#00D5FF]" />
                <span>Submit Mission Payload Task</span>
              </h3>
              <button onClick={() => setShowCreateModal(false)} className="text-[#8295AC] hover:text-[#E8F0FA]">✕</button>
            </div>

            <form onSubmit={handleCreate} className="space-y-3 font-mono text-xs">
              <div>
                <label className="text-[10px] text-[#8295AC] block mb-1">Task Name</label>
                <input
                  type="text"
                  value={taskName}
                  onChange={(e) => setTaskName(e.target.value)}
                  className="w-full bg-[#0B1B2E] border border-[#1A3450] text-[#E8F0FA] rounded-lg px-3 py-2 outline-none focus:border-[#00D5FF]"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-[#8295AC] block mb-1">Task Type</label>
                  <select
                    value={taskType}
                    onChange={(e) => setTaskType(e.target.value)}
                    className="w-full bg-[#0B1B2E] border border-[#1A3450] text-[#E8F0FA] rounded-lg px-3 py-2 outline-none focus:border-[#00D5FF]"
                  >
                    <option value="EARTH_OBSERVATION">EARTH_OBSERVATION</option>
                    <option value="RF_SURVEILLANCE">RF_SURVEILLANCE</option>
                    <option value="GROUND_DOWNLINK_DUMP">GROUND_DOWNLINK_DUMP</option>
                    <option value="ORBITAL_MANEUVER">ORBITAL_MANEUVER</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-[#8295AC] block mb-1">Priority (1 = Low, 5 = Critical)</label>
                  <input
                    type="number"
                    min="1"
                    max="5"
                    value={priority}
                    onChange={(e) => setPriority(Number(e.target.value))}
                    className="w-full bg-[#0B1B2E] border border-[#1A3450] text-[#E8F0FA] rounded-lg px-3 py-2 outline-none focus:border-[#00D5FF]"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-[#8295AC] block mb-1">Duration (seconds)</label>
                  <input
                    type="number"
                    min="10"
                    max="3600"
                    value={duration}
                    onChange={(e) => setDuration(Number(e.target.value))}
                    className="w-full bg-[#0B1B2E] border border-[#1A3450] text-[#E8F0FA] rounded-lg px-3 py-2 outline-none focus:border-[#00D5FF]"
                    required
                  />
                </div>
                <div>
                  <label className="text-[10px] text-[#8295AC] block mb-1">Energy Budget (Wh)</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={energyCost}
                    onChange={(e) => setEnergyCost(Number(e.target.value))}
                    className="w-full bg-[#0B1B2E] border border-[#1A3450] text-[#E8F0FA] rounded-lg px-3 py-2 outline-none focus:border-[#00D5FF]"
                    required
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-lg bg-[#0B1B2E] border border-[#1A3450] text-[#8295AC]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-[#00D5FF] text-[#050B16] font-bold hover:bg-[#00D5FF]/90 shadow-md shadow-cyan-500/20"
                >
                  Submit Into Queue
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
