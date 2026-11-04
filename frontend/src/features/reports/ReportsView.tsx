import React, { useState, useEffect } from 'react';
import { FileText, Download, Plus, RefreshCw } from 'lucide-react';
import { useOrbitStore } from '../../store/useOrbitStore';
import { ReportItem } from '../../types';

export const ReportsView: React.FC = () => {
  const { selectedSatelliteId } = useOrbitStore();
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedReport, setSelectedReport] = useState<ReportItem | null>(null);
  const [reportType, setReportType] = useState('MISSION_SUMMARY');
  const [reportTitle, setReportTitle] = useState('Constellation Operations Summary');

  const fetchReports = async () => {
    setLoading(true);
    try {
      const resp = await fetch('/api/v1/reports');
      if (resp.ok) {
        const data = await resp.json();
        setReports(data);
        if (data.length > 0 && !selectedReport) {
          setSelectedReport(data[0]);
        }
      }
    } catch (err) {
      console.error('Failed to fetch reports:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const resp = await fetch('/api/v1/reports/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          report_type: reportType,
          title: reportTitle,
          format: 'MARKDOWN',
          satellite_id: selectedSatelliteId || undefined
        })
      });
      if (resp.ok) {
        const newRep = await resp.json();
        setSelectedReport(newRep);
        await fetchReports();
      }
    } catch (err) {
      console.error('Error generating report:', err);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6 font-mono text-xs select-none bg-[#050B16]">
      {/* Header */}
      <div className="flex items-center justify-between p-4 rounded-xl bg-[#071426] border border-[#1A3450]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#00D5FF]/10 border border-[#00D5FF]/30 flex items-center justify-center">
            <FileText className="w-5 h-5 text-[#00D5FF]" />
          </div>
          <div>
            <h1 className="text-base font-bold text-[#E8F0FA]">MISSION REPORTING & AUDIT EXPORT</h1>
            <p className="text-[11px] text-[#8295AC]">Automated formal mission summaries, conjunction risk reviews, and telemetry logs.</p>
          </div>
        </div>

        <button
          onClick={fetchReports}
          className="p-2 rounded-lg bg-[#0B1B2E] border border-[#1A3450] text-[#8295AC] hover:text-[#E8F0FA]"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Main Grid: Generator & Report Viewer */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Generate Form & Reports List */}
        <div className="space-y-4">
          {/* Generation Box */}
          <div className="p-4 rounded-xl bg-[#071426] border border-[#1A3450] space-y-3">
            <h2 className="text-xs font-bold text-[#E8F0FA] uppercase tracking-wider flex items-center gap-2">
              <Plus className="w-4 h-4 text-[#00D5FF]" />
              <span>Generate New Report</span>
            </h2>

            <form onSubmit={handleGenerate} className="space-y-3 text-xs">
              <div>
                <label className="text-[10px] text-[#8295AC] uppercase block mb-1">Report Profile</label>
                <select
                  value={reportType}
                  onChange={(e) => {
                    setReportType(e.target.value);
                    if (e.target.value === 'MISSION_SUMMARY') setReportTitle('Constellation Operations Summary');
                    if (e.target.value === 'TELEMETRY_LOG') setReportTitle('Subsystem Bus Telemetry Log');
                    if (e.target.value === 'CONJUNCTION_ASSESSMENT') setReportTitle('Orbital Conjunction Safety Review');
                    if (e.target.value === 'FLEET_STATUS') setReportTitle('Constellation Fleet Health Audit');
                  }}
                  className="w-full bg-[#0B1B2E] border border-[#1A3450] text-[#E8F0FA] rounded-lg px-3 py-2 outline-none focus:border-[#00D5FF]"
                >
                  <option value="MISSION_SUMMARY">MISSION_SUMMARY (Full Operations)</option>
                  <option value="TELEMETRY_LOG">TELEMETRY_LOG (Power & Thermal)</option>
                  <option value="CONJUNCTION_ASSESSMENT">CONJUNCTION_ASSESSMENT (Safety)</option>
                  <option value="FLEET_STATUS">FLEET_STATUS (Constellation Audit)</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] text-[#8295AC] uppercase block mb-1">Report Title</label>
                <input
                  type="text"
                  value={reportTitle}
                  onChange={(e) => setReportTitle(e.target.value)}
                  className="w-full bg-[#0B1B2E] border border-[#1A3450] text-[#E8F0FA] rounded-lg px-3 py-2 outline-none focus:border-[#00D5FF]"
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full py-2 rounded-lg bg-[#00D5FF] text-[#050B16] font-bold hover:bg-[#00D5FF]/90 flex items-center justify-center gap-2 shadow-md shadow-cyan-500/20 active:scale-95 transition-all"
              >
                <FileText className="w-4 h-4" />
                <span>Generate Report</span>
              </button>
            </form>
          </div>

          {/* Stored Reports List */}
          <div className="space-y-2">
            <div className="text-[10px] text-[#8295AC] uppercase tracking-wider font-semibold">
              Archived Operations Reports ({reports.length})
            </div>

            <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
              {reports.map((rep) => {
                const isSelected = selectedReport?.id === rep.id;
                return (
                  <div
                    key={rep.id}
                    onClick={() => setSelectedReport(rep)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#10243B] border-[#00D5FF] shadow-sm shadow-cyan-500/10'
                        : 'bg-[#071426] border-[#1A3450] hover:border-[#8295AC]/40'
                    }`}
                  >
                    <div className="font-semibold text-[#E8F0FA] truncate">{rep.title}</div>
                    <div className="text-[10px] text-[#8295AC] flex justify-between mt-1">
                      <span className="text-[#00D5FF]">{rep.report_type}</span>
                      <span>{rep.format}</span>
                    </div>
                    <div className="text-[9px] text-[#8295AC] mt-1 pt-1 border-t border-[#1A3450]/40">
                      Epoch: {new Date(rep.generated_epoch).toUTCString()}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Markdown Document Viewer */}
        <div className="lg:col-span-2">
          {selectedReport ? (
            <div className="rounded-xl border border-[#1A3450] bg-[#071426] flex flex-col h-[650px] overflow-hidden">
              <div className="p-4 border-b border-[#1A3450] bg-[#091A30] flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-[#E8F0FA]">{selectedReport.title}</h3>
                  <div className="text-[10px] text-[#8295AC]">Report ID: {selectedReport.id}</div>
                </div>
                <a
                  href={`/api/v1/reports/${selectedReport.id}/download`}
                  download={`OrbitOS-${selectedReport.id}.md`}
                  className="px-3 py-1.5 rounded-lg bg-[#00D5FF] text-[#050B16] font-bold hover:bg-[#00D5FF]/90 flex items-center gap-1.5 shadow-md shadow-cyan-500/20"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download .md</span>
                </a>
              </div>

              {/* Document Text */}
              <div className="p-6 overflow-y-auto flex-1 bg-[#050B16] text-[#E8F0FA] font-mono whitespace-pre-wrap leading-relaxed select-text text-[11px]">
                {selectedReport.content}
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-[#1A3450] bg-[#071426] p-12 text-center text-[#8295AC]">
              Select or generate a mission report to review document contents and export.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
