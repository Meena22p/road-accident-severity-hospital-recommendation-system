# Road Accident Severity & Hospital Recommendation System
### B.Tech IT Major Project — CMR College of Engineering & Technology

A deep learning-based system that predicts road accident severity from images and recommends the nearest suitable hospitals using geospatial analysis.

---

## 🏗 Project Structure

```
accident_project/
├── backend/
│   ├── main.py              ← FastAPI server (all API endpoints)
│   ├── model_utils.py       ← ResNet18, RandomForest, DummyModel, preprocessing
│   ├── requirements.txt     ← Python dependencies
│   └── models/              ← Saved model files (created after training)
│       ├── resnet18_severity.pth
│       └── rf_severity.pkl
│
├── model_training/
│   └── train_model.py       ← Full training script with augmentation
│
└── frontend/
    ├── index.html
    ├── vite.config.js
    ├── tailwind.config.js
    ├── package.json
    └── src/
        ├── main.jsx
        ├── App.jsx
        ├── index.css
        ├── pages/
        │   ├── LoginPage.jsx    ← Auth page
        │   ├── PredictPage.jsx  ← Image upload + prediction + results
        │   └── HospitalsPage.jsx← All hospitals with map
        └── components/
            ├── Layout.jsx       ← Navbar + routing wrapper
            └── ResultMap.jsx    ← React-Leaflet map component
```

---

## ⚙️ Technology Stack

| Layer | Technology |
|-------|-----------|
| Deep Learning | PyTorch, ResNet-18, CNN |
| ML (structured) | Scikit-learn Random Forest |
| OCR | EasyOCR |
| Backend | FastAPI + Uvicorn |
| Geospatial | Geopy (Haversine formula) |
| Frontend | React + Vite + Tailwind CSS |
| Map | React-Leaflet + OpenStreetMap |
| Auth | Passlib + bcrypt |

---

## 🚀 Setup & Run

### Step 1 — Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate        # Linux/Mac
venv\Scripts\activate           # Windows

# Install dependencies
pip install -r requirements.txt

# Create models directory
mkdir models

# Start the server
uvicorn main:app --reload --port 8000
```

Backend runs at: **http://localhost:8000**
API docs at:     **http://localhost:8000/docs**

---

### Step 2 — Frontend Setup

```bash
cd frontend

# Install Node dependencies
npm install

# Start dev server
npm run dev
```

Frontend runs at: **http://localhost:5173**

---

### Step 3 — Train Your Own Model (Optional)

Prepare your dataset in this structure:
```
dataset/
  train/
    Minor/      ← accident images
    Moderate/   ← accident images
    Severe/     ← accident images
  val/
    Minor/
    Moderate/
    Severe/
```

**Recommended free datasets:**
- Kaggle: "Road Accident Image Dataset"
- Kaggle: "Car Crash Dataset"
- Search: "accident severity classification dataset"

Run training:
```bash
cd model_training
python train_model.py --data_dir ../dataset --epochs 20 --batch_size 16

# Copy trained model to backend
cp models/resnet18_severity.pth ../backend/models/
```

If you skip training, the system uses pretrained ImageNet weights (still functional for demo).

---

## 🔑 Default Login

| Username | Password |
|----------|----------|
| admin    | admin123 |
| demo     | demo123  |

---

## 📡 API Endpoints

| Method | Endpoint    | Description |
|--------|-------------|-------------|
| POST   | /login      | User authentication |
| POST   | /register   | Register new user |
| POST   | /predict    | Predict severity + recommend hospitals |
| POST   | /ocr        | Extract text from accident image |
| GET    | /hospitals  | List all hospitals |
| GET    | /health     | Check model + server status |
| GET    | /docs       | Swagger API documentation |

### /predict Request (multipart/form-data)

| Field         | Type   | Description |
|---------------|--------|-------------|
| file          | image  | Accident scene image |
| speed         | float  | Vehicle speed (km/h) |
| rain          | int    | 0=clear, 1=raining |
| vehicle_type  | int    | 0=Motorcycle, 1=Car, 2=Truck, 3=Bus, 4=Other |
| hour          | int    | Hour of day (0-23) |
| lat           | float  | GPS latitude |
| lon           | float  | GPS longitude |
| model_choice  | string | resnet / rf / ensemble |

### /predict Response

```json
{
  "prediction": 2,
  "severity": "Severe",
  "severity_color": "#ef4444",
  "confidence": [5.2, 18.3, 76.5],
  "top_hospitals": [
    {
      "hospital": { "name": "City Trauma Center", "lat": 17.45, "lon": 78.40, ... },
      "score": 42.3,
      "distance_km": 1.8
    }
  ],
  "model_used": "resnet"
}
```

---

## 🏥 Hospital Scoring Algorithm

Each hospital is scored using a weighted formula:

```
score = (distance_score × 0.5) + (specialty_score × 0.3) + (bed_score × 0.2)

distance_score  = max(0, 50 - distance_km × 2)
specialty_score = 10 if Severe+Trauma / 8 if Moderate+General / 6 if Minor+General
bed_score       = min(beds, 20)
```

For **Severe** accidents, trauma-specialized hospitals get priority.
For **Minor** accidents, the nearest general hospital is preferred.

---

## 📊 Performance Metrics (from project report)

| Metric | Result |
|--------|--------|
| Severity Prediction Accuracy | 91% |
| Hospital Recommendation Accuracy | 88% |
| Response Time | 0.9 sec avg |
| Model Stability | 94% |
| Real-time Processing Reliability | 88% |

---

## 🛠 Troubleshooting

**Backend won't start:**
- Check Python version: `python --version` (need 3.9+)
- Install missing packages: `pip install -r requirements.txt`

**Frontend can't connect to backend:**
- Ensure backend is running on port 8000
- Check `.env` file: `VITE_API_URL=http://localhost:8000`
- CORS is enabled for all origins in development

**Map not loading:**
- Requires internet connection (OpenStreetMap tiles)
- Check browser console for Leaflet errors

**Model loading warning:**
- "No saved model found" is normal if you haven't trained yet
- The system falls back to pretrained ImageNet weights (demo mode)

---

