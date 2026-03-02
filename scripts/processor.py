import os
import gpxpy
import pandas as pd
from geopy.distance import geodesic
from datetime import datetime, timedelta
import exif
from PIL import Image, ImageOps
import json
from dateutil import parser

# Configuration
GPX_DIR = 'gpx'
PHOTO_DIR = 'photo'
OUTPUT_DIR = 'frontend/public'
DATA_OUTPUT = os.path.join(OUTPUT_DIR, 'data/kumano_data.json')
PHOTO_TIMEZONE_OFFSET = -9
GAP_THRESHOLD_SEC = 300 
PHOTO_MATCH_THRESHOLD_SEC = 600

FIXED_START_DATE = datetime(2026, 2, 17).date()

LANDMARKS = [
    {"name": "熊野本宮大社", "lat": 33.8403, "lon": 135.7731},
    {"name": "熊野速玉大社", "lat": 33.7319, "lon": 135.9839},
    {"name": "熊野那智大社", "lat": 33.6685, "lon": 135.8903}
]

def get_jst_date(dt_obj):
    jst_time = dt_obj + timedelta(hours=9)
    return jst_time.date()

def parse_gpx_to_segments(gpx_dir):
    segments = []
    gpx_files = sorted([f for f in os.listdir(gpx_dir) if f.endswith('.gpx')])
    cumulative_dist = 0.0
    for filename in gpx_files:
        path = os.path.join(gpx_dir, filename)
        with open(path, 'r') as gpx_file:
            gpx = gpxpy.parse(gpx_file)
            for track in gpx.tracks:
                for gpx_seg in track.segments:
                    current_seg = []
                    for point in gpx_seg.points:
                        hr = None
                        for extension in point.extensions:
                            for child in extension:
                                if 'hr' in child.tag: hr = int(child.text)
                        dist_increment = 0
                        if current_seg:
                            last_p = current_seg[-1]
                            dist_increment = geodesic((last_p['lat'], last_p['lon']), (point.latitude, point.longitude)).meters
                            if (point.time - last_p['time_obj']).total_seconds() > GAP_THRESHOLD_SEC:
                                segments.append(current_seg)
                                current_seg = []
                                dist_increment = 0 
                        cumulative_dist += dist_increment
                        day_num = (get_jst_date(point.time) - FIXED_START_DATE).days + 1
                        current_seg.append({
                            'time_obj': point.time,
                            'time': point.time.isoformat(),
                            'lat': point.latitude,
                            'lon': point.longitude,
                            'ele': point.elevation,
                            'hr': hr,
                            'cum_dist_m': cumulative_dist,
                            'day': day_num
                        })
                    if current_seg: segments.append(current_seg)
    return segments

def process_photos(photo_dir, flattened_gps):
    photo_data = []
    photo_files = sorted([f for f in os.listdir(photo_dir) if f.lower().endswith(('.jpg', '.jpeg'))])
    gps_df = pd.DataFrame(flattened_gps)
    gps_df['time_obj'] = pd.to_datetime(gps_df['time'])
    for filename in photo_files:
        path = os.path.join(photo_dir, filename)
        if not os.path.exists(path): continue
        try:
            with open(path, 'rb') as f:
                img = exif.Image(f)
            if img.has_exif and hasattr(img, 'datetime_original'):
                dt = datetime.strptime(img.datetime_original, '%Y:%m:%d %H:%M:%S')
                utc_time_from_photo = dt + timedelta(hours=PHOTO_TIMEZONE_OFFSET)
                if gps_df['time_obj'].iloc[0].tzinfo:
                    utc_time_from_photo = utc_time_from_photo.replace(tzinfo=gps_df['time_obj'].iloc[0].tzinfo)
                diffs = (gps_df['time_obj'] - utc_time_from_photo).abs()
                idx = diffs.idxmin()
                if diffs.loc[idx].total_seconds() > PHOTO_MATCH_THRESHOLD_SEC: continue
                nearest_pt = gps_df.loc[idx]
                day_num = (dt.date() - FIXED_START_DATE).days + 1
                photo_data.append({
                    'filename': filename,
                    'date': dt.strftime('%Y-%m-%d %H:%M:%S'),
                    'day': day_num,
                    'lat': float(nearest_pt['lat']),
                    'lon': float(nearest_pt['lon']),
                    'ele': float(nearest_pt['ele']),
                    'hr': int(nearest_pt['hr']) if pd.notnull(nearest_pt['hr']) else None,
                    'cum_dist_m': float(nearest_pt['cum_dist_m'])
                })
        except: pass
    photo_data.sort(key=lambda x: x['date'])
    grouped = []
    if not photo_data: return []
    curr = [photo_data[0]]
    for i in range(1, len(photo_data)):
        if (datetime.strptime(photo_data[i]['date'], '%Y-%m-%d %H:%M:%S') - 
            datetime.strptime(photo_data[i-1]['date'], '%Y-%m-%d %H:%M:%S')).total_seconds() <= 60:
            curr.append(photo_data[i])
        else:
            grouped.append(curr)
            curr = [photo_data[i]]
    grouped.append(curr)
    return grouped

def main():
    track_segments = parse_gpx_to_segments(GPX_DIR)
    flattened_gps = [p for seg in track_segments for p in seg]
    photo_groups = process_photos(PHOTO_DIR, flattened_gps)
    
    gps_df = pd.DataFrame(flattened_gps)
    km_segments = []
    total_km = int(gps_df['cum_dist_m'].iloc[-1] / 1000) + 1
    for km in range(total_km):
        seg_df = gps_df[(gps_df['cum_dist_m'] >= km*1000) & (gps_df['cum_dist_m'] < (km+1)*1000)]
        if seg_df.empty: continue
        
        # Proper Gain/Loss calculation
        ele_diff = seg_df['ele'].diff()
        gain = ele_diff[ele_diff > 0].sum()
        loss = abs(ele_diff[ele_diff < 0].sum())
        
        km_segments.append({
            'segment_number': km + 1,
            'pace': f"{int(((seg_df['time_obj'].iloc[-1]-seg_df['time_obj'].iloc[0]).total_seconds()/60)/((seg_df['cum_dist_m'].iloc[-1]-seg_df['cum_dist_m'].iloc[0])/1000.0))}′",
            'gain': round(gain, 1),
            'loss': round(loss, 1), # Added missing field
            'avg_hr': int(seg_df['hr'].mean()) if pd.notnull(seg_df['hr'].mean()) else None,
            'mid_lat': float(seg_df.iloc[len(seg_df)//2]['lat']),
            'mid_lon': float(seg_df.iloc[len(seg_df)//2]['lon'])
        })

    day_markers = []
    days = sorted(gps_df['day'].unique())
    for d in days:
        day_df = gps_df[gps_df['day'] == d]
        day_markers.append({
            "day": int(d),
            "date": (FIXED_START_DATE + timedelta(days=int(d)-1)).strftime('%m/%d'),
            "start": {"lat": float(day_df.iloc[0]['lat']), "lon": float(day_df.iloc[0]['lon'])},
            "end": {"lat": float(day_df.iloc[-1]['lat']), "lon": float(day_df.iloc[-1]['lon'])}
        })

    final_segments = [[{"lat": p['lat'], "lon": p['lon'], "ele": p['ele'], "hr": p['hr'], "cum_dist_m": p['cum_dist_m'], "day": p['day'], "time": p['time']} for i, p in enumerate(seg) if i % 10 == 0 or i == len(seg)-1] for seg in track_segments]

    result = {
        'trackSegments': final_segments,
        'photoGroups': photo_groups,
        'segments': km_segments,
        'landmarks': LANDMARKS,
        'dayMarkers': day_markers
    }
    with open(DATA_OUTPUT, 'w') as f: json.dump(result, f, indent=2)
    print(f"Data saved with all gain/loss metrics.")

if __name__ == "__main__": main()
