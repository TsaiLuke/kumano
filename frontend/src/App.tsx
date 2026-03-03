import { useState, useEffect } from 'react';
import type { KumanoData, PhotoData, SegmentData, TrackPoint } from './types';
import MapComponent from './MapComponent';
import Sidebar from './Sidebar';
import ElevationChart from './ElevationChart';
import { Menu, ChevronUp, ChevronDown, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

function App() {
  const [data, setData] = useState<KumanoData | null>(null);
  const [selectedSegment, setSelectedSegment] = useState<number | null>(null);
  const [activePhotoGroup, setActivePhotoGroup] = useState<PhotoData[] | null>(null);
  const [mapCenterPoint, setMapCenterPoint] = useState<{ lat: number, lon: number, t: number } | null>(null);
  const [rangeSelection, setRangeSelection] = useState<TrackPoint[] | null>(null);
  
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
    if (window.innerWidth < 768) setIsSidebarOpen(false);
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
        <p className="text-slate-400 font-mono text-xs uppercase tracking-widest text-center px-4">Kumano Earth <br/> Final Polishing...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="w-screen h-screen flex items-center justify-center bg-red-50 text-red-600 font-bold">Error: {error}</div>
    );
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-white text-slate-900 relative">
      {/* Mobile Toggle Button */}
      <button 
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        className="fixed top-4 left-4 z-50 p-2.5 bg-slate-900 text-white rounded-lg shadow-2xl md:hidden active:scale-95 transition-all"
      >
        {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div 
            initial={{ x: -320 }}
            animate={{ x: 0 }}
            exit={{ x: -320 }}
            transition={{ type: 'spring', bounce: 0, duration: 0.3 }}
            className="fixed inset-y-0 left-0 z-50 md:relative w-80 flex-shrink-0 bg-white"
          >
            <div className="h-full pt-16 md:pt-0">
              <Sidebar 
                data={data} 
                onSegmentClick={handleSegmentClick} 
                selectedSegment={selectedSegment}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      <main className="flex-1 relative flex flex-col min-w-0">
        {/* Map is now ABSOLUTE to fill entire background */}
        <div className="absolute inset-0 z-0">
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
        
        {/* Floating Controls Layer */}
        <div className="flex-1 pointer-events-none relative" />

        {/* Collapsible Chart Section - Floating on top of map */}
        <div className="relative z-40 w-full pointer-events-auto">
          <div className="flex justify-center w-full">
            <button 
              onClick={() => setIsChartExpanded(!isChartExpanded)}
              className={`px-6 py-2.5 bg-white/95 backdrop-blur border border-slate-200 rounded-t-xl shadow-[0_-10px_25px_rgba(0,0,0,0.2)] flex items-center gap-2 text-[10px] font-black text-slate-600 transition-all hover:bg-white active:scale-95 mb-[-1px] ${isChartExpanded ? '' : 'transform translate-y-[-80px] md:translate-y-[-40px]'}`}
            >
              {isChartExpanded ? <ChevronDown size={16} className="text-blue-500" /> : <ChevronUp size={16} className="text-blue-500" />}
              {isChartExpanded ? '隱藏剖面' : '查看海拔剖面'}
            </button>
          </div>
          
          <motion.div
            initial={false}
            animate={{ height: isChartExpanded ? 'auto' : 0, y: isChartExpanded ? 0 : 100 }}
            transition={{ type: 'spring', bounce: 0, duration: 0.4 }}
            className="bg-white/95 backdrop-blur overflow-hidden"
          >
            <ElevationChart 
              data={data} 
              onPointClick={handleChartPointClick}
              onRangeSelect={handleRangeSelect}
            />
          </motion.div>
        </div>
      </main>

      {isSidebarOpen && (
        <div onClick={() => setIsSidebarOpen(false)} className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 md:hidden" />
      )}
    </div>
  );
}

export default App;
