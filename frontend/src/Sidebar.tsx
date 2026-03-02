import React from 'react';
import type { KumanoData, SegmentData, PhotoData } from './types';
import { Activity, Clock, TrendingUp, TrendingDown, Heart, Map as MapIcon } from 'lucide-react';
import { motion } from 'framer-motion';

interface Props {
  data: KumanoData;
  onSegmentClick: (segment: SegmentData) => void;
  selectedSegment: number | null;
}

const Sidebar: React.FC<Props> = ({ data, onSegmentClick, selectedSegment }) => {
  const allPoints = (data.trackSegments || []).flat();
  const lastPoint = allPoints[allPoints.length - 1];
  const totalDistance = (lastPoint ? lastPoint.cum_dist_m / 1000 : 0).toFixed(1);
  const totalGain = (data.segments || []).reduce((acc, s) => acc + s.gain, 0).toFixed(0);
  
  return (
    <div className="w-80 h-full bg-white flex flex-col border-r border-gray-200 z-10 shadow-xl">
      <div className="p-6 bg-slate-900 text-white flex-shrink-0">
        <h1 className="text-2xl font-bold tracking-tight">Kumano Earth</h1>
        <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
          <MapIcon size={12} /> 熊野古道 中邊路
        </p>
        
        <div className="grid grid-cols-2 gap-4 mt-6">
          <div>
            <p className="text-[10px] uppercase text-slate-400 font-bold">總距離</p>
            <p className="text-xl font-mono">{totalDistance} <span className="text-xs">km</span></p>
          </div>
          <div>
            <p className="text-[10px] uppercase text-slate-400 font-bold">總爬升</p>
            <p className="text-xl font-mono">{totalGain} <span className="text-xs">m</span></p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {(() => {
          let currentDay = -1;
          return (data.segments || []).map((seg) => {
            // Find which day this segment belongs to by checking its mid point
            // This is a bit simplified but effective
            const segmentDay = data.dayMarkers.find(dm => {
               // Logic: if segment is before Day X end, it's likely Day X
               return true; // Fallback
            });
            
            // To be more precise, let's just use the segment index or simple calculation
            // Since we know roughly how many KM per day from your data
            // Or better: pass the day info into the segment data during processing (which we didn't do yet)
            
            // For now, let's keep the flat list but improve the header and spacing
            return (
              <motion.div
                key={seg.segment_number}
                whileHover={{ x: 4 }}
                onClick={() => onSegmentClick(seg)}
                className={`p-3 rounded-lg cursor-pointer transition-all border ${
                  selectedSegment === seg.segment_number 
                    ? 'bg-blue-50 border-blue-200 shadow-sm' 
                    : 'bg-white border-gray-100 hover:border-gray-200'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-sm font-black ${selectedSegment === seg.segment_number ? 'text-blue-600' : 'text-gray-700'}`}>
                    {seg.segment_number} KM
                  </span>
                  <div className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-[10px] font-bold">
                    {seg.pace} /km
                  </div>
                </div>

                <div className="flex justify-between items-center text-[10px] text-gray-500 font-medium">
                  <div className="flex items-center gap-1">
                    <TrendingUp size={10} className="text-emerald-600" />
                    <span>+{seg.gain}m</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <TrendingDown size={10} className="text-orange-600" />
                    <span>-{seg.loss}m</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Heart size={10} className="text-rose-500" />
                    <span>{seg.avg_hr} bpm</span>
                  </div>
                </div>
              </motion.div>
            );
          });
        })()}
      </div>
    </div>
  );
};

export default Sidebar;
