from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List
import uvicorn, os, time
from datetime import datetime
from dotenv import load_dotenv
from features import SessionFeatures
from model import load_model, predict, is_ready

load_dotenv()
app = FastAPI(title="HoneyShield AI Service", version="2.0.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

request_count = 0
start_time = time.time()

@app.on_event("startup")
async def startup():
    if not load_model(os.getenv("MODEL_PATH","./model.pkl")):
        print("Training model...")
        import subprocess; subprocess.run(["python","train.py"]); load_model()

@app.get("/health")
def health():
    return {"status":"ok","model_loaded":is_ready(),"uptime":round(time.time()-start_time,1),"requests":request_count,"timestamp":datetime.utcnow().isoformat()}

class PredictRequest(BaseModel):
    sessionId: str
    features: SessionFeatures

@app.post("/predict")
def predict_session(req: PredictRequest):
    global request_count
    request_count += 1
    if not is_ready(): raise HTTPException(status_code=503, detail="Model not loaded")
    t = time.time()
    result = predict(req.features)
    return {"sessionId":req.sessionId,"prediction":result,"latencyMs":round((time.time()-t)*1000,2),"timestamp":datetime.utcnow().isoformat()}

@app.post("/batch-predict")
def batch_predict(requests: List[PredictRequest]):
    return [predict_session(r) for r in requests]

@app.get("/model-info")
def model_info():
    return {"algorithm":"Random Forest","features":["risk_score","attack_count","honey_interactions","session_duration","requests_per_min","unique_attack_types","in_honey","failed_logins"],"classes":["NORMAL","SUSPICIOUS","ATTACKER"],"ready":is_ready()}

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=int(os.getenv("PORT",8000)), reload=False)
