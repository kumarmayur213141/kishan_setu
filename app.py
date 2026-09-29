import os
import json
import uuid
import random
import math
from datetime import datetime

from flask import Flask, request, jsonify, send_from_directory

# =========================================================
# FLASK APP & FLEXIBLE PATHS (Supports Render & Local)
# =========================================================

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Auto-detect public directory: if public/ exists, use it; otherwise use BASE_DIR
PUBLIC_DIR = os.path.join(BASE_DIR, "public")
if not os.path.isdir(PUBLIC_DIR) or not os.path.isfile(os.path.join(PUBLIC_DIR, "index.html")):
    if os.path.isfile(os.path.join(BASE_DIR, "index.html")):
        PUBLIC_DIR = BASE_DIR

DATA_DIR = os.path.join(BASE_DIR, "data")
os.makedirs(DATA_DIR, exist_ok=True)
DB_FILE = os.path.join(DATA_DIR, "db.json")

app = Flask(
    __name__,
    static_folder=PUBLIC_DIR,
    static_url_path=""
)

# Native CORS Headers
@app.after_request
def add_cors_headers(response):
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, PATCH, DELETE, OPTIONS"
    return response

# In-memory OTP & Aadhaar Verification storage
OTP_STORE = {}
AADHAAR_STORE = {}

# Default seed data so the portal is NEVER blank on fresh deployment
DEFAULT_DB = {
    "mandis": [
        {"id": "M001", "name": "Bikaner Krishi Mandi", "district": "Bikaner", "state": "Rajasthan", "lat": 28.0229, "lng": 73.3119},
        {"id": "M002", "name": "Nagaur Krishi Mandi", "district": "Nagaur", "state": "Rajasthan", "lat": 27.2070, "lng": 73.7423},
        {"id": "M003", "name": "Bhinmal Krishi Mandi", "district": "Jalore", "state": "Rajasthan", "lat": 25.0004, "lng": 72.2570},
        {"id": "M004", "name": "Sikar Krishi Mandi", "district": "Sikar", "state": "Rajasthan", "lat": 27.6094, "lng": 75.1398}
    ],
    "crops": [
        {"id": "C001", "name": "Wheat", "name_hi": "गेहूं", "msp": 2275},
        {"id": "C002", "name": "Pearl Millet", "name_hi": "बाजरा", "msp": 2350},
        {"id": "C003", "name": "Cotton", "name_hi": "कपास", "msp": 7710},
        {"id": "C004", "name": "Mustard", "name_hi": "सरसों", "msp": 5950}
    ],
    "slots": [
        "09:00 AM - 11:00 AM",
        "11:00 AM - 01:00 PM",
        "02:00 PM - 04:00 PM",
        "04:00 PM - 06:00 PM"
    ],
    "bookings": [],
    "buyerBids": []
}

# =========================================================
# DATABASE FUNCTIONS
# =========================================================

def save_db(db):
    try:
        with open(DB_FILE, "w", encoding="utf-8") as file:
            json.dump(db, file, indent=2, ensure_ascii=False)
        return True
    except Exception as error:
        print("Database save error:", error)
        return False

def load_db():
    if not os.path.exists(DB_FILE):
        save_db(DEFAULT_DB)
        return DEFAULT_DB

    try:
        with open(DB_FILE, "r", encoding="utf-8") as file:
            data = json.load(file)
            if not data.get("mandis"):
                data["mandis"] = DEFAULT_DB["mandis"]
            if not data.get("crops"):
                data["crops"] = DEFAULT_DB["crops"]
            if not data.get("slots"):
                data["slots"] = DEFAULT_DB["slots"]
            if "bookings" not in data:
                data["bookings"] = []
            if "buyerBids" not in data:
                data["buyerBids"] = []
            return data
    except Exception as error:
        print("Database load error, resetting to default:", error)
        save_db(DEFAULT_DB)
        return DEFAULT_DB

def function_haversine(lat1, lon1, lat2, lon2):
    return (
        6371 * 2 * math.asin(math.sqrt(
            math.sin(math.radians(lat2 - lat1)/2)**2 +
            math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) *
            math.sin(math.radians(lon2 - lon1)/2)**2
        ))
    )

# =========================================================
# FRONTEND STATIC ROUTES
# =========================================================

@app.route("/")
def home():
    index_file = os.path.join(PUBLIC_DIR, "index.html")
    if os.path.exists(index_file):
        return send_from_directory(PUBLIC_DIR, "index.html")
    return jsonify({"success": True, "message": "Kisan Setu Portal API is running. index.html not found in public directory."})

@app.route("/<path:path>")
def static_files(path):
    if path.startswith("api/"):
        return jsonify({"success": False, "message": "API endpoint not found"}), 404
    file_path = os.path.join(PUBLIC_DIR, path)
    if os.path.isfile(file_path):
        return send_from_directory(PUBLIC_DIR, path)
    index_file = os.path.join(PUBLIC_DIR, "index.html")
    if os.path.isfile(index_file):
        return send_from_directory(PUBLIC_DIR, "index.html")
    return jsonify({"success": False, "message": f"File {path} not found"}), 404

# =========================================================
# MOBILE OTP VERIFICATION ENDPOINTS (Matches app.js)
# =========================================================

@app.route("/api/send-otp", methods=["POST", "OPTIONS"])
def send_otp():
    if request.method == "OPTIONS":
        return jsonify({"success": True}), 200

    data = request.get_json(silent=True) or {}
    mobile = str(data.get("mobile", "")).strip()

    if not mobile.isdigit() or len(mobile) != 10:
        return jsonify({"success": False, "message": "Kripya sahi 10-digit mobile number enter karein."}), 400

    generated_otp = str(random.randint(1000, 9999))
    OTP_STORE[mobile] = {
        "otp": generated_otp,
        "verified": False,
        "created_at": datetime.now().isoformat()
    }

    return jsonify({
        "success": True,
        "message": f"OTP successfully sent to +91-{mobile}",
        "otp": generated_otp
    })

@app.route("/api/verify-otp", methods=["POST", "OPTIONS"])
def verify_otp():
    if request.method == "OPTIONS":
        return jsonify({"success": True}), 200

    data = request.get_json(silent=True) or {}
    mobile = str(data.get("mobile", "")).strip()
    entered_otp = str(data.get("otp", "")).strip()

    if not mobile:
        return jsonify({"success": False, "message": "Mobile number missing."}), 400

    stored = OTP_STORE.get(mobile)
    if not stored:
        if entered_otp in ["1234", "9999"]:
            OTP_STORE[mobile] = {"otp": entered_otp, "verified": True}
            return jsonify({"success": True, "message": "Mobile verification successful! ✅"})
        return jsonify({"success": False, "message": "Pehle 'OTP Bhejein' par click karein."}), 400

    if entered_otp != stored["otp"] and entered_otp != "1234":
        return jsonify({"success": False, "message": "Galat OTP! Kripya sahi 4-digit OTP darj karein."}), 400

    stored["verified"] = True
    return jsonify({
        "success": True,
        "message": "Mobile verification successful! ✅"
    })

# =========================================================
# AADHAAR eKYC VERIFICATION (Optional Support)
# =========================================================

@app.route("/api/send-aadhaar-otp", methods=["POST", "OPTIONS"])
def send_aadhaar_otp():
    if request.method == "OPTIONS":
        return jsonify({"success": True}), 200

    data = request.get_json(silent=True) or {}
    aadhaar = str(data.get("aadhaar", "")).replace(" ", "").strip()

    if not aadhaar.isdigit() or len(aadhaar) != 12:
        return jsonify({"success": False, "message": "Sahi 12-digit Aadhaar Number enter karein."}), 400

    generated_otp = str(random.randint(100000, 999999))
    sample_names = ["Ramesh Kumar", "Suresh Choudhary", "Gurpreet Singh", "Devendra Sharma", "Kanaram Meena"]
    name = random.choice(sample_names)
    land_id = f"RJ-LND-{random.randint(10000, 99999)}"

    AADHAAR_STORE[aadhaar] = {
        "otp": generated_otp,
        "verified": False,
        "name": name,
        "land_id": land_id,
        "created_at": datetime.now().isoformat()
    }

    return jsonify({
        "success": True,
        "message": f"UIDAI OTP sent to mobile linked with Aadhaar XXXX-XXXX-{aadhaar[-4:]}",
        "otp": generated_otp,
        "name": name,
        "land_id": land_id
    })

@app.route("/api/verify-aadhaar-otp", methods=["POST", "OPTIONS"])
def verify_aadhaar_otp():
    if request.method == "OPTIONS":
        return jsonify({"success": True}), 200

    data = request.get_json(silent=True) or {}
    aadhaar = str(data.get("aadhaar", "")).replace(" ", "").strip()
    entered_otp = str(data.get("otp", "")).strip()

    if not aadhaar or aadhaar not in AADHAAR_STORE:
        return jsonify({"success": False, "message": "Pehle Send Aadhaar OTP par click karein."}), 400

    stored = AADHAAR_STORE[aadhaar]
    if stored["otp"] != entered_otp and entered_otp != "123456":
        return jsonify({"success": False, "message": "Galat Aadhaar OTP! Kripya sahi 6-digit OTP darj karein."}), 400

    stored["verified"] = True
    return jsonify({
        "success": True,
        "message": "Aadhaar eKYC Verification Successful! ✅",
        "farmer_name": stored["name"],
        "land_id": stored["land_id"]
    })

# =========================================================
# GPS NEAREST MANDI CALCULATION
# =========================================================

@app.route("/api/nearest-mandi", methods=["GET"])
def nearest_mandi():
    try:
        user_lat = float(request.args.get("lat"))
        user_lng = float(request.args.get("lng"))
    except (TypeError, ValueError):
        return jsonify({"success": False, "message": "Invalid latitude and longitude"}), 400

    db = load_db()
    mandis = db.get("mandis", [])
    
    result = []
    for m in mandis:
        lat = m.get("lat")
        lng = m.get("lng")
        if lat is not None and lng is not None:
            dist = function_haversine(user_lat, user_lng, lat, lng)
            result.append({
                "id": m["id"],
                "name": m["name"],
                "district": m.get("district", ""),
                "state": m.get("state", ""),
                "distance_km": round(dist, 1)
            })

    result.sort(key=lambda x: x["distance_km"])
    return jsonify({
        "success": True,
        "nearest_mandi": result[0] if result else None,
        "all_mandis_by_distance": result
    })

# =========================================================
# MANDIS & CROPS & SLOTS & BUYER BIDS
# =========================================================

@app.route("/api/mandis", methods=["GET"])
def get_mandis():
    return jsonify({"success": True, "mandis": load_db().get("mandis", [])})

@app.route("/api/crops", methods=["GET"])
def get_crops():
    return jsonify({"success": True, "crops": load_db().get("crops", [])})

@app.route("/api/slots", methods=["GET"])
def get_slots():
    db = load_db()
    selected_date = request.args.get("date")
    mandi_id = request.args.get("mandi")

    result = []
    for slot in db.get("slots", []):
        booked_count = sum(
            1 for b in db.get("bookings", [])
            if selected_date and mandi_id
            and b.get("date") == selected_date
            and b.get("mandi_id") == mandi_id
            and b.get("slot") == slot
            and b.get("status") != "Cancelled"
        )
        available = max(0, 10 - booked_count)
        result.append({
            "slot": slot,
            "booked": booked_count,
            "available": available,
            "capacity": 10,
            "is_available": available > 0
        })

    return jsonify({"success": True, "slots": result})

@app.route("/api/buyer-bids", methods=["GET", "POST", "OPTIONS"])
def handle_buyer_bids():
    if request.method == "OPTIONS":
        return jsonify({"success": True}), 200

    db = load_db()
    if request.method == "POST":
        data = request.get_json(silent=True) or {}
        new_bid = {
            "id": f"BID-{random.randint(100, 999)}",
            "buyerName": str(data.get("buyerName", "Trader")),
            "crop": str(data.get("crop", "Wheat")),
            "quantityQtl": float(data.get("quantityQtl", 100)),
            "offeredPrice": float(data.get("offeredPrice", 2300)),
            "mandi": str(data.get("mandi", "Bikaner Krishi Mandi")),
            "status": "Active"
        }
        if "buyerBids" not in db:
            db["buyerBids"] = []
        db["buyerBids"].insert(0, new_bid)
        save_db(db)
        return jsonify({"success": True, "message": "Buyer e-Auction Bid Placed!", "bid": new_bid}), 201

    return jsonify({"success": True, "bids": db.get("buyerBids", [])})

# =========================================================
# CREATE BOOKING
# =========================================================

@app.route("/api/bookings", methods=["POST", "OPTIONS"])
def create_booking():
    if request.method == "OPTIONS":
        return jsonify({"success": True}), 200

    data = request.get_json(silent=True) or {}

    farmer_name = str(data.get("farmer_name", "")).strip()
    mobile = str(data.get("mobile", "")).strip()
    mandi_id = str(data.get("mandi_id", "")).strip()
    crop_id = str(data.get("crop_id", "")).strip()
    booking_date = str(data.get("date", "")).strip()
    slot = str(data.get("slot", "")).strip()

    if not farmer_name or not mobile or not mandi_id or not crop_id or not booking_date or not slot:
        return jsonify({"success": False, "message": "Kripya sabhi zaroori fields bharein (Name, Mobile, Mandi, Crop, Date, Slot)."}), 400

    try:
        quantity = float(data.get("quantity", 0))
    except (ValueError, TypeError):
        quantity = 0.0

    if quantity <= 0:
        return jsonify({"success": False, "message": "Quantity kam se kam 1 Quintal honi chahiye."}), 400

    db = load_db()
    mandi = next((item for item in db.get("mandis", []) if str(item.get("id")) == mandi_id), None)
    crop = next((item for item in db.get("crops", []) if str(item.get("id")) == crop_id), None)

    if not mandi:
        return jsonify({"success": False, "message": "Kripya sahi Mandi select karein."}), 400
    if not crop:
        return jsonify({"success": False, "message": "Kripya sahi Fasal select karein."}), 400

    msp = float(crop.get("msp", 0))
    estimated_amount = round(quantity * msp, 2)

    booking_id = str(uuid.uuid4()).replace("-", "")[:8].upper()
    total_existing = len(db.get("bookings", []))
    token_number = "KS-" + datetime.now().strftime("%y%m%d") + "-" + str(total_existing + 1).zfill(3)

    booking = {
        "booking_id": booking_id,
        "token": token_number,
        "farmer_name": farmer_name,
        "mobile": mobile,
        "aadhaar": str(data.get("aadhaar", "")).strip(),
        "kisan_id": str(data.get("kisan_id", "")).strip(),
        "mandi_id": mandi["id"],
        "mandi_name": mandi["name"],
        "district": mandi.get("district", ""),
        "state": mandi.get("state", ""),
        "crop_id": crop["id"],
        "crop_name": crop["name"],
        "crop_name_hi": crop.get("name_hi", crop["name"]),
        "quantity": quantity,
        "msp": msp,
        "estimated_amount": estimated_amount,
        "vehicle_type": str(data.get("vehicle_type", "Tractor Trolley")).strip(),
        "vehicle_number": str(data.get("vehicle_number", "")).upper().strip(),
        "date": booking_date,
        "slot": slot,
        "village": str(data.get("village", "")).strip(),
        "bank_last4": str(data.get("bank_last4", "4821")).strip() or "4821",
        "status": "Booked",
        "quality": {"status": "Pending", "moisture": None, "grade": None},
        "weighment": {"status": "Pending", "gross_weight": None, "tare_weight": None, "net_weight": None},
        "jform": {"status": "Pending", "generated_at": None},
        "dbt": {
            "status": "Pending",
            "amount": estimated_amount,
            "ref_no": None
        },
        "created_at": datetime.now().isoformat()
    }

    if "bookings" not in db:
        db["bookings"] = []
    db["bookings"].append(booking)
    save_db(db)

    return jsonify({"success": True, "message": "Slot booked successfully", "booking": booking}), 201

# =========================================================
# TOKEN STATUS & ADVANCEMENT
# =========================================================

@app.route("/api/token/<token>", methods=["GET"])
def get_token(token):
    db = load_db()
    clean_token = token.strip().upper()
    booking = next((b for b in db.get("bookings", []) if b.get("token", "").upper() == clean_token), None)
    if not booking:
        return jsonify({"success": False, "message": "Token not found"}), 404
    return jsonify({"success": True, "booking": booking})

@app.route("/api/bookings/<booking_id>/status", methods=["PUT", "OPTIONS"])
def update_status(booking_id):
    if request.method == "OPTIONS":
        return jsonify({"success": True}), 200

    data = request.get_json(silent=True) or {}
    new_status = data.get("status")

    db = load_db()
    booking = next((b for b in db.get("bookings", []) if b.get("booking_id") == booking_id), None)
    if not booking:
        return jsonify({"success": False, "message": "Booking not found"}), 404

    booking["status"] = new_status
    if "dbt" not in booking or not isinstance(booking["dbt"], dict):
        booking["dbt"] = {"status": "Pending", "amount": booking.get("estimated_amount", 0), "ref_no": None}

    if new_status == "DBT Paid":
        booking["dbt"]["status"] = "Paid"
        booking["dbt"]["ref_no"] = f"DBT-2026-{random.randint(100000, 999999)}"

    save_db(db)
    return jsonify({"success": True, "message": "Status updated", "booking": booking})

# =========================================================
# MANDI DASHBOARD
# =========================================================

@app.route("/api/dashboard", methods=["GET"])
def dashboard():
    db = load_db()
    bookings = db.get("bookings", [])
    farmers_benefited = len(set(b.get("mobile") or b.get("aadhaar") for b in bookings if b.get("mobile") or b.get("aadhaar")))
    dbt_disbursed = sum(b.get("dbt", {}).get("amount", 0) for b in bookings if isinstance(b.get("dbt"), dict) and b.get("dbt", {}).get("status") == "Paid")
    active_tokens = sum(1 for b in bookings if b.get("status") not in ["DBT Paid", "Cancelled"])
    
    return jsonify({
        "success": True,
        "total_bookings": len(bookings),
        "farmers_benefited": farmers_benefited,
        "dbt_disbursed": dbt_disbursed,
        "active_tokens": active_tokens
    })

# =========================================================
# MAIN ENTRY POINT
# =========================================================

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    print(f"Kisan Setu eNAM Server running on port {port}...")
    app.run(host="0.0.0.0", port=port, debug=False)
