# -*- coding: utf-8 -*-
"""HTTP bridge for the original Piyasa_Terminali_v23_4.py BIST engine.

Install: python -m pip install fastapi uvicorn borsapy pandas
Set PT_API_TOKEN and PT_ENGINE_FILE. Run behind HTTPS reverse proxy.
"""
import ast
import os
import math
import threading
import time
from datetime import datetime
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed
from secrets import compare_digest
from typing import Optional

from fastapi import FastAPI, Header, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
import borsapy as bp

ENGINE_FILE = Path(os.getenv("PT_ENGINE_FILE", "Piyasa_Terminali_v23_4.py")).resolve()
TOKEN = os.getenv("PT_API_TOKEN", "")
ALLOWED_ORIGINS = [x.strip() for x in os.getenv("PT_CORS_ORIGINS", "https://localhost,capacitor://localhost,http://localhost").split(",") if x.strip()]
if not TOKEN:
    raise RuntimeError("PT_API_TOKEN must be set; refusing to expose an unprotected scan API")
if not ENGINE_FILE.is_file():
    raise RuntimeError(f"Python engine not found: {ENGINE_FILE}")

# Load only BIST definitions; do not import the Tkinter desktop application or launch UI.
source = ENGINE_FILE.read_text(encoding="utf-8-sig")
tree = ast.parse(source, filename=str(ENGINE_FILE))
required_funcs = {
    "bist_ema", "bist_rsi", "bist_stoch_rsi", "bist_vol_ratio",
    "bist_analyze_tf", "_bist_history", "fetch_bist_data",
    "bist_max_score", "analyze_bist_stock",
}
required_vars = {
    "CAPITAL_TL", "BIST_RISK_PERCENT", "BIST_MIN_PCT",
    "BIST_CONFIRMED_PCT", "BIST_WORKERS", "BIST_HISSELERI",
    "YILDIZ_PAZAR", "ANA_PAZAR", "ALT_PAZAR",
    "BIST_TF_CFG", "BIST_WEIGHTS",
}
selected = []
for node in tree.body:
    if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)) and node.name in required_funcs:
        selected.append(node)
    elif isinstance(node, ast.Assign) and any(isinstance(t, ast.Name) and t.id in required_vars for t in node.targets):
        selected.append(node)
# Original module updates BIST_HISSELERI by unioning market lists.

namespace = {
    "bp": bp, "datetime": datetime, "time": time, "threading": threading,
    "_bist_cache": {}, "_bist_cache_lock": threading.Lock(),
    "FILTERS_OFF": {"BIST": False, "BINANCE": False},
}
exec(compile(ast.fix_missing_locations(ast.Module(body=selected, type_ignores=[])), str(ENGINE_FILE), "exec"), namespace)
missing = required_funcs.difference(namespace)
if missing:
    raise RuntimeError("Missing original engine functions: " + ", ".join(sorted(missing)))

app = FastAPI(title="Piyasa Terminali BIST API", version="1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=False,
    allow_methods=["GET", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)
lock = threading.Lock()
scan_cache = {}

def authorize(header):
    if not header or not compare_digest(header, "Bearer " + TOKEN):
        raise HTTPException(status_code=401, detail="Unauthorized")

@app.get("/api/health")
def health(authorization: Optional[str] = Header(default=None)):
    authorize(authorization)
    return {"ok": True, "engine": "v23.4", "universe": len(namespace["BIST_HISSELERI"]), "data_provider": "borsapy"}

@app.get("/api/bist/scan")
def scan(symbol: Optional[str] = Query(default=None, max_length=8),
         authorization: Optional[str] = Header(default=None)):
    authorize(authorization)
    universe = namespace["BIST_HISSELERI"]
    if symbol:
        symbol = symbol.upper().strip()
        if symbol not in universe:
            raise HTTPException(status_code=404, detail="Symbol not in original BIST universe")
        symbols = [symbol]
    else:
        symbols = universe
    # Original engine timeframes; do not substitute experimental JS scoring.
    tfs = ["1W", "1D", "1H"]
    start = time.monotonic()
    results = []
    errors = 0
    filtered = 0
    first_error = None
    with ThreadPoolExecutor(max_workers=max(1, min(namespace.get("BIST_WORKERS", 6), 6))) as pool:
        futures = {pool.submit(namespace["analyze_bist_stock"], sym, tfs): sym for sym in symbols}
        for future in as_completed(futures):
            try:
                item = future.result()
            except Exception as exc:
                item = {"Sembol": futures[future], "Hata": str(exc)[:100]}
            if "Hata" in item:
                errors += 1
                if first_error is None:
                    first_error = item["Hata"]
            elif "Filtre" in item:
                filtered += 1
            elif isinstance(item.get("Puan"), (int, float)) and math.isfinite(item["Puan"]):
                results.append(item)
    results.sort(key=lambda row: row["Puan"], reverse=True)
    return {
        "requested": len(symbols), "results": results, "filtered": filtered,
        "errors": errors, "first_error": first_error,
        "engine": "Piyasa_Terminali_v23_4.py", "data_provider": "borsapy",
        "generated_at": datetime.now().astimezone().isoformat(),
        "elapsed_seconds": round(time.monotonic() - start, 2),
        "universe": len(universe),
    }
