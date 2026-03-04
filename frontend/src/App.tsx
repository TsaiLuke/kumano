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
  const [hoveredPoint, setHoveredPoint] = useState<TrackPoint | null>(null);
  
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
    if (!segment || segment.segment_number === null) {
      handleClearSelection();
      return;
    }
    setSelectedSegment(segment.segment_number);
    setMapCenterPoint({ lat: segment.mid_lat, lon: segment.mid_lon, t: Date.now() });
    if (window.innerWidth < 768) setIsSidebarOpen(false);
  };

  const handleClearSelection = () => {
    setSelectedSegment(null);
    setActivePhotoGroup(null);
    setRangeSelection(null);
  };

  const handleChartPointClick = (point: TrackPoint) => {
    setMapCenterPoint({ lat: point.lat, lon: point.lon, t: Date.now() });
  };

  const handleRangeSelect = (points: TrackPoint[] | null) => {
    setRangeSelection(points);
    if (!points) setSelectedSegment(null);
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
    <div className="flex h-screen w-screen overflow-hidden bg-white text-slate-900">
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div 
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 320, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            className="h-full flex-shrink-0 border-r border-slate-200 z-40 bg-white"
          >
            <Sidebar 
              data={data} 
              onSegmentClick={handleSegmentClick} 
              selectedSegment={selectedSegment}
            />
          </motion.div>
        )}
      </AnimatePresence>
      
      <div className="flex-1 flex flex-col min-w-0 relative">
        {/* Map Header / Mobile Toggle */}
        <button 
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="absolute top-4 left-4 z-50 p-2.5 bg-white border border-slate-200 text-slate-700 rounded-lg shadow-xl hover:bg-slate-50 transition-all active:scale-95"
        >
          {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
        </button>

        {/* Top: Map */}
        <div className="flex-1 relative z-0">
          <MapComponent 
            data={data}
            onSegmentClick={handleSegmentClick}
            selectedSegment={selectedSegment}
            activePhotoGroup={activePhotoGroup}
            setActivePhotoGroup={setActivePhotoGroup}
            mapCenterPoint={mapCenterPoint}
            rangeSelection={rangeSelection}
            setHoveredPoint={setHoveredPoint}
          />
        </div>

        {/* Bottom: Fixed Elevation Chart */}
        <div className="h-48 md:h-64 border-t border-slate-200 bg-white z-10">
          <ElevationChart 
            data={data} 
            onPointClick={handleChartPointClick}
            onRangeSelect={handleRangeSelect}
            hoveredPoint={hoveredPoint}
          />
        </div>
      </div>
    </div>
  );
}

export default App;
