import React, { useState, useCallback, useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceArea, CartesianGrid } from 'recharts';
import type { KumanoData, TrackPoint } from './types';
import { Clock, TrendingUp, Ruler, Heart, TrendingDown } from 'lucide-react';

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

  // Unified selection handler for Mouse and Touch
  const startSelection = (idx: number) => {
    setRefAreaLeft(idx);
    setRefAreaRight(idx);
    setIsSelecting(true);
  };

  const updateSelection = (idx: number) => {
    if (isSelecting && refAreaLeft !== null) {
      setRefAreaRight(idx);
      setSelectedStats(calculateStats(refAreaLeft, idx));
    }
  };

  const endSelection = () => {
    if (isSelecting && refAreaLeft !== null && refAreaRight !== null) {
      const stats = calculateStats(refAreaLeft, refAreaRight);
      if (stats) onRangeSelect(stats.points);
    }
    setIsSelecting(false);
  };

  const clearSelection = () => {
    setRefAreaLeft(null);
    setRefAreaRight(null);
    setSelectedStats(null);
    onRangeSelect(null);
  };

  const handleChartClick = (state: any) => {
    if (!isSelecting && state && state.activePayload && state.activePayload.length > 0) {
      onPointClick(state.activePayload[0].payload.raw);
    }
  };

  if (chartData.length === 0) return null;

  return (
    <div className="relative w-full h-40 md:h-64 bg-white border-t border-slate-200 p-2 md:p-4 shadow-2xl flex flex-col select-none touch-none">
      {selectedStats && (
        <div className="absolute top-[-65px] md:top-[-80px] left-1/2 -translate-x-1/2 bg-slate-900/95 backdrop-blur text-white px-3 py-2 md:px-5 md:py-2.5 rounded-xl md:rounded-2xl shadow-2xl flex items-center gap-2 md:gap-8 border border-white/20 z-50 animate-in fade-in zoom-in duration-200 min-w-[280px] justify-center">
          <div className="flex items-center gap-1 md:gap-2 border-r border-white/10 pr-2 md:pr-4">
            <Ruler size={12} className="text-blue-400" /><p className="text-[10px] md:text-sm font-mono font-bold">{selectedStats.dist}k</p>
          </div>
          <div className="flex items-center gap-1 md:gap-2 border-r border-white/10 pr-2 md:pr-4">
            <TrendingUp size={12} className="text-emerald-400" /><p className="text-[10px] md:text-sm font-mono font-bold">+{selectedStats.gain}</p>
          </div>
          <div className="flex items-center gap-1 md:gap-2 border-r border-white/10 pr-2 md:pr-4">
            <TrendingDown size={12} className="text-orange-400" /><p className="text-[10px] md:text-sm font-mono font-bold">-{selectedStats.loss}</p>
          </div>
          <div className="flex items-center gap-1 md:gap-2 border-r border-white/10 pr-2 md:pr-4">
            <Clock size={12} className="text-amber-400" /><p className="text-[10px] md:text-sm font-mono font-bold">{selectedStats.duration}m</p>
          </div>
          {selectedStats.avgHr && (
            <div className="hidden sm:flex items-center gap-1 md:gap-2 border-r border-white/10 pr-4">
              <Heart size={12} className="text-rose-400" /><p className="text-[10px] md:text-sm font-mono font-bold">{selectedStats.avgHr}</p>
            </div>
          )}
          <button onClick={(e) => { e.stopPropagation(); clearSelection(); }} className="p-1 hover:bg-white/10 rounded-full transition-colors"><span className="text-xs">✕</span></button>
        </div>
      )}

      <div className="flex-1 min-h-0 cursor-crosshair">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart 
            data={chartData} 
            onMouseDown={(e) => e && startSelection(e.activeTooltipIndex)}
            onMouseMove={(e) => e && updateSelection(e.activeTooltipIndex)}
            onMouseUp={endSelection}
            onTouchStart={(e) => e && e.activeTooltipIndex !== undefined && startSelection(e.activeTooltipIndex)}
            onTouchMove={(e) => e && e.activeTooltipIndex !== undefined && updateSelection(e.activeTooltipIndex)}
            onTouchEnd={endSelection}
            onClick={handleChartClick}
            margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
          >
            <defs>
              <linearGradient id="dynamicFill" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.1} />
                <stop offset={`${(refAreaLeft || 0) / chartData.length * 100}%`} stopColor="#3b82f6" stopOpacity={0.1} />
                <stop offset={`${(refAreaLeft || 0) / chartData.length * 100}%`} stopColor="#f43f5e" stopOpacity={0.4} />
                <stop offset={`${(refAreaRight || 0) / chartData.length * 100}%`} stopColor="#f43f5e" stopOpacity={0.4} />
                <stop offset={`${(refAreaRight || 0) / chartData.length * 100}%`} stopColor="#3b82f6" stopOpacity={0.1} />
                <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.1} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis dataKey="dist" hide />
            <YAxis hide domain={['auto', 'auto']} />
            <Tooltip isAnimationActive={false} content={({ active, payload }) => (active && payload && payload.length && !isSelecting) ? (<div className="bg-slate-900 text-white p-1.5 rounded text-[9px] font-mono shadow-xl">{payload[0].payload.dist}km | {payload[0].payload.ele}m</div>) : null} />
            <Area type="monotone" dataKey="ele" stroke="#3b82f6" strokeWidth={2} fill="url(#dynamicFill)" isAnimationActive={false} activeDot={{ r: 3, fill: '#3b82f6', stroke: '#fff' }} />
            {refAreaLeft !== null && refAreaRight !== null && (<ReferenceArea x1={chartData[refAreaLeft].dist} x2={chartData[refAreaRight].dist} fill="#000" fillOpacity={0.05} />)}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default ElevationChart;
