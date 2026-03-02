export interface TrackPoint {
  lat: number;
  lon: number;
  ele: number;
  hr: number | null;
  cum_dist_m: number;
  day: number;
  time: string;
}

export interface PhotoData {
  filename: string;
  date: string;
  day: number;
  utc_time: string;
  lat: number;
  lon: number;
  ele: number;
  hr: number | null;
  cum_dist_m: number;
}

export interface SegmentData {
  segment_number: number;
  pace: string;
  gain: number;
  loss: number;
  avg_hr: number | null;
  mid_lat: number;
  mid_lon: number;
}

export interface Landmark {
  name: string;
  lat: number;
  lon: number;
}

export interface DayMarker {
  day: number;
  start: { lat: number; lon: number };
  end: { lat: number; lon: number };
}

export interface KumanoData {
  trackSegments: TrackPoint[][];
  photoGroups: PhotoData[][];
  segments: SegmentData[];
  landmarks: Landmark[];
  dayMarkers: DayMarker[];
}
