import { useState, useEffect } from 'react';
import type { KumanoData, PhotoData, SegmentData, TrackPoint } from './types';
import MapComponent from './MapComponent';
import Sidebar from './Sidebar';
import ElevationChart from './ElevationChart';
import { Menu, ChevronUp, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

function App() {
  const [data, setData] = useState<KumanoData | null>(null);
  const [selectedSegment, setSelectedSegment] = useState<number | null>(null);
  const [activePhotoGroup, setActivePhotoGroup] = useState<PhotoData[] | null>(null);
  const [mapCenterPoint, setMapCenterPoint] = useState<{ lat: number, lon: number, t: number } | null>(null);
  const [rangeSelection, setRangeSelection] = useState<TrackPoint[] | null>(null);
  
  // UI States
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 768);
  const [isChartExpanded, setIsChartExpanded] = useState(true);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/data/kumano_data.json')
      .then(res => {
        if (!res.ok) throw new Error('Failed to load data.');
        return res.json();
      })
      .then(d => {
        setData(d);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  const handleSegmentClick = (segment: SegmentData) => {
    setSelectedSegment(segment.segment_number);
    setMapCenterPoint({ lat: segment.mid_lat, lon: segment.mid_lon, t: Date.now() });
    if (window.innerWidth < 768) setIsSidebarOpen(false); // Auto-close on mobile
  };

  const handleChartPointClick = (point: TrackPoint) => {
    setMapCenterPoint({ lat: point.lat, lon: point.lon, t: Date.now() });
  };

  const handleRangeSelect = (points: TrackPoint[] | null) => {
    setRangeSelection(points);
  };

  if (loading) {
    return (
      <div className="w-screen h-screen flex items-center justify-center bg-slate-900 flex-col gap-4">
        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-slate-400 font-mono text-xs uppercase tracking-widest text-center px-4">Kumano Earth <br/> Optimizing Experience...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="w-screen h-screen flex items-center justify-center bg-red-50 text-red-600 font-bold">
        Error: {error || 'No data found'}
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-white text-slate-900 relative">
      {/* Mobile Toggle Button */}
      <button 
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        className="fixed top-4 left-4 z-50 p-3 bg-slate-900 text-white rounded-full shadow-2xl md:hidden active:scale-90 transition-transform"
      >
        <Menu size={20} />
      </button>

      <AnimatePresence mode="wait">
        {isSidebarOpen && (
          <motion.div 
            initial={{ x: -320 }}
            animate={{ x: 0 }}
            exit={{ x: -320 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-y-0 left-0 z-40 md:relative"
          >
            <Sidebar 
              data={data} 
              onSegmentClick={handleSegmentClick} 
              selectedSegment={selectedSegment}
            />
          </motion.div>
        )}
      </AnimatePresence>
      
      <main className="flex-1 flex flex-col relative min-w-0">
        <div className="flex-1 relative">
          <MapComponent 
            data={data}
            onSegmentClick={handleSegmentClick}
            selectedSegment={selectedSegment}
            activePhotoGroup={activePhotoGroup}
            setActivePhotoGroup={setActivePhotoGroup}
            mapCenterPoint={mapCenterPoint}
            rangeSelection={rangeSelection}
          />
        </div>
        
        {/* Collapsible Chart Section */}
        <div className="relative z-20">
          <button 
            onClick={() => setIsChartExpanded(!isChartExpanded)}
            className="absolute top-[-32px] left-1/2 -translate-x-1/2 px-4 py-1 bg-white border border-slate-200 border-b-0 rounded-t-lg shadow-lg flex items-center gap-2 text-[10px] font-black text-slate-500 hover:text-blue-600 transition-colors"
          >
            {isChartExpanded ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
            {isChartExpanded ? '隱藏剖面圖' : '查看海拔數據'}
          </button>
          
          <motion.div
            initial={false}
            animate={{ height: isChartExpanded ? 'auto' : 0, opacity: isChartExpanded ? 1 : 0 }}
            className="overflow-hidden bg-white shadow-[0_-10px_30px_rgba(0,0,0,0.1)]"
          >
            <ElevationChart 
              data={data} 
              onPointClick={handleChartPointClick}
              onRangeSelect={handleRangeSelect}
            />
          </motion.div>
        </div>
      </main>

      {/* Backdrop for mobile sidebar */}
      {isSidebarOpen && (
        <div 
          onClick={() => setIsSidebarOpen(false)}
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-30 md:hidden"
        />
      )}
    </div>
  );
}

export default App;
