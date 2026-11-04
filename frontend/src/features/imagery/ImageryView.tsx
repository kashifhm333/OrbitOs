import React, { useState, useEffect } from 'react';
import { Image as ImageIcon, Download, Plus, RefreshCw } from 'lucide-react';
import { useOrbitStore } from '../../store/useOrbitStore';
import { ImageryItem } from '../../types';

export const ImageryView: React.FC = () => {
  const { satellites, selectedSatelliteId } = useOrbitStore();
  const [imagery, setImagery] = useState<ImageryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<ImageryItem | null>(null);
  const [filterBand, setFilterBand] = useState<string>('ALL');
  const [showGenerateModal, setShowGenerateModal] = useState(false);

  // Form states
  const [targetName, setTargetName] = useState('Gibraltar Maritime Passage');
  const [targetLat, setTargetLat] = useState(36.14);
  const [targetLon, setTargetLon] = useState(-5.35);
  const [spectralBand, setSpectralBand] = useState('RGB');
  const [resolutionM, setResolutionM] = useState(0.8);

  const fetchImagery = async () => {
    setLoading(true);
    try {
      const resp = await fetch('/api/v1/imagery');
      if (resp.ok) {
        const data = await resp.json();
        setImagery(data);
        if (data.length > 0 && !selectedImage) {
          setSelectedImage(data[0]);
        }
      }
    } catch (err) {
      console.error('Failed to fetch imagery catalog:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchImagery();
  }, []);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const satId = selectedSatelliteId || Object.keys(satellites)[0] || 'sat-002';
      const resp = await fetch('/api/v1/imagery/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          satellite_id: satId,
          target_name: targetName,
          target_lat: Number(targetLat),
          target_lon: Number(targetLon),
          spectral_band: spectralBand,
          resolution_m: Number(resolutionM)
        })
      });
      if (resp.ok) {
        setShowGenerateModal(false);
        const newImg = await resp.json();
        setSelectedImage(newImg);
        await fetchImagery();
      }
    } catch (err) {
      console.error('Error generating imagery:', err);
    }
  };

  const filtered = filterBand === 'ALL' 
    ? imagery 
    : imagery.filter(img => img.spectral_band.toUpperCase() === filterBand);

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6 font-mono text-xs select-none bg-[#050B16]">
      {/* Header */}
      <div className="flex items-center justify-between p-4 rounded-xl bg-[#071426] border border-[#1A3450]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#00D5FF]/10 border border-[#00D5FF]/30 flex items-center justify-center">
            <ImageIcon className="w-5 h-5 text-[#00D5FF]" />
          </div>
          <div>
            <h1 className="text-base font-bold text-[#E8F0FA]">EARTH OBSERVATION IMAGERY CATALOG</h1>
            <p className="text-[11px] text-[#8295AC]">Synthetic multi-spectral satellite imagery and payload acquisition records.</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Band Filters */}
          <div className="flex bg-[#0B1B2E] border border-[#1A3450] rounded-lg p-0.5">
            {['ALL', 'RGB', 'NIR', 'SAR'].map((band) => (
              <button
                key={band}
                onClick={() => setFilterBand(band)}
                className={`px-2.5 py-1 rounded text-[10px] font-semibold transition-all ${
                  filterBand === band ? 'bg-[#00D5FF] text-[#050B16]' : 'text-[#8295AC] hover:text-[#E8F0FA]'
                }`}
              >
                {band}
              </button>
            ))}
          </div>

          <button
            onClick={() => setShowGenerateModal(true)}
            className="px-3 py-1.5 rounded-lg bg-[#00D5FF] text-[#050B16] font-bold hover:bg-[#00D5FF]/90 flex items-center gap-1.5 shadow-md shadow-cyan-500/20"
          >
            <Plus className="w-4 h-4" />
            <span>Simulate Capture</span>
          </button>
        </div>
      </div>

      {/* Main Dual-Pane Catalog & Viewer */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Imagery List */}
        <div className="space-y-3">
          <div className="text-[10px] text-[#8295AC] uppercase tracking-wider font-semibold flex items-center justify-between">
            <span>Captured Observations ({filtered.length})</span>
            <button onClick={fetchImagery} className="text-[#00D5FF] hover:text-cyan-300">
              <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
            {filtered.map((img) => {
              const isSelected = selectedImage?.id === img.id;
              const bandColor = img.spectral_band === 'RGB' ? 'text-[#00D5FF]' : img.spectral_band === 'NIR' ? 'text-[#a855f7]' : 'text-[#FFB547]';

              return (
                <div
                  key={img.id}
                  onClick={() => setSelectedImage(img)}
                  className={`p-3 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[#10243B] border-[#00D5FF] shadow-md shadow-cyan-500/10'
                      : 'bg-[#071426] border-[#1A3450] hover:border-[#8295AC]/40 hover:bg-[#0B1B2E]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-[#E8F0FA] truncate">{img.target_name}</span>
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded bg-[#0B1B2E] border border-[#1A3450] ${bandColor}`}>
                      {img.spectral_band}
                    </span>
                  </div>
                  <div className="text-[10px] text-[#8295AC] flex justify-between">
                    <span>Sat: {img.satellite_id}</span>
                    <span>Res: {img.resolution_m}m</span>
                  </div>
                  <div className="text-[10px] text-[#8295AC] flex justify-between mt-1 pt-1 border-t border-[#1A3450]/40">
                    <span>{img.target_lat}°N, {img.target_lon}°E</span>
                    <span className="text-[#00D69A]">Cloud: {img.cloud_cover_pct}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Selected Image Viewer & HUD */}
        <div className="lg:col-span-2 space-y-4">
          {selectedImage ? (
            <div className="rounded-xl border border-[#1A3450] bg-[#071426] overflow-hidden flex flex-col">
              {/* Image Preview Canvas */}
              <div className="w-full bg-[#050B16] flex items-center justify-center p-4 border-b border-[#1A3450] relative">
                <img 
                  src={selectedImage.image_url} 
                  alt={selectedImage.target_name} 
                  className="max-h-[380px] w-auto rounded border border-[#1A3450] shadow-xl"
                />
                <div className="absolute bottom-6 right-6 flex items-center gap-2">
                  <a
                    href={selectedImage.image_url}
                    download={`OrbitOS-${selectedImage.id}.svg`}
                    className="px-3 py-1.5 rounded-lg bg-[#00D5FF] text-[#050B16] font-bold hover:bg-[#00D5FF]/90 flex items-center gap-1.5 shadow-lg shadow-cyan-500/20"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download SVG</span>
                  </a>
                </div>
              </div>

              {/* Metadata HUD */}
              <div className="p-4 space-y-3 bg-[#071426]">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-[#E8F0FA] flex items-center gap-2">
                    <span>{selectedImage.target_name}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-[#10243B] text-[#00D5FF] border border-[#1A3450]">
                      {selectedImage.id}
                    </span>
                  </h3>
                  <div className="text-[10px] text-[#FFB547] bg-[#FFB547]/10 border border-[#FFB547]/20 px-2 py-0.5 rounded">
                    SYNTHETIC SIMULATION DATA
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-[11px]">
                  <div className="p-2.5 rounded-lg bg-[#0B1B2E] border border-[#1A3450]">
                    <div className="text-[9px] text-[#8295AC] uppercase">GSD Resolution</div>
                    <div className="font-semibold text-[#00D5FF]">{selectedImage.resolution_m} m/pixel</div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-[#0B1B2E] border border-[#1A3450]">
                    <div className="text-[9px] text-[#8295AC] uppercase">Spectral Band</div>
                    <div className="font-semibold text-[#E8F0FA]">{selectedImage.spectral_band}</div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-[#0B1B2E] border border-[#1A3450]">
                    <div className="text-[9px] text-[#8295AC] uppercase">Field of View</div>
                    <div className="font-semibold text-[#E8F0FA]">{selectedImage.fov_deg}° Swath</div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-[#0B1B2E] border border-[#1A3450]">
                    <div className="text-[9px] text-[#8295AC] uppercase">Cloud Cover</div>
                    <div className="font-semibold text-[#00D69A]">{selectedImage.cloud_cover_pct}%</div>
                  </div>
                </div>

                <div className="text-[11px] text-[#8295AC] bg-[#0B1B2E] p-3 rounded-lg border border-[#1A3450] space-y-1">
                  <div><span className="text-[#E8F0FA]">Coordinates:</span> {selectedImage.target_lat}° N, {selectedImage.target_lon}° E</div>
                  <div><span className="text-[#E8F0FA]">Sensor Payload:</span> Multispectral Earth Observation Suite (EO-MS-01)</div>
                  <div><span className="text-[#E8F0FA]">Captured Epoch:</span> {new Date(selectedImage.capture_epoch).toUTCString()}</div>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-[#1A3450] bg-[#071426] p-12 text-center text-[#8295AC]">
              Select an imagery observation from the catalog to view metadata and visual asset.
            </div>
          )}
        </div>
      </div>

      {/* Capture Modal */}
      {showGenerateModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#071426] border border-[#1A3450] rounded-xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#1A3450] pb-3">
              <h3 className="text-sm font-bold text-[#E8F0FA] flex items-center gap-2">
                <Plus className="w-4 h-4 text-[#00D5FF]" />
                <span>Trigger Payload Earth Observation</span>
              </h3>
              <button onClick={() => setShowGenerateModal(false)} className="text-[#8295AC] hover:text-[#E8F0FA]">✕</button>
            </div>

            <form onSubmit={handleGenerate} className="space-y-3 font-mono text-xs">
              <div>
                <label className="text-[10px] text-[#8295AC] block mb-1">Target Description / Name</label>
                <input
                  type="text"
                  value={targetName}
                  onChange={(e) => setTargetName(e.target.value)}
                  className="w-full bg-[#0B1B2E] border border-[#1A3450] text-[#E8F0FA] rounded-lg px-3 py-2 outline-none focus:border-[#00D5FF]"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-[#8295AC] block mb-1">Target Latitude (deg)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="-90"
                    max="90"
                    value={targetLat}
                    onChange={(e) => setTargetLat(Number(e.target.value))}
                    className="w-full bg-[#0B1B2E] border border-[#1A3450] text-[#E8F0FA] rounded-lg px-3 py-2 outline-none focus:border-[#00D5FF]"
                    required
                  />
                </div>
                <div>
                  <label className="text-[10px] text-[#8295AC] block mb-1">Target Longitude (deg)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="-180"
                    max="180"
                    value={targetLon}
                    onChange={(e) => setTargetLon(Number(e.target.value))}
                    className="w-full bg-[#0B1B2E] border border-[#1A3450] text-[#E8F0FA] rounded-lg px-3 py-2 outline-none focus:border-[#00D5FF]"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-[#8295AC] block mb-1">Spectral Band</label>
                  <select
                    value={spectralBand}
                    onChange={(e) => setSpectralBand(e.target.value)}
                    className="w-full bg-[#0B1B2E] border border-[#1A3450] text-[#E8F0FA] rounded-lg px-3 py-2 outline-none focus:border-[#00D5FF]"
                  >
                    <option value="RGB">RGB TrueColor</option>
                    <option value="NIR">NIR Near-Infrared</option>
                    <option value="SAR">SAR Synthetic Aperture Radar</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-[#8295AC] block mb-1">GSD Resolution (m)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0.3"
                    max="10.0"
                    value={resolutionM}
                    onChange={(e) => setResolutionM(Number(e.target.value))}
                    className="w-full bg-[#0B1B2E] border border-[#1A3450] text-[#E8F0FA] rounded-lg px-3 py-2 outline-none focus:border-[#00D5FF]"
                    required
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowGenerateModal(false)}
                  className="px-4 py-2 rounded-lg bg-[#0B1B2E] border border-[#1A3450] text-[#8295AC]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-[#00D5FF] text-[#050B16] font-bold hover:bg-[#00D5FF]/90 shadow-md shadow-cyan-500/20"
                >
                  Acquire Synthetic Image
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
