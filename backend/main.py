"""
main.py — Full version with all 4 trained models
FastAPI backend for Road Accident Severity Prediction & Hospital Recommendation System.
Run: uvicorn main:app --reload --port 8000
"""

import os
import json
import io
import pickle
from typing import Optional

import bcrypt
import numpy as np
from PIL import Image
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from geopy.distance import geodesic

import torch
import torch.nn as nn
from torchvision import models, transforms
import timm

# ─────────────────────────────────────────────
# App
# ─────────────────────────────────────────────
app = FastAPI(title="Road Accident Severity & Hospital Recommendation System")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

BASE_DIR    = os.path.dirname(os.path.abspath(__file__))
USERS_FILE  = os.path.join(BASE_DIR, "users.json")
MODELS_DIR  = os.path.join(BASE_DIR, "models")

DEVICE      = torch.device("cpu")
CLASSES     = ["Minor", "Moderate", "Severe"]
NUM_CLASSES = 3

# ─────────────────────────────────────────────
# Auth
# ─────────────────────────────────────────────
def hash_pw(plain: str) -> str:
    return bcrypt.hashpw(plain.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

def verify_pw(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
    except Exception as e:
        print(f"[Auth] verify error: {e}")
        return False

def load_users() -> dict:
    if os.path.exists(USERS_FILE):
        try:
            with open(USERS_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
            for u, h in data.items():
                if not isinstance(h, str) or not h.startswith("$2"):
                    raise ValueError(f"Invalid hash for {u}")
            print(f"[Auth] Loaded {len(data)} user(s)")
            return data
        except Exception as e:
            print(f"[Auth] Bad users.json ({e}) — recreating")
            os.remove(USERS_FILE)
    data = {"admin": hash_pw("admin123"), "demo": hash_pw("demo123")}
    with open(USERS_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)
    print("[Auth] Created fresh users.json — admin/admin123, demo/demo123")
    return data

USERS = load_users()

# ─────────────────────────────────────────────
# Image preprocessing
# ─────────────────────────────────────────────
IMG_TRANSFORM = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.CenterCrop(224),
    transforms.ToTensor(),
    transforms.Normalize([0.485, 0.456, 0.406],
                         [0.229, 0.224, 0.225]),
])

def preprocess_image(image_bytes: bytes) -> torch.Tensor:
    img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    return IMG_TRANSFORM(img).unsqueeze(0).to(DEVICE)

# ─────────────────────────────────────────────
# Model builders
# ─────────────────────────────────────────────
def build_resnet18():
    model = models.resnet18(weights=None)
    model.fc = nn.Sequential(
        nn.Dropout(0.4),
        nn.Linear(model.fc.in_features, 256), nn.ReLU(),
        nn.Dropout(0.3),
        nn.Linear(256, NUM_CLASSES),
    )
    return model

def build_custom_cnn():
    class CustomCNN(nn.Module):
        def __init__(self):
            super().__init__()
            self.features = nn.Sequential(
                nn.Conv2d(3, 32, 3, padding=1), nn.BatchNorm2d(32), nn.ReLU(),
                nn.Conv2d(32, 32, 3, padding=1), nn.BatchNorm2d(32), nn.ReLU(),
                nn.MaxPool2d(2, 2), nn.Dropout2d(0.1),
                nn.Conv2d(32, 64, 3, padding=1), nn.BatchNorm2d(64), nn.ReLU(),
                nn.Conv2d(64, 64, 3, padding=1), nn.BatchNorm2d(64), nn.ReLU(),
                nn.MaxPool2d(2, 2), nn.Dropout2d(0.1),
                nn.Conv2d(64, 128, 3, padding=1), nn.BatchNorm2d(128), nn.ReLU(),
                nn.Conv2d(128, 128, 3, padding=1), nn.BatchNorm2d(128), nn.ReLU(),
                nn.MaxPool2d(2, 2), nn.Dropout2d(0.2),
                nn.Conv2d(128, 256, 3, padding=1), nn.BatchNorm2d(256), nn.ReLU(),
                nn.MaxPool2d(2, 2),
            )
            self.classifier = nn.Sequential(
                nn.AdaptiveAvgPool2d((4, 4)), nn.Flatten(),
                nn.Linear(256 * 4 * 4, 512), nn.ReLU(), nn.Dropout(0.4),
                nn.Linear(512, 128), nn.ReLU(), nn.Dropout(0.3),
                nn.Linear(128, NUM_CLASSES),
            )
        def forward(self, x):
            return self.classifier(self.features(x))
    return CustomCNN()

def build_vit():
    model = timm.create_model('vit_small_patch16_224', pretrained=False, num_classes=NUM_CLASSES)
    return model

# ─────────────────────────────────────────────
# Load all models
# ─────────────────────────────────────────────
def load_torch_model(builder_fn, weight_file: str, name: str):
    path = os.path.join(MODELS_DIR, weight_file)
    if not os.path.exists(path):
        print(f"[Model] {name}: weight file not found at {path}")
        return None
    try:
        model = builder_fn()
        state = torch.load(path, map_location=DEVICE)
        model.load_state_dict(state)
        model.eval()
        print(f"[Model] {name}: loaded OK from {weight_file}")
        return model
    except Exception as e:
        print(f"[Model] {name}: failed to load — {e}")
        return None

def load_rf_model():
    path = os.path.join(MODELS_DIR, "rf_severity.pkl")
    if not os.path.exists(path):
        print(f"[Model] Random Forest: not found at {path}")
        return None, None
    try:
        with open(path, "rb") as f:
            obj = pickle.load(f)
        # Handle both formats: plain model or dict with model+scaler
        if isinstance(obj, dict):
            rf     = obj.get("model")
            scaler = obj.get("scaler")
        else:
            rf     = obj
            scaler = None
        print("[Model] Random Forest: loaded OK")
        return rf, scaler
    except Exception as e:
        print(f"[Model] Random Forest: failed — {e}")
        return None, None

print("\n" + "="*50)
print("  Loading trained models...")
print("="*50)

resnet18_model = load_torch_model(build_resnet18,    "resnet18_severity.pth",  "ResNet-18")
cnn_model      = load_torch_model(build_custom_cnn,  "custom_cnn_severity.pth","Custom CNN")
vit_model      = load_torch_model(build_vit,         "vit_severity.pth",       "ViT-Small")
rf_model, rf_scaler = load_rf_model()

print("="*50 + "\n")

# ─────────────────────────────────────────────
# Prediction helpers
# ─────────────────────────────────────────────
def predict_with_model(model, tensor: torch.Tensor):
    """Run inference, return (class_index, probabilities_list)."""
    with torch.no_grad():
        logits = model(tensor)
        probs  = torch.softmax(logits, dim=1).squeeze().tolist()
        pred   = int(torch.argmax(logits, dim=1).item())
    return pred, probs

def rule_based_predict(speed, rain, vehicle_type, hour) -> int:
    """Fallback rule-based predictor when no model is loaded."""
    score = 0
    if speed > 100:       score += 3
    elif speed > 70:      score += 2
    elif speed > 40:      score += 1
    if rain == 1:         score += 1
    if vehicle_type == 2: score += 1
    if vehicle_type == 3: score += 1
    if 0 <= hour <= 5:    score += 1
    return 2 if score >= 4 else (1 if score >= 2 else 0)

def ensemble_predict(image_bytes: bytes, speed, rain, vehicle_type, hour, model_choice: str):
    """
    Run prediction using chosen model or ensemble.
    Returns (pred_class, confidence_list, model_used_str)
    """
    tensor = None
    try:
        tensor = preprocess_image(image_bytes)
    except Exception as e:
        print(f"[Predict] Image preprocess failed: {e}")

    predictions = []
    model_used  = []

    # ── ResNet-18 ──
    if model_choice in ("resnet", "ensemble") and resnet18_model and tensor is not None:
        try:
            pred, probs = predict_with_model(resnet18_model, tensor)
            predictions.append((pred, probs, "ResNet-18"))
            model_used.append("ResNet-18")
        except Exception as e:
            print(f"[Predict] ResNet-18 error: {e}")

    # ── Custom CNN ──
    if model_choice in ("cnn", "ensemble") and cnn_model and tensor is not None:
        try:
            pred, probs = predict_with_model(cnn_model, tensor)
            predictions.append((pred, probs, "CNN"))
            model_used.append("Custom CNN")
        except Exception as e:
            print(f"[Predict] CNN error: {e}")

    # ── ViT ──
    if model_choice in ("vit", "ensemble") and vit_model and tensor is not None:
        try:
            pred, probs = predict_with_model(vit_model, tensor)
            predictions.append((pred, probs, "ViT"))
            model_used.append("ViT")
        except Exception as e:
            print(f"[Predict] ViT error: {e}")

    # ── Random Forest ──
    if model_choice in ("rf", "ensemble") and rf_model:
        try:
            feat = np.array([[float(speed), int(rain), int(vehicle_type), int(hour), 1, 0]])
            if rf_scaler:
                feat = rf_scaler.transform(feat)
            pred = int(rf_model.predict(feat)[0])
            proba = rf_model.predict_proba(feat)[0].tolist()
            predictions.append((pred, proba, "RF"))
            model_used.append("Random Forest")
        except Exception as e:
            print(f"[Predict] RF error: {e}")

    # ── Ensemble: average probabilities ──
    if predictions:
        all_probs = np.array([p for _, p, _ in predictions])
        avg_probs = all_probs.mean(axis=0).tolist()
        final_pred = int(np.argmax(avg_probs))
        return final_pred, avg_probs, " + ".join(model_used)

    # ── Fallback: rule-based ──
    print("[Predict] All models failed — using rule-based fallback")
    pred = rule_based_predict(speed, rain, vehicle_type, hour)
    conf = [5.0, 5.0, 5.0]
    conf[pred] = 85.0
    return pred, conf, "rule-based"

# ─────────────────────────────────────────────
# Hospital scoring
# ─────────────────────────────────────────────
HOSPITALS = [
    {"id": 1,  "name": "City Trauma Center",            "lat": 17.4500, "lon": 78.4000, "specialty": "trauma",  "beds": 6,  "phone": "040-27654321"},
    {"id": 2,  "name": "General Hospital Secunderabad",  "lat": 17.4200, "lon": 78.3800, "specialty": "general", "beds": 12, "phone": "040-27112233"},
    {"id": 3,  "name": "Orthopedic Spine Clinic",        "lat": 17.4700, "lon": 78.4300, "specialty": "ortho",   "beds": 4,  "phone": "040-27998877"},
    {"id": 4,  "name": "NIMS Hyderabad",                 "lat": 17.4076, "lon": 78.4686, "specialty": "trauma",  "beds": 20, "phone": "040-23489000"},
    {"id": 5,  "name": "Apollo Hospitals Jubilee Hills",  "lat": 17.4239, "lon": 78.4102, "specialty": "general", "beds": 30, "phone": "040-23607777"},
    {"id": 6,  "name": "Care Hospital Banjara Hills",    "lat": 17.4156, "lon": 78.4375, "specialty": "neuro",   "beds": 10, "phone": "040-30418888"},
    {"id": 7,  "name": "Yashoda Hospital Secunderabad",  "lat": 17.4426, "lon": 78.4983, "specialty": "trauma",  "beds": 15, "phone": "040-45674567"},
    {"id": 8,  "name": "Kamineni Hospital LB Nagar",     "lat": 17.3616, "lon": 78.5520, "specialty": "general", "beds": 18, "phone": "040-39876543"},
    {"id": 9,  "name": "Medicover Hospital Madhapur",    "lat": 17.4488, "lon": 78.3885, "specialty": "general", "beds": 14, "phone": "040-68888000"},
    {"id": 10, "name": "Sunshine Hospital Begumpet",     "lat": 17.4425, "lon": 78.4656, "specialty": "ortho",   "beds": 8,  "phone": "040-44556677"},
]

SEVERITY_MAP   = {0: "Minor", 1: "Moderate", 2: "Severe"}
SEVERITY_COLOR = {0: "#22c55e", 1: "#f59e0b", 2: "#ef4444"}

def score_hospital(h, pred, lat, lon):
    dist       = geodesic((lat, lon), (h["lat"], h["lon"])).km
    dist_score = max(0, 50 - dist * 2)
    if pred == 2:
        spec = 10 if h["specialty"] == "trauma" else (5 if h["specialty"] == "neuro" else 2)
    elif pred == 1:
        spec = 8 if h["specialty"] in ("trauma", "general") else 4
    else:
        spec = 6 if h["specialty"] == "general" else 3
    return dist_score * 0.5 + spec * 0.3 + min(h["beds"], 20) * 0.2

# ─────────────────────────────────────────────
# Routes
# ─────────────────────────────────────────────
@app.get("/")
async def root():
    return {"message": "Road Accident Severity & Hospital Recommendation API is running."}

@app.get("/health")
async def health():
    return {
        "status":         "ok",
        "users":          list(USERS.keys()),
        "resnet18":       resnet18_model is not None,
        "custom_cnn":     cnn_model is not None,
        "vit":            vit_model is not None,
        "random_forest":  rf_model is not None,
    }

@app.post("/login")
async def login(username: str = Form(...), password: str = Form(...)):
    username = username.strip()
    password = password.strip()
    print(f"[Auth] Login: '{username}'")
    if username not in USERS:
        raise HTTPException(status_code=401, detail="Invalid username or password.")
    if not verify_pw(password, USERS[username]):
        raise HTTPException(status_code=401, detail="Invalid username or password.")
    print(f"[Auth] Success: '{username}'")
    return {"ok": True, "username": username}

@app.post("/register")
async def register(username: str = Form(...), password: str = Form(...)):
    username = username.strip()
    password = password.strip()
    if not username or not password:
        raise HTTPException(status_code=400, detail="Username and password cannot be empty.")
    if username in USERS:
        raise HTTPException(status_code=400, detail="Username already exists.")
    USERS[username] = hash_pw(password)
    with open(USERS_FILE, "w", encoding="utf-8") as f:
        json.dump(USERS, f, indent=2)
    return {"ok": True, "message": "Registered successfully."}

@app.post("/predict")
async def predict(
    file: UploadFile = File(...),
    speed: float = Form(...),
    rain: int = Form(...),
    vehicle_type: int = Form(...),
    hour: int = Form(...),
    lat: float = Form(...),
    lon: float = Form(...),
    model_choice: Optional[str] = Form("ensemble"),
):
    image_bytes = await file.read()

    pred, probs, model_used = ensemble_predict(
        image_bytes, speed, rain, vehicle_type, hour, model_choice
    )

    confidence = [round(p * 100, 1) if max(probs) <= 1.0 else round(p, 1) for p in probs]

    scored = sorted(
        [(score_hospital(h, pred, lat, lon), h) for h in HOSPITALS],
        key=lambda x: x[0], reverse=True
    )
    top_hospitals = [
        {
            "hospital":    h,
            "score":       round(float(s), 2),
            "distance_km": round(geodesic((lat, lon), (h["lat"], h["lon"])).km, 2),
        }
        for s, h in scored[:5]
    ]

    print(f"[Predict] Severity={SEVERITY_MAP[pred]} | Model={model_used} | Confidence={confidence}")

    return {
        "prediction":     int(pred),
        "severity":       SEVERITY_MAP[pred],
        "severity_color": SEVERITY_COLOR[pred],
        "confidence":     confidence,
        "top_hospitals":  top_hospitals,
        "model_used":     model_used,
        "inputs": {"speed": speed, "rain": bool(rain), "vehicle_type": vehicle_type, "hour": hour}
    }

@app.get("/hospitals")
async def list_hospitals():
    return {"hospitals": HOSPITALS, "count": len(HOSPITALS)}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
