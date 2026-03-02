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
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Responsive Popup Logic
  const isMobile = windowWidth < 768;
  const isFarView = zoom < 14;
  
  // Base size for desktop, screen-relative for mobile
  const popupWidth = isMobile ? Math.min(windowWidth - 40, 400) : (isFarView ? 350 : 550);
  const popupHeight = popupWidth * 0.75; // Maintain 4:3 ratio

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
      mapRef.current.fitBounds(
        [[Math.min(...lons), Math.min(...lats)], [Math.max(...lons), Math.max(...lats)]],
        { padding: isMobile ? 40 : 100, duration: 1000 }
      );
    }
  }, [rangeSelection, isMobile]);

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
          zoom: isMobile ? 11 : 13,
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
          <Layer id="track-layer" type="line" paint={{ 'line-color': mapStyle === 'satellite' ? '#ffffff' : '#3b82f6', 'line-width': isMobile ? 4 : 6, 'line-opacity': rangeSelection ? 0.2 : 0.8 }} />
        </Source>

        {highlightGeoJSON && (
          <Source id="highlight-source" type="geojson" data={highlightGeoJSON}>
            <Layer id="highlight-layer" type="line" layout={{ 'line-cap': 'round', 'line-join': 'round' }} paint={{ 'line-color': '#f43f5e', 'line-width': isMobile ? 6 : 10, 'line-opacity': 1, 'line-blur': 0.5 }} />
          </Source>
        )}

        <NavigationControl position="top-right" showCompass={false} />

        {(data.landmarks || []).map((lm, i) => (
          <Marker key={`lm-${i}`} latitude={lm.lat} longitude={lm.lon} anchor="bottom">
            <div className="flex flex-col items-center group">
              <div className="bg-white px-2 py-1 rounded shadow-lg border border-slate-200 mb-1 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                <p className="text-[10px] font-bold text-slate-800">{lm.name}</p>
              </div>
              <div className="p-1.5 bg-indigo-600 rounded-full border-2 border-white shadow-xl scale-90 md:scale-110"><MapPin size={isMobile ? 14 : 20} className="text-white fill-white/20" /></div>
            </div>
          </Marker>
        ))}

        {(data.dayMarkers || []).map((dm, i) => (
          <React.Fragment key={`dm-${i}`}>
            <Marker latitude={dm.start.lat} longitude={dm.start.lon} anchor="bottom">
              <div className="flex flex-col items-center scale-90 md:scale-125">
                <div className="bg-emerald-600 text-white text-[8px] font-black px-1.5 py-0.5 rounded-full mb-1 shadow-lg border border-white uppercase tracking-tighter">D{dm.day}</div>
                <Navigation size={14} className="text-emerald-600 fill-emerald-600" />
              </div>
            </Marker>
            <Marker latitude={dm.end.lat} longitude={dm.end.lon} anchor="bottom">
              <div className="flex flex-col items-center scale-90 md:scale-125">
                <div className="bg-rose-600 text-white text-[8px] font-black px-1.5 py-0.5 rounded-full mb-1 shadow-lg border border-white uppercase tracking-tighter">D{dm.day}</div>
                <Flag size={14} className="text-rose-600 fill-rose-600" />
              </div>
            </Marker>
          </React.Fragment>
        ))}

        <div className="absolute bottom-4 right-4 z-10">
          <button onClick={e => { e.stopPropagation(); setMapStyle(prev => prev === 'outdoors' ? 'satellite' : 'outdoors'); }}
            className="flex items-center gap-2 px-3 py-2 bg-white/95 backdrop-blur shadow-2xl rounded-xl text-xs font-black text-slate-700 border border-slate-200">
            <Layers size={16} /> {mapStyle === 'outdoors' ? '衛星' : '地圖'}
          </button>
        </div>

        {visibleGroups.map((group, idx) => (
          <Marker key={`photo-group-${idx}`} latitude={group[0].lat} longitude={group[0].lon} anchor="center" onClick={e => { e.originalEvent.stopPropagation(); setActivePhotoGroup(group); }}>
            <div className={`p-1 bg-white rounded-full shadow-2xl cursor-pointer hover:bg-yellow-400 transition-all border border-slate-100 ${activePhotoGroup === group ? 'ring-4 ring-yellow-500/50 scale-125' : 'scale-100'}`}>
              <Camera size={isMobile ? 12 : 18} className="text-slate-800" />
              {group.length > 1 && zoom > 14 && <span className="absolute -top-2 -right-2 bg-rose-500 text-white text-[8px] px-1 rounded-full font-black shadow-lg border border-white">{group.length}</span>}
            </div>
          </Marker>
        ))}

        {activePhotoGroup && activePhoto && (
          <Popup 
            anchor="bottom" 
            longitude={activePhotoGroup[0].lon} 
            latitude={activePhotoGroup[0].lat} 
            onClose={() => setActivePhotoGroup(null)} 
            closeButton={true} 
            closeOnClick={false} 
            maxWidth={`${popupWidth + 20}px`} 
            className="z-50 photo-popup"
          >
            <div className="flex flex-col" style={{ width: `${popupWidth}px` }} onClick={e => e.stopPropagation()}>
              <div className="relative group overflow-hidden rounded-t-lg bg-slate-950 flex items-center justify-center" style={{ width: `${popupWidth}px`, height: `${popupHeight}px` }}>
                <a href={`/photos/${activePhoto.filename}`} target="_blank" rel="noopener noreferrer" className="w-full h-full flex items-center justify-center">
                  <img className="max-w-full max-h-full object-contain cursor-zoom-in" src={`/photos/${activePhoto.filename}`} alt={activePhoto.filename} />
                </a>
                {activePhotoGroup.length > 1 && (
                  <><button onClick={(e) => { e.stopPropagation(); setCurrentPhotoIdx(prev => (prev > 0 ? prev - 1 : activePhotoGroup.length - 1)); }} className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-black/40 hover:bg-black/70 text-white rounded-full z-10 transition-colors"><ChevronLeft size={isMobile ? 24 : 32} /></button>
                    <button onClick={(e) => { e.stopPropagation(); setCurrentPhotoIdx(prev => (prev < activePhotoGroup.length - 1 ? prev + 1 : 0)); }} className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-black/40 hover:bg-black/70 text-white rounded-full z-10 transition-colors"><ChevronRight size={24} /></button></>
                )}
              </div>
              <div className="p-3 md:p-4 bg-white border-t border-slate-100 min-h-[60px]">
                <div className="flex justify-between items-start mb-1">
                  <div className="flex flex-col">
                    <span className="text-[8px] md:text-[10px] font-black text-blue-600 uppercase tracking-tighter">Day {activePhoto.day}</span>
                    <h3 className="font-bold text-slate-800 text-xs truncate" style={{ maxWidth: `${popupWidth - 100}px` }}>{activePhoto.filename}</h3>
                  </div>
                  {activePhoto.hr && <div className="flex items-center gap-1 text-rose-500 font-bold text-xs"><Heart size={12} fill="currentColor" /> {activePhoto.hr}</div>}
                </div>
                <div className="flex justify-between items-center text-[10px] text-slate-400">
                   <p className="font-medium">{activePhoto.date}</p>
                   {!isFarView && <p className="hidden md:block">海拔 {Math.round(activePhoto.ele)}m {activePhotoGroup.length > 1 ? `| ${currentPhotoIdx + 1} / ${activePhotoGroup.length}` : ''}</p>}
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
