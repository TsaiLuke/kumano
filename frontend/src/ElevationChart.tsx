import React, { useState, useCallback, useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceArea, CartesianGrid, ReferenceLine } from 'recharts';
import type { KumanoData, TrackPoint } from './types';
import { Clock, TrendingUp, Ruler, Heart, TrendingDown } from 'lucide-react';

interface Props {
  data: KumanoData;
  onPointClick: (point: TrackPoint) => void;
  onRangeSelect: (points: TrackPoint[] | null) => void;
  hoveredPoint: TrackPoint | null;
}

const ElevationChart: React.FC<Props> = ({ data, onPointClick, onRangeSelect, hoveredPoint }) => {
  const [refAreaLeft, setRefAreaLeft] = useState<number | null>(null);
  const [refAreaRight, setRefAreaRight] = useState<number | null>(null);
  const [selectedStats, setSelectedStats] = useState<any>(null);

  const flattenedTrack = useMemo(() => (data.trackSegments || []).flat(), [data.trackSegments]);
  const chartData = useMemo(() => (flattenedTrack || []).map((p, i) => ({
    dist: Math.round(p.cum_dist_m / 100) / 10,
    ele: Math.round(p.ele),
    index: i,
    raw: p
  })), [flattenedTrack]);

  const hoveredIndex = useMemo(() => {
    if (!hoveredPoint) return null;
    return chartData.findIndex(d => d.raw === hoveredPoint);
  }, [hoveredPoint, chartData]);

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
    return { dist: dist.toFixed(2), gain: Math.round(gain), loss: Math.round(loss), duration: Math.floor(durationSec / 60), avgHr: hrCount > 0 ? Math.round(hrSum / hrCount) : null, points: selectedPoints };
  }, [chartData]);

  const handleChartClick = (e: any) => {
    const idx = e?.activeTooltipIndex;
    if (typeof idx !== 'number') return;

    if (refAreaLeft === null) {
      // First click: Set Start Point
      setRefAreaLeft(idx);
      onPointClick(chartData[idx].raw);
    } else if (refAreaRight === null) {
      // Second click: Set End Point and Show Stats
      setRefAreaRight(idx);
      const stats = calculateStats(refAreaLeft, idx);
      setSelectedStats(stats);
      if (stats) onRangeSelect(stats.points);
    } else {
      // Third click: Clear and Start New
      clearSelection();
      setRefAreaLeft(idx);
    }
  };

  const clearSelection = () => {
    setRefAreaLeft(null);
    setRefAreaRight(null);
    setSelectedStats(null);
    onRangeSelect(null);
  };

  const selectionStartPercent = useMemo(() => {
    if (refAreaLeft === null || refAreaRight === null) return 0;
    return (Math.min(refAreaLeft, refAreaRight) / (chartData.length - 1)) * 100;
  }, [refAreaLeft, refAreaRight, chartData.length]);

  const selectionEndPercent = useMemo(() => {
    if (refAreaLeft === null || refAreaRight === null) return 0;
    return (Math.max(refAreaLeft, refAreaRight) / (chartData.length - 1)) * 100;
  }, [refAreaLeft, refAreaRight, chartData.length]);

  if (chartData.length === 0) return null;

  return (
    <div className="relative w-full h-44 md:h-64 bg-white/95 border-t border-slate-200 p-2 md:p-4 flex flex-col select-none">
      {selectedStats && (
        <div className="absolute top-[-65px] md:top-[-85px] left-1/2 -translate-x-1/2 bg-slate-900/95 backdrop-blur text-white px-3 py-2 md:px-5 md:py-2.5 rounded-xl md:rounded-2xl shadow-2xl flex items-center gap-2 md:gap-8 border border-white/20 z-[100] animate-in fade-in zoom-in duration-200 pointer-events-auto">
          <div className="flex flex-col items-center border-r border-white/10 pr-2 md:pr-4">
             <div className="flex items-center gap-1 md:gap-2">
                <Ruler size={12} className="text-blue-400" /><p className="text-[10px] md:text-sm font-mono font-bold">{selectedStats.dist}k</p>
             </div>
             <span className="text-[8px] text-slate-400 font-bold uppercase">距離</span>
          </div>
          <div className="flex flex-col items-center border-r border-white/10 pr-2 md:pr-4">
            <div className="flex items-center gap-1 md:gap-2">
                <TrendingUp size={12} className="text-emerald-400" /><p className="text-[10px] md:text-sm font-mono font-bold">+{selectedStats.gain}</p>
            </div>
            <span className="text-[8px] text-slate-400 font-bold uppercase">爬升</span>
          </div>
          <div className="flex flex-col items-center border-r border-white/10 pr-2 md:pr-4">
            <div className="flex items-center gap-1 md:gap-2">
                <TrendingDown size={12} className="text-orange-400" /><p className="text-[10px] md:text-sm font-mono font-bold">-{selectedStats.loss}</p>
            </div>
            <span className="text-[8px] text-slate-400 font-bold uppercase">下降</span>
          </div>
          <div className="flex flex-col items-center border-r border-white/10 pr-2 md:pr-4">
             <div className="flex items-center gap-1 md:gap-2">
                <Clock size={12} className="text-amber-400" /><p className="text-[10px] md:text-sm font-mono font-bold">{selectedStats.duration}m</p>
             </div>
             <span className="text-[8px] text-slate-400 font-bold uppercase">耗時</span>
          </div>
          {selectedStats.avgHr && (
            <div className="hidden sm:flex flex-col items-center border-r border-white/10 pr-4">
              <div className="flex items-center gap-1 md:gap-2">
                <Heart size={12} className="text-rose-400" /><p className="text-[10px] md:text-sm font-mono font-bold">{selectedStats.avgHr}</p>
              </div>
              <span className="text-[8px] text-slate-400 font-bold uppercase">平均心率</span>
            </div>
          )}
          <button onClick={(e) => { e.stopPropagation(); clearSelection(); }} className="p-2 hover:bg-white/10 rounded-full transition-colors text-white flex items-center justify-center bg-white/5"><span className="text-xs">✕</span></button>
        </div>
      )}

      <div className="flex-1 min-h-0 cursor-crosshair">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart 
            data={chartData} 
            onClick={handleChartClick}
            margin={{ top: 10, right: 10, left: 0, bottom: 5 }}
          >
            <defs>
              <linearGradient id="selectionFill" x1="0" y1="0" x2="1" y2="0">
                {refAreaLeft !== null && refAreaRight !== null ? (
                  <>
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.1} />
                    <stop offset={`${selectionStartPercent}%`} stopColor="#3b82f6" stopOpacity={0.1} />
                    <stop offset={`${selectionStartPercent}%`} stopColor="#f43f5e" stopOpacity={0.4} />
                    <stop offset={`${selectionEndPercent}%`} stopColor="#f43f5e" stopOpacity={0.4} />
                    <stop offset={`${selectionEndPercent}%`} stopColor="#3b82f6" stopOpacity={0.1} />
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.1} />
                  </>
                ) : (
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.2} />
                )}
              </linearGradient>
              <linearGradient id="selectionStroke" x1="0" y1="0" x2="1" y2="0">
                {refAreaLeft !== null && refAreaRight !== null ? (
                  <>
                    <stop offset="0%" stopColor="#3b82f6" />
                    <stop offset={`${selectionStartPercent}%`} stopColor="#3b82f6" />
                    <stop offset={`${selectionStartPercent}%`} stopColor="#f43f5e" />
                    <stop offset={`${selectionEndPercent}%`} stopColor="#f43f5e" />
                    <stop offset={`${selectionEndPercent}%`} stopColor="#3b82f6" />
                    <stop offset="100%" stopColor="#3b82f6" />
                  </>
                ) : (
                  <stop offset="0%" stopColor="#3b82f6" />
                )}
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis dataKey="dist" hide />
            <YAxis hide domain={['auto', 'auto']} />
            <Tooltip isAnimationActive={false} wrapperStyle={{ pointerEvents: 'none' }} content={({ active, payload }) => (active && payload && payload.length) ? (<div className="bg-slate-900 text-white p-1.5 rounded text-[9px] font-mono shadow-xl border border-white/10">{payload[0].payload.dist}km | {payload[0].payload.ele}m</div>) : null} />
            <Area type="monotone" dataKey="ele" stroke="url(#selectionStroke)" strokeWidth={3} fill="url(#selectionFill)" isAnimationActive={false} activeDot={{ r: 4, fill: '#3b82f6', stroke: '#fff' }} />
            
            {hoveredIndex !== null && (
              <ReferenceLine x={chartData[hoveredIndex].dist} stroke="#3b82f6" strokeWidth={2} strokeDasharray="3 3" style={{ pointerEvents: 'none' }} />
            )}

            {refAreaLeft !== null && (
              <ReferenceArea 
                x1={chartData[refAreaLeft].dist} 
                x2={refAreaRight !== null ? chartData[refAreaRight].dist : chartData[refAreaLeft].dist} 
                fill="#000" fillOpacity={0.05} strokeOpacity={0} 
              />
            )}
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <p className="text-[9px] text-slate-400 text-center mt-1 font-bold uppercase tracking-widest">
        {refAreaLeft === null ? '點擊圖表設定區間起點' : refAreaRight === null ? '再點擊一次設定終點' : '區間分析完成 (按 ✕ 取消)'}
      </p>
    </div>
  );
};

export default ElevationChart;
