import React, { useRef, useEffect, useState, useMemo } from 'react';
import Map, { Source, Layer, Marker, NavigationControl, Popup } from 'react-map-gl/mapbox';
import type { MapRef } from 'react-map-gl/mapbox';
import type { KumanoData, PhotoData, SegmentData, TrackPoint } from './types';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Camera, ChevronLeft, ChevronRight, Heart, Layers, MapPin, Flag, Navigation } from 'lucide-react';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;

const MAP_STYLES = {
  outdoors: 'mapbox://styles/mapbox/outdoors-v12',
  satellite: 'mapbox://styles/mapbox/satellite-streets-v12'
};

interface Props {
  data: KumanoData;
  onSegmentClick: (segment: SegmentData) => void;
  selectedSegment: number | null;
  activePhotoGroup: PhotoData[] | null;
  setActivePhotoGroup: (group: PhotoData[] | null) => void;
  mapCenterPoint: { lat: number, lon: number, t: number } | null;
  rangeSelection: TrackPoint[] | null;
}

const MapComponent: React.FC<Props> = ({ 
  data, 
  onSegmentClick, 
  selectedSegment,
  activePhotoGroup,
  setActivePhotoGroup,
  mapCenterPoint,
  rangeSelection
}) => {
  const mapRef = useRef<MapRef>(null);
  const [zoom, setZoom] = useState(13);
  const [currentPhotoIdx, setCurrentPhotoIdx] = useState(0);
  const [mapStyle, setMapStyle] = useState<keyof typeof MAP_STYLES>('outdoors');

  useEffect(() => {
    if (mapCenterPoint && mapRef.current) {
      mapRef.current.easeTo({
        center: [mapCenterPoint.lon, mapCenterPoint.lat],
        duration: 800
      });
    }
  }, [mapCenterPoint]);

  useEffect(() => {
    if (rangeSelection && rangeSelection.length > 1 && mapRef.current) {
      const lons = rangeSelection.map(p => p.lon);
      const lats = rangeSelection.map(p => p.lat);
      const minLon = Math.min(...lons);
      const maxLon = Math.max(...lons);
      const minLat = Math.min(...lats);
      const maxLat = Math.max(...lats);
      
      mapRef.current.fitBounds(
        [[minLon, minLat], [maxLon, maxLat]],
        { padding: 100, duration: 1000 }
      );
    }
  }, [rangeSelection]);

  useEffect(() => {
    if (activePhotoGroup) {
      setCurrentPhotoIdx(0);
      if (mapRef.current) {
        mapRef.current.easeTo({
          center: [activePhotoGroup[0].lon, activePhotoGroup[0].lat],
          duration: 800
        });
      }
    }
  }, [activePhotoGroup]);

  const trackGeoJSON: any = useMemo(() => ({
    type: 'Feature',
    geometry: {
      type: 'MultiLineString',
      coordinates: (data.trackSegments || []).map(seg => 
        (seg || []).map(p => [p.lon, p.lat, p.ele])
      )
    }
  }), [data.trackSegments]);

  const highlightGeoJSON: any = useMemo(() => {
    if (!rangeSelection || rangeSelection.length < 2) return null;
    return {
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates: rangeSelection.map(p => [p.lon, p.lat, p.ele])
      }
    };
  }, [rangeSelection]);

  const visibleGroups = (data.photoGroups || []).filter((_, i) => {
    if (zoom > 16) return true;
    if (zoom > 14) return i % 2 === 0;
    return i % 8 === 0;
  });

  const activePhoto = activePhotoGroup && activePhotoGroup[currentPhotoIdx] 
    ? activePhotoGroup[currentPhotoIdx] 
    : (activePhotoGroup ? activePhotoGroup[0] : null);

  return (
    <div className="relative w-full h-full bg-slate-100">
      <Map
        ref={mapRef}
        initialViewState={{
          latitude: data.trackSegments?.[0]?.[0]?.lat || 33.7125,
          longitude: data.trackSegments?.[0]?.[0]?.lon || 135.4536,
          zoom: 13,
          pitch: 45,
          bearing: 0
        }}
        onZoom={e => setZoom(e.viewState.zoom)}
        onClick={() => setActivePhotoGroup(null)}
        mapStyle={MAP_STYLES[mapStyle]}
        mapboxAccessToken={MAPBOX_TOKEN}
        terrain={{ source: 'mapbox-dem', exaggeration: 1.5 }}
      >
        <Source id="mapbox-dem" type="raster-dem" url="mapbox://mapbox.mapbox-terrain-dem-v1" tileSize={512} maxzoom={14} />
        
        <Source id="track-source" type="geojson" data={trackGeoJSON}>
          <Layer
            id="track-layer"
            type="line"
            paint={{
              'line-color': mapStyle === 'satellite' ? '#ffffff' : '#3b82f6',
              'line-width': 6,
              'line-opacity': rangeSelection ? 0.3 : 0.8
            }}
          />
        </Source>

        {highlightGeoJSON && (
          <Source id="highlight-source" type="geojson" data={highlightGeoJSON}>
            <Layer
              id="highlight-layer"
              type="line"
              layout={{ 'line-cap': 'round', 'line-join': 'round' }}
              paint={{
                'line-color': '#f43f5e',
                'line-width': 10,
                'line-opacity': 1,
                'line-blur': 0.5
              }}
            />
          </Source>
        )}

        <NavigationControl position="top-right" />

        {(data.landmarks || []).map((lm, i) => (
          <Marker key={`lm-${i}`} latitude={lm.lat} longitude={lm.lon} anchor="bottom">
            <div className="flex flex-col items-center group">
              <div className="bg-white px-3 py-1.5 rounded-lg shadow-2xl border border-slate-200 mb-1 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                <p className="text-xs font-black text-slate-800">{lm.name}</p>
              </div>
              <div className="p-2 bg-indigo-600 rounded-full border-2 border-white shadow-2xl scale-110">
                <MapPin size={20} className="text-white fill-white/20" />
              </div>
            </div>
          </Marker>
        ))}

        {(data.dayMarkers || []).map((dm, i) => (
          <React.Fragment key={`dm-${i}`}>
            <Marker latitude={dm.start.lat} longitude={dm.start.lon} anchor="bottom">
              <div className="flex flex-col items-center scale-125">
                <div className="bg-emerald-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full mb-1 shadow-lg border border-white uppercase tracking-tighter">DAY {dm.day} START</div>
                <Navigation size={18} className="text-emerald-600 fill-emerald-600" />
              </div>
            </Marker>
            <Marker latitude={dm.end.lat} longitude={dm.end.lon} anchor="bottom">
              <div className="flex flex-col items-center scale-125">
                <div className="bg-rose-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full mb-1 shadow-lg border border-white uppercase tracking-tighter">DAY {dm.day} END</div>
                <Flag size={18} className="text-rose-600 fill-rose-600" />
              </div>
            </Marker>
          </React.Fragment>
        ))}

        <div className="absolute bottom-4 right-4 z-10">
          <button onClick={e => { e.stopPropagation(); setMapStyle(prev => prev === 'outdoors' ? 'satellite' : 'outdoors'); }}
            className="flex items-center gap-2 px-4 py-2.5 bg-white/95 backdrop-blur shadow-2xl rounded-xl text-sm font-black text-slate-700 hover:bg-white transition-all border border-slate-200 active:scale-95">
            <Layers size={18} /> {mapStyle === 'outdoors' ? '衛星圖層' : '戶外地圖'}
          </button>
        </div>

        {data.segments?.map(seg => (
          <Marker
            key={`seg-${seg.segment_number}`}
            latitude={seg.mid_lat}
            longitude={seg.mid_lon}
            anchor="bottom"
            onClick={e => {
              e.originalEvent.stopPropagation();
              onSegmentClick(seg);
            }}
          >
            <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 border-white/80 shadow-lg cursor-pointer text-[10px] font-black text-white transition-all hover:scale-125 ${selectedSegment === seg.segment_number ? 'bg-blue-600 scale-110 ring-4 ring-blue-500/30' : 'bg-slate-400/80 backdrop-blur-[2px]'}`}>
              {seg.segment_number}
            </div>
          </Marker>
        ))}

        {visibleGroups.map((group, idx) => (
          <Marker key={`photo-group-${idx}`} latitude={group[0].lat} longitude={group[0].lon} anchor="center" onClick={e => { e.originalEvent.stopPropagation(); setActivePhotoGroup(group); }}>
            <div className={`p-1.5 bg-white rounded-full shadow-2xl cursor-pointer hover:bg-yellow-400 transition-all border border-slate-100 ${activePhotoGroup === group ? 'ring-4 ring-yellow-500/50 scale-150' : 'scale-110'}`}>
              <Camera size={zoom > 15 ? 18 : 12} className="text-slate-800" />
              {group.length > 1 && zoom > 14 && (
                <span className="absolute -top-2 -right-2 bg-rose-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-black shadow-lg border border-white">
                  {group.length}
                </span>
              )}
            </div>
          </Marker>
        ))}

        {activePhotoGroup && activePhoto && (
          <Popup anchor="bottom" longitude={activePhotoGroup[0].lon} latitude={activePhotoGroup[0].lat} onClose={() => setActivePhotoGroup(null)} closeButton={true} closeOnClick={false} maxWidth="570px" className="z-50 photo-popup">
            <div className="flex flex-col w-[550px]" onClick={e => e.stopPropagation()}>
              <div className="relative group overflow-hidden rounded-t-lg bg-slate-950 flex items-center justify-center w-[550px] h-[412px]">
                <a href={`/photos/${activePhoto.filename}`} target="_blank" rel="noopener noreferrer" className="w-full h-full flex items-center justify-center">
                  <img className="max-w-full max-h-full object-contain cursor-zoom-in" src={`/photos/${activePhoto.filename}`} alt={activePhoto.filename} />
                </a>
                {activePhotoGroup.length > 1 && (
                  <><button onClick={(e) => { e.stopPropagation(); setCurrentPhotoIdx(prev => (prev > 0 ? prev - 1 : activePhotoGroup.length - 1)); }} className="absolute left-3 top-1/2 -translate-y-1/2 p-3 bg-black/40 hover:bg-black/70 text-white rounded-full z-10 transition-colors"><ChevronLeft size={32} /></button>
                    <button onClick={(e) => { e.stopPropagation(); setCurrentPhotoIdx(prev => (prev < activePhotoGroup.length - 1 ? prev + 1 : 0)); }} className="absolute right-3 top-1/2 -translate-y-1/2 p-3 bg-black/40 hover:bg-black/70 text-white rounded-full z-10 transition-colors"><ChevronRight size={32} /></button></>
                )}
              </div>
              <div className="p-4 bg-white border-t border-slate-100 min-h-[80px]">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black text-blue-600 uppercase tracking-tighter mb-0.5">Day {activePhoto.day}</span>
                    <h3 className="font-bold text-slate-800 text-sm truncate max-w-[400px]">{activePhoto.filename}</h3>
                  </div>
                  {activePhoto.hr && <div className="flex items-center gap-1 text-rose-500 font-bold text-sm"><Heart size={14} fill="currentColor" /> {activePhoto.hr}</div>}
                </div>
                <div className="flex justify-between items-center text-xs text-slate-400">
                   <p className="font-medium">{activePhoto.date}</p>
                   <p>海拔 {Math.round(activePhoto.ele)}m {activePhotoGroup.length > 1 ? `| ${currentPhotoIdx + 1} / ${activePhotoGroup.length}` : ''}</p>
                </div>
              </div>
            </div>
          </Popup>
        )}
      </Map>
    </div>
  );
};

export default MapComponent;
