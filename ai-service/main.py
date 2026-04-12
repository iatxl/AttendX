from fastapi import FastAPI, File, UploadFile, HTTPException, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List
import shutil
import os
import json
import utils

app = FastAPI(title="AttendX AI Service (Mocked)")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"message": "AttendX AI Service is Running (Mocked Mode)"}

@app.post("/encode-face")
async def encode_face(file: UploadFile = File(...)):
    return {"encoding": utils.get_face_encoding(None)}

@app.post("/verify-face")
async def verify_face(
    file: UploadFile = File(...),
    known_encoding: str = Form(...) 
):
    return utils.compare_faces(None, None)

@app.post("/liveness")
async def liveness_check(files: List[UploadFile] = File(...)):
    return {"is_live": True, "score": 0.95}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
