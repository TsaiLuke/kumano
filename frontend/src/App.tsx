import { useState, useEffect } from 'react';
import type { KumanoData, PhotoData, SegmentData, TrackPoint } from './types';
import MapComponent from './MapComponent';
import Sidebar from './Sidebar';
import ElevationChart from './ElevationChart';

function App() {
  const [data, setData] = useState<KumanoData | null>(null);
  const [selectedSegment, setSelectedSegment] = useState<number | null>(null);
  const [activePhotoGroup, setActivePhotoGroup] = useState<PhotoData[] | null>(null);
  const [mapCenterPoint, setMapCenterPoint] = useState<{ lat: number, lon: number, t: number } | null>(null);
  const [rangeSelection, setRangeSelection] = useState<TrackPoint[] | null>(null);
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
  };

  const handleChartPointClick = (point: TrackPoint) => {
    setMapCenterPoint({ lat: point.lat, lon: point.lon, t: Date.now() });
  };

  const handleRangeSelect = (points: TrackPoint[]) => {
    setRangeSelection(points);
  };

  if (loading) {
    return (
      <div className="w-screen h-screen flex items-center justify-center bg-slate-900 flex-col gap-4">
        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-slate-400 font-mono text-xs uppercase tracking-widest">Generating Story Map...</p>
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
    <div className="flex h-screen w-screen overflow-hidden bg-white text-slate-900">
      <Sidebar 
        data={data} 
        onSegmentClick={handleSegmentClick} 
        selectedSegment={selectedSegment}
      />
      
      <main className="flex-1 flex flex-col relative">
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
        
        <ElevationChart 
          data={data} 
          onPointClick={handleChartPointClick}
          onRangeSelect={handleRangeSelect}
        />
      </main>
    </div>
  );
}

export default App;
