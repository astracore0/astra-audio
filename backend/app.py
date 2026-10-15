import os
import requests
from flask import Flask, jsonify, request
from flask_cors import CORS

app = Flask(__name__)
CORS(app, origins=os.getenv("ALLOWED_ORIGINS", "*").split(","))
JAMENDO_CLIENT_ID = os.getenv("JAMENDO_CLIENT_ID", "").strip()
BASE = "https://api.jamendo.com/v3.0"

def jamendo(path, params=None):
    if not JAMENDO_CLIENT_ID:
        return None, (jsonify({"error": "Set JAMENDO_CLIENT_ID on the backend host."}), 503)
    query = {"client_id": JAMENDO_CLIENT_ID, "format": "json", **(params or {})}
    try:
        r = requests.get(f"{BASE}/{path}", params=query, timeout=15)
        r.raise_for_status()
        data = r.json()
        if data.get("headers", {}).get("status") != "success":
            return None, (jsonify({"error": "Music catalogue request failed."}), 502)
        return data.get("results", []), None
    except requests.RequestException:
        return None, (jsonify({"error": "Music catalogue is temporarily unavailable."}), 502)

def map_track(t):
    return {
        "id": str(t.get("id", "")), "title": t.get("name") or "Untitled track",
        "artist": t.get("artist_name") or "Independent artist",
        "image": t.get("album_image") or "", "audio": t.get("audio") or "",
        "license": t.get("license_ccurl") or "", "url": t.get("shareurl") or "",
        "duration": t.get("duration") or 0
    }

@app.get("/api/health")
def health():
    return jsonify({"ok": True, "catalogue_configured": bool(JAMENDO_CLIENT_ID)})

@app.get("/api/tracks")
def tracks():
    limit = min(max(request.args.get("limit", default=24, type=int), 1), 50)
    results, err = jamendo("tracks", {"limit": limit, "order": "popularity_total", "include": "licenses"})
    if err: return err
    return jsonify({"results": [map_track(t) for t in results]})

@app.get("/api/search")
def search():
    q = request.args.get("q", "").strip()
    if not q: return jsonify({"results": []})
    results, err = jamendo("tracks", {"search": q, "limit": 30, "include": "licenses"})
    if err: return err
    return jsonify({"results": [map_track(t) for t in results]})

@app.get("/api/track/<track_id>")
def track(track_id):
    results, err = jamendo("tracks", {"id": track_id, "include": "licenses"})
    if err: return err
    if not results: return jsonify({"error": "Track not found"}), 404
    return jsonify(map_track(results[0]))

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.getenv("PORT", "5000")))
