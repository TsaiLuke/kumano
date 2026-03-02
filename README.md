# Kumano Earth 熊野古道 3D 故事地圖

一個專為**熊野古道（中邊路）**健行設計的互動式 3D 軌跡展示網站。整合了 Garmin 運動軌跡與 Fujifilm 相機照片，透過自動化腳本實現空間與時間的完美對齊。

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![React](https://img.shields.io/badge/React-19-61dafb.svg)
![Mapbox](https://img.shields.io/badge/Mapbox-GL_JS_v3-000000.svg)

## 🌟 核心功能

- **3D 地形視覺化**: 使用 Mapbox GL JS v3 引擎，完美呈現熊野古道的起伏地形。
- **自動化照片對齊**: Python 腳本自動讀取照片 EXIF 時間，並與 GPS 軌跡進行 10 分鐘內的嚴格精確匹配。
- **區間數據分析**: 
  - 在剖面圖上**按住滑鼠拖曳**即可選取路段。
  - 即時計算該區間的距離、爬升/下降、耗時、配速與平均心率。
  - 地圖同步高亮顯示選取範圍並自動縮放。
- **故事地標與每日進度**:
  - 自動標註 **Day 1 ~ Day 5** 的每日起終點。
  - 內建熊野三山（本宮、速玉、那智大社）重要地標。
- **專業相片瀏覽**: 
  - 支援相片分組（1 分鐘內連拍自動整合）。
  - 超大尺寸彈窗，支援新分頁開啟原圖與左右切換。
- **圖層切換**: 提供「戶外地圖」與「衛星影像」兩種模式。

## 🛠 技術棧

- **前端**: React 19, TypeScript, Vite, Tailwind CSS v4, Framer Motion
- **地圖**: Mapbox GL JS v3, React Map GL
- **數據分析**: Recharts
- **後端處理**: Python 3 (gpxpy, exif, pandas, Pillow)

## 🚀 快速開始

### 1. 準備工作
您需要擁有 [Mapbox](https://account.mapbox.com/) 的 Access Token。

### 2. 資料處理 (Python)
將您的 `.gpx` 檔案放入 `gpx/` 目錄，原始照片放入 `photo/` 目錄。
```bash
# 安裝依賴
pip install gpxpy pandas geopy exif Pillow python-dateutil

# 執行處理腳本
python3 scripts/processor.py
```
*腳本會自動過濾非路程中拍攝的照片，並在 `frontend/public/photos/` 生成 Web 優化的縮圖。*

### 3. 前端啟動 (React)
```bash
cd frontend

# 設定環境變數
echo "VITE_MAPBOX_TOKEN=您的TOKEN" > .env

# 安裝並啟動
npm install
npm run dev
```

## 📜 授權
本專案採用 MIT 授權條款。

---
*由 Gemini CLI 輔助開發，致力於打造最極致的戶外紀錄體驗。*
