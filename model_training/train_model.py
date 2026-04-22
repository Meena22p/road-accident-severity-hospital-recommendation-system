"""
train_model.py
Training script for Road Accident Severity Classification using ResNet18.

Dataset structure expected:
  dataset/
    train/
      Minor/       ← accident images labeled Minor
      Moderate/    ← accident images labeled Moderate
      Severe/      ← accident images labeled Severe
    val/
      Minor/
      Moderate/
      Severe/

Usage:
  python train_model.py --data_dir dataset --epochs 20 --batch_size 32
"""

import os
import argparse
import time
import copy

import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader
from torchvision import datasets, models, transforms
from sklearn.metrics import classification_report, confusion_matrix
import numpy as np

# ─────────────────────────────────────────────
# Config
# ─────────────────────────────────────────────
CLASSES = ["Minor", "Moderate", "Severe"]
NUM_CLASSES = 3
MODEL_SAVE_PATH = "models/resnet18_severity.pth"


def get_transforms():
    train_tf = transforms.Compose([
        transforms.Resize((256, 256)),
        transforms.RandomCrop(224),
        transforms.RandomHorizontalFlip(),
        transforms.RandomRotation(15),
        transforms.ColorJitter(brightness=0.3, contrast=0.3, saturation=0.2),
        transforms.ToTensor(),
        transforms.Normalize([0.485, 0.456, 0.406],
                             [0.229, 0.224, 0.225]),
    ])
    val_tf = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.CenterCrop(224),
        transforms.ToTensor(),
        transforms.Normalize([0.485, 0.456, 0.406],
                             [0.229, 0.224, 0.225]),
    ])
    return train_tf, val_tf


def build_model(device):
    model = models.resnet18(weights=models.ResNet18_Weights.DEFAULT)
    # Freeze early layers, train last 2 blocks + FC
    for name, param in model.named_parameters():
        if "layer3" not in name and "layer4" not in name and "fc" not in name:
            param.requires_grad = False

    in_features = model.fc.in_features
    model.fc = nn.Sequential(
        nn.Dropout(0.3),
        nn.Linear(in_features, 256),
        nn.ReLU(),
        nn.Dropout(0.2),
        nn.Linear(256, NUM_CLASSES),
    )
    return model.to(device)


def train(args):
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"Using device: {device}")

    train_tf, val_tf = get_transforms()

    train_dir = os.path.join(args.data_dir, "train")
    val_dir   = os.path.join(args.data_dir, "val")

    train_ds = datasets.ImageFolder(train_dir, transform=train_tf)
    val_ds   = datasets.ImageFolder(val_dir,   transform=val_tf)

    train_loader = DataLoader(train_ds, batch_size=args.batch_size, shuffle=True,  num_workers=2, pin_memory=True)
    val_loader   = DataLoader(val_ds,   batch_size=args.batch_size, shuffle=False, num_workers=2, pin_memory=True)

    print(f"Train samples: {len(train_ds)}  Val samples: {len(val_ds)}")
    print(f"Classes: {train_ds.classes}")

    model = build_model(device)

    # Class-weighted loss to handle imbalance
    class_counts = np.array([len(os.listdir(os.path.join(train_dir, c))) for c in train_ds.classes])
    weights = torch.tensor(1.0 / class_counts, dtype=torch.float).to(device)
    criterion = nn.CrossEntropyLoss(weight=weights)

    optimizer = optim.AdamW(filter(lambda p: p.requires_grad, model.parameters()),
                            lr=args.lr, weight_decay=1e-4)
    scheduler = optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=args.epochs)

    best_acc = 0.0
    best_weights = None
    os.makedirs(os.path.dirname(MODEL_SAVE_PATH), exist_ok=True)

    for epoch in range(args.epochs):
        t0 = time.time()
        # ── Train ──
        model.train()
        running_loss, running_correct = 0.0, 0
        for imgs, labels in train_loader:
            imgs, labels = imgs.to(device), labels.to(device)
            optimizer.zero_grad()
            outputs = model(imgs)
            loss = criterion(outputs, labels)
            loss.backward()
            optimizer.step()
            running_loss    += loss.item() * imgs.size(0)
            running_correct += (outputs.argmax(1) == labels).sum().item()

        train_loss = running_loss / len(train_ds)
        train_acc  = running_correct / len(train_ds)

        # ── Validate ──
        model.eval()
        val_loss, val_correct = 0.0, 0
        all_preds, all_labels = [], []
        with torch.no_grad():
            for imgs, labels in val_loader:
                imgs, labels = imgs.to(device), labels.to(device)
                outputs = model(imgs)
                loss = criterion(outputs, labels)
                val_loss    += loss.item() * imgs.size(0)
                val_correct += (outputs.argmax(1) == labels).sum().item()
                all_preds.extend(outputs.argmax(1).cpu().numpy())
                all_labels.extend(labels.cpu().numpy())

        val_loss /= len(val_ds)
        val_acc   = val_correct / len(val_ds)
        scheduler.step()

        elapsed = time.time() - t0
        print(f"Epoch {epoch+1:02d}/{args.epochs} | "
              f"Train Loss: {train_loss:.4f} Acc: {train_acc:.4f} | "
              f"Val Loss: {val_loss:.4f} Acc: {val_acc:.4f} | "
              f"Time: {elapsed:.1f}s")

        if val_acc > best_acc:
            best_acc = val_acc
            best_weights = copy.deepcopy(model.state_dict())
            torch.save(best_weights, MODEL_SAVE_PATH)
            print(f"  ✓ Best model saved (acc={best_acc:.4f})")

    # Final report
    model.load_state_dict(best_weights)
    model.eval()
    all_preds, all_labels = [], []
    with torch.no_grad():
        for imgs, labels in val_loader:
            imgs = imgs.to(device)
            preds = model(imgs).argmax(1).cpu().numpy()
            all_preds.extend(preds)
            all_labels.extend(labels.numpy())

    print("\n── Classification Report ──")
    print(classification_report(all_labels, all_preds, target_names=train_ds.classes))
    print("── Confusion Matrix ──")
    print(confusion_matrix(all_labels, all_preds))
    print(f"\nBest Validation Accuracy: {best_acc:.4f}")
    print(f"Model saved to: {MODEL_SAVE_PATH}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--data_dir",   default="dataset",  help="Path to dataset folder")
    parser.add_argument("--epochs",     type=int, default=20)
    parser.add_argument("--batch_size", type=int, default=32)
    parser.add_argument("--lr",         type=float, default=1e-3)
    args = parser.parse_args()
    train(args)
