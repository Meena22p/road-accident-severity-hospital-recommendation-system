"""
model_utils.py
Core deep learning and ML utilities for Road Accident Severity Prediction.
Contains ResNetPredictor, RFPredictor, DummyModel, and image preprocessing.
"""

import os
import io
import numpy as np
from PIL import Image
import torch
import torch.nn as nn
from torchvision import models, transforms
import pickle

# ─────────────────────────────────────────────
# Constants
# ─────────────────────────────────────────────
SEVERITY_CLASSES = ["Minor", "Moderate", "Severe"]
NUM_CLASSES = 3
BASE_DIR = os.path.dirname(__file__)
RESNET_MODEL_PATH = os.path.join(BASE_DIR, "models", "resnet18_severity.pth")
RF_MODEL_PATH = os.path.join(BASE_DIR, "models", "rf_severity.pkl")


# ─────────────────────────────────────────────
# Image Preprocessing
# ─────────────────────────────────────────────
def preproc_image_bytes(image_bytes: bytes, size: int = 224) -> torch.Tensor:
    """
    Preprocess raw image bytes into a normalized PyTorch tensor.
    Resize → CenterCrop → ToTensor → Normalize (ImageNet stats)
    Returns shape: (1, 3, size, size)
    """
    transform = transforms.Compose([
        transforms.Resize((size, size)),
        transforms.CenterCrop(size),
        transforms.ToTensor(),
        transforms.Normalize(
            mean=[0.485, 0.456, 0.406],
            std=[0.229, 0.224, 0.225]
        )
    ])
    img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    tensor = transform(img).unsqueeze(0)  # add batch dim
    return tensor


# ─────────────────────────────────────────────
# ResNet18 Severity Predictor
# ─────────────────────────────────────────────
class ResNetPredictor:
    """
    Loads a fine-tuned ResNet18 model for 3-class accident severity classification.
    Falls back to pretrained ImageNet weights with a new classifier head if no
    saved model file is found (useful for demo/testing).
    """

    def __init__(self, device: str = "cpu"):
        self.device = torch.device(device)
        self.model = self._build_model()
        self.model.eval()

    def _build_model(self) -> nn.Module:
        model = models.resnet18(weights=models.ResNet18_Weights.DEFAULT)
        # Replace final FC layer for 3-class output
        in_features = model.fc.in_features
        model.fc = nn.Sequential(
            nn.Dropout(0.3),
            nn.Linear(in_features, 128),
            nn.ReLU(),
            nn.Linear(128, NUM_CLASSES)
        )
        model = model.to(self.device)

        # Load saved weights if available
        if os.path.exists(RESNET_MODEL_PATH):
            try:
                state = torch.load(RESNET_MODEL_PATH, map_location=self.device)
                model.load_state_dict(state)
                print(f"[ResNetPredictor] Loaded weights from {RESNET_MODEL_PATH}")
            except Exception as e:
                print(f"[ResNetPredictor] Could not load weights: {e}. Using pretrained ImageNet.")
        else:
            print("[ResNetPredictor] No saved model found. Using pretrained ImageNet weights.")
        return model

    def predict(self, tensor: torch.Tensor) -> int:
        """
        Returns predicted class index: 0=Minor, 1=Moderate, 2=Severe
        """
        tensor = tensor.to(self.device)
        with torch.no_grad():
            logits = self.model(tensor)
            pred = torch.argmax(logits, dim=1).item()
        return int(pred)

    def predict_proba(self, tensor: torch.Tensor) -> list:
        """
        Returns softmax probabilities for all 3 classes.
        """
        tensor = tensor.to(self.device)
        with torch.no_grad():
            logits = self.model(tensor)
            probs = torch.softmax(logits, dim=1).squeeze().tolist()
        return probs


# ─────────────────────────────────────────────
# Random Forest Predictor (structured data)
# ─────────────────────────────────────────────
class RFPredictor:
    """
    Random Forest classifier using structured accident features:
    [speed (float), rain (0/1), vehicle_type (int), hour (0-23)]
    Loads from pickle if available, otherwise trains a simple demo model.
    """

    def __init__(self):
        self.model = self._load_or_build()

    def _load_or_build(self):
        if os.path.exists(RF_MODEL_PATH):
            try:
                with open(RF_MODEL_PATH, "rb") as f:
                    clf = pickle.load(f)
                print(f"[RFPredictor] Loaded model from {RF_MODEL_PATH}")
                return clf
            except Exception as e:
                print(f"[RFPredictor] Could not load: {e}. Building demo model.")

        # Build and train a small demo RF on synthetic data
        from sklearn.ensemble import RandomForestClassifier
        rng = np.random.default_rng(42)
        n = 500
        speed        = rng.uniform(0, 120, n)
        rain         = rng.integers(0, 2, n)
        vehicle_type = rng.integers(0, 5, n)
        hour         = rng.integers(0, 24, n)
        X = np.column_stack([speed, rain, vehicle_type, hour])
        # Simple heuristic labels for demo
        y = np.where(speed > 90, 2, np.where(speed > 50, 1, 0)).astype(int)
        clf = RandomForestClassifier(n_estimators=100, random_state=42)
        clf.fit(X, y)
        os.makedirs(os.path.dirname(RF_MODEL_PATH), exist_ok=True)
        with open(RF_MODEL_PATH, "wb") as f:
            pickle.dump(clf, f)
        print("[RFPredictor] Demo model built and saved.")
        return clf

    def predict(self, features: list) -> int:
        """
        features: [speed, rain, vehicle_type, hour]
        Returns: 0=Minor, 1=Moderate, 2=Severe
        """
        X = np.array(features, dtype=float).reshape(1, -1)
        return int(self.model.predict(X)[0])


# ─────────────────────────────────────────────
# Dummy Model (fallback)
# ─────────────────────────────────────────────
class DummyModel:
    """
    Fallback model that returns a random prediction.
    Used when neither ResNet nor RF can be initialized.
    """

    def predict(self, *args, **kwargs) -> int:
        return int(np.random.randint(0, 3))

    def predict_proba(self, *args, **kwargs) -> list:
        raw = np.random.dirichlet([1, 1, 1]).tolist()
        return raw
