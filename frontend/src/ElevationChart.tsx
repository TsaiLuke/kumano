import React, { useState, useCallback, useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceArea, CartesianGrid } from 'recharts';
import type { KumanoData, TrackPoint } from './types';
import { Clock, TrendingUp, Activity, Ruler, Heart, TrendingDown } from 'lucide-react';

interface Props {
  data: KumanoData;
  onPointClick: (point: TrackPoint) => void;
  onRangeSelect: (points: TrackPoint[] | null) => void;
}

const ElevationChart: React.FC<Props> = ({ data, onPointClick, onRangeSelect }) => {
  const [refAreaLeft, setRefAreaLeft] = useState<number | null>(null);
  const [refAreaRight, setRefAreaRight] = useState<number | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectedStats, setSelectedStats] = useState<any>(null);

  const flattenedTrack = useMemo(() => (data.trackSegments || []).flat(), [data.trackSegments]);
  
  const chartData = useMemo(() => (flattenedTrack || []).map((p, i) => ({
    dist: Math.round(p.cum_dist_m / 100) / 10,
    ele: Math.round(p.ele),
    index: i,
    raw: p
  })), [flattenedTrack]);

  const gradientStops = useMemo(() => {
    if (refAreaLeft === null || refAreaRight === null || chartData.length === 0) return null;
    const total = chartData.length;
    const startIdx = Math.min(refAreaLeft, refAreaRight);
    const endIdx = Math.max(refAreaLeft, refAreaRight);
    return { start: (startIdx / (total - 1)) * 100, end: (endIdx / (total - 1)) * 100 };
  }, [refAreaLeft, refAreaRight, chartData]);

  const calculateStats = useCallback((leftIdx: number, rightIdx: number) => {
    const start = Math.min(leftIdx, rightIdx);
    const end = Math.max(leftIdx, rightIdx);
    const selectedPoints = chartData.slice(start, end + 1).map(d => d.raw);
    if (selectedPoints.length < 2) return null;
    const startP = selectedPoints[0];
    const endP = selectedPoints[selectedPoints.length - 1];
    const dist = (endP.cum_dist_m - startP.cum_dist_m) / 1000;
    let gain = 0, loss = 0, hrSum = 0, hrCount = 0;
    for (let i = 1; i < selectedPoints.length; i++) {
      const diff = selectedPoints[i].ele - selectedPoints[i-1].ele;
      if (diff > 0) gain += diff; else if (diff < 0) loss += Math.abs(diff);
      if (selectedPoints[i].hr) { hrSum += selectedPoints[i].hr!; hrCount++; }
    }
    const durationSec = (new Date(endP.time).getTime() - new Date(startP.time).getTime()) / 1000;
    const pace = dist > 0.05 ? (durationSec / 60) / dist : 0;
    return { dist: dist.toFixed(2), gain: Math.round(gain), loss: Math.round(loss), duration: Math.floor(durationSec / 60), pace: pace > 0 ? `${Math.floor(pace)}'${Math.round((pace % 1) * 60).toString().padStart(2, '0')}` : '--', avgHr: hrCount > 0 ? Math.round(hrSum / hrCount) : null, points: selectedPoints };
  }, [chartData]);

  const handleMouseDown = (e: any) => { if (e && e.activeTooltipIndex !== undefined) { setRefAreaLeft(e.activeTooltipIndex); setRefAreaRight(e.activeTooltipIndex); setIsSelecting(true); } };
  const handleMouseMove = (e: any) => { if (isSelecting && e && e.activeTooltipIndex !== undefined) { setRefAreaRight(e.activeTooltipIndex); const stats = calculateStats(refAreaLeft!, e.activeTooltipIndex); setSelectedStats(stats); } };
  const handleMouseUp = () => { if (isSelecting && refAreaLeft !== null && refAreaRight !== null) { const stats = calculateStats(refAreaLeft, refAreaRight); if (stats) onRangeSelect(stats.points); } setIsSelecting(false); };
  
  const handleChartClick = (state: any) => {
    if (!isSelecting && state && state.activePayload && state.activePayload.length > 0) {
      onPointClick(state.activePayload[0].payload.raw);
    }
  };

  const clearSelection = () => { setRefAreaLeft(null); setRefAreaRight(null); setSelectedStats(null); onRangeSelect(null); };

  if (chartData.length === 0) return null;

  return (
    <div className="relative w-full h-64 bg-white border-t border-slate-200 p-4 shadow-2xl z-20 flex flex-col select-none">
      {selectedStats && (
        <div className="absolute top-[-75px] left-1/2 -translate-x-1/2 bg-slate-900/95 backdrop-blur text-white px-5 py-2.5 rounded-2xl shadow-2xl flex items-center gap-8 border border-white/20 z-30 animate-in fade-in zoom-in duration-200">
          <div className="flex items-center gap-2 border-r border-white/10 pr-4">
            <Ruler size={14} className="text-blue-400" /><div className="leading-tight"><p className="text-[8px] uppercase font-black text-slate-500">距離</p><p className="text-sm font-mono font-bold">{selectedStats.dist}km</p></div>
          </div>
          <div className="flex items-center gap-2 border-r border-white/10 pr-4">
            <TrendingUp size={14} className="text-emerald-400" /><div className="leading-tight"><p className="text-[8px] uppercase font-black text-slate-500">爬升</p><p className="text-sm font-mono font-bold">+{selectedStats.gain}m</p></div>
          </div>
          <div className="flex items-center gap-2 border-r border-white/10 pr-4">
            <TrendingDown size={14} className="text-orange-400" /><div className="leading-tight"><p className="text-[8px] uppercase font-black text-slate-500">下降</p><p className="text-sm font-mono font-bold">-{selectedStats.loss}m</p></div>
          </div>
          <div className="flex items-center gap-2 border-r border-white/10 pr-4">
            <Clock size={14} className="text-amber-400" /><div className="leading-tight"><p className="text-[8px] uppercase font-black text-slate-500">耗時</p><p className="text-sm font-mono font-bold">{selectedStats.duration}m</p></div>
          </div>
          <div className="flex items-center gap-2 border-r border-white/10 pr-4">
            <Activity size={14} className="text-indigo-400" /><div className="leading-tight"><p className="text-[8px] uppercase font-black text-slate-500">配速</p><p className="text-sm font-mono font-bold">{selectedStats.pace}</p></div>
          </div>
          {selectedStats.avgHr && (
            <div className="flex items-center gap-2">
              <Heart size={14} className="text-rose-400" /><div className="leading-tight"><p className="text-[8px] uppercase font-black text-slate-500">心率</p><p className="text-sm font-mono font-bold">{selectedStats.avgHr}</p></div>
            </div>
          )}
          <button onClick={clearSelection} className="ml-2 p-1 hover:bg-white/10 rounded-full transition-colors"><span className="text-xs">✕</span></button>
        </div>
      )}

      <div className="flex-1 min-h-0 cursor-crosshair">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart 
            data={chartData} 
            onClick={handleChartClick}
            onMouseDown={handleMouseDown} 
            onMouseMove={handleMouseMove} 
            onMouseUp={handleMouseUp} 
            margin={{ top: 10, right: 30, left: 10, bottom: 20 }}
          >
            <defs>
              <linearGradient id="dynamicFill" x1="0" y1="0" x2="1" y2="0">
                {gradientStops ? (<><stop offset="0%" stopColor="#3b82f6" stopOpacity={0.1} /><stop offset={`${gradientStops.start}%`} stopColor="#3b82f6" stopOpacity={0.1} /><stop offset={`${gradientStops.start}%`} stopColor="#f43f5e" stopOpacity={0.4} /><stop offset={`${gradientStops.end}%`} stopColor="#f43f5e" stopOpacity={0.4} /><stop offset={`${gradientStops.end}%`} stopColor="#3b82f6" stopOpacity={0.1} /><stop offset="100%" stopColor="#3b82f6" stopOpacity={0.1} /></>) : (<stop offset="0%" stopColor="#3b82f6" stopOpacity={0.2} />)}
              </linearGradient>
              <linearGradient id="dynamicStroke" x1="0" y1="0" x2="1" y2="0">
                {gradientStops ? (<><stop offset="0%" stopColor="#3b82f6" /><stop offset={`${gradientStops.start}%`} stopColor="#3b82f6" /><stop offset={`${gradientStops.start}%`} stopColor="#f43f5e" /><stop offset={`${gradientStops.end}%`} stopColor="#f43f5e" /><stop offset={`${gradientStops.end}%`} stopColor="#3b82f6" /><stop offset="100%" stopColor="#3b82f6" /></>) : (<stop offset="0%" stopColor="#3b82f6" />)}
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis dataKey="dist" fontSize={10} tick={{ fill: '#94a3b8' }} label={{ value: '距離 (km)', position: 'insideBottom', offset: -10, fontSize: 10, fill: '#64748b' }} axisLine={{ stroke: '#e2e8f0' }} tickLine={false} />
            <YAxis fontSize={10} tick={{ fill: '#94a3b8' }} label={{ value: '海拔 (m)', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle' }, fontSize: 10, fill: '#64748b' }} domain={['auto', 'auto']} axisLine={{ stroke: '#e2e8f0' }} tickLine={false} />
            <Tooltip isAnimationActive={false} content={({ active, payload }) => (active && payload && payload.length && !isSelecting) ? (<div className="bg-slate-900 text-white p-2 rounded text-[10px] font-mono shadow-xl border border-white/10">{payload[0].payload.dist} KM | {payload[0].payload.ele}M</div>) : null} />
            <Area type="monotone" dataKey="ele" stroke="url(#dynamicStroke)" strokeWidth={3} fill="url(#dynamicFill)" isAnimationActive={false} activeDot={{ r: 4, fill: '#3b82f6', stroke: '#fff' }} />
            {refAreaLeft !== null && refAreaRight !== null && (<ReferenceArea x1={chartData[refAreaLeft].dist} x2={chartData[refAreaRight].dist} strokeOpacity={0} fill="#000" fillOpacity={0.05} />)}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default ElevationChart;
