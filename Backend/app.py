from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Import the routers (not the apps)
from main import router as main_router
from auth import router as auth_router

app = FastAPI(title="Gursha API", version="1.0")

origins = [
     "http://127.0.0.1:5500", 
        "http://localhost:5500",
        "http://localhost:8000",
        "http://localhost:8001",
        "http://localhost:8002",
        "http://205.169.39.21",  
        "http://205.169.39.21:8000",  
        "http://0.0.0.0",  
        "http://0.0.0.0:8000" 
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers properly
app.include_router(auth_router, prefix="/auth", tags=["Authentication"])
app.include_router(main_router, tags=["Main"])

@app.get("/")
def read_root():
    return {"message": "Welcome to Gursha API"}

# Add this to your current app.py
@app.get("/debug/test")
def debug_test():
    return {
        "message": "Main app works",
        "mounted_paths": [
            {"path": "/auth", "app": "auth_app"},
            {"path": "/", "app": "main_app"}
        ]
    }