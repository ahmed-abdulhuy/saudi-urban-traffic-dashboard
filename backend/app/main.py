from contextlib import asynccontextmanager
from pathlib import Path
import json

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

cities_file_path = Path(__file__).parent / "data" / "cities.json"
cities_data = {}

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Load cities data from the JSON file during application startup
    global cities_data
    if cities_file_path.exists():
        with open(cities_file_path, "r") as f:
            cities_data = json.load(f)
    else:
        cities_data = {}

    yield  # This allows the application to run

app = FastAPI(title="Minimal FastAPI Backend", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins='*',
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root():
    return {"message": "Hello, World!"}


@app.get("/health")
def health():
    return {"status": "ok"}

@app.get("/city/{city_name}")
def get_city(city_name: str):
    city_info = cities_data.get(city_name)
    if city_info:
        return city_info
    else:
        return {"error": "City not found"}, 404

@app.get("/city/{city_name}/congestion_graph")
def get_congestion_graph(city_name: str):
    city_info = cities_data.get(city_name)
    if city_info:
        congestion_graph_file = Path(__file__).parent / "data" / f"congestion_hexagon_{city_info.get('name')}.geojson"
        print(f"Looking for congestion graph file at: {congestion_graph_file}")

        if congestion_graph_file.exists():
            with open(congestion_graph_file, "r") as f:
                congestion_graph_data = json.load(f)
            return congestion_graph_data
        else:
            return {"error": "Congestion graph file not found"}, 404
    else:
        return {"error": "City not found"}, 404