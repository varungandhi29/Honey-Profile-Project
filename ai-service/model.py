import joblib, numpy as np
from pathlib import Path
from features import SessionFeatures, LABELS
pipeline = None
model_loaded = False
def load_model(path='./model.pkl'):
    global pipeline, model_loaded
    if not Path(path).exists():
        print(f"Model not found at {path}")
        return False
    pipeline = joblib.load(path)
    model_loaded = True
    print(f"Model loaded from {path}")
    return True
def predict(features: SessionFeatures) -> dict:
    if not model_loaded or pipeline is None:
        return {"label":"UNKNOWN","confidence":0.0,"scores":{"NORMAL":0,"SUSPICIOUS":0,"ATTACKER":0},"error":"Model not loaded"}
    X = np.array([features.to_array()])
    pred = int(pipeline.predict(X)[0])
    probs = pipeline.predict_proba(X)[0]
    return {
        "label": LABELS[pred],
        "predictedClass": pred,
        "confidence": round(float(probs[pred])*100,2),
        "scores": {"NORMAL":round(float(probs[0])*100,2),"SUSPICIOUS":round(float(probs[1])*100,2),"ATTACKER":round(float(probs[2])*100,2)}
    }
def is_ready(): return model_loaded
