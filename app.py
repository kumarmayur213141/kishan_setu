import os
import json
import uuid
import random
from datetime import datetime

from flask import Flask, request, jsonify, send_from_directory

# =========================================================
# FLASK APP & PATHS
# =========================================================

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PUBLIC_DIR = os.path.join(BASE_DIR, "public")
DATA_DIR = os.path.join(BASE_DIR, "data")
DB_FILE = os.path.join(DATA_DIR, "db.json")

os.makedirs(DATA_DIR, exist_ok=True)
os.makedirs(PUBLIC_DIR, exist_ok=True)

app = Flask(
    __name__,
    static_folder=PUBLIC_DIR,
    static_url_path=""
)

# Native CORS Headers (Zero dependency)
@app.after_request
def add_cors_headers(response):
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, PATCH, DELETE, OPTIONS"
    return response

# In-memory OTP storage
OTP_STORE = {}

# =========================================================
# DEFAULT DATABASE
# =========================================================

DEFAULT_DB = {
    "mandis": [
        {"id": "M001", "name": "Bikaner", "district": "Bikaner", "state": "Rajasthan"},
        {"id": "M002", "name": "Nagaur", "district": "Nagaur", "state": "Rajasthan"},
        {"id": "M003", "name": "Bhinmal", "district": "Jalore", "state": "Rajasthan"},
        {"id": "M004", "name": "Sikar", "district": "Sikar", "state": "Rajasthan"}
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
    "bookings": []
}

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
        db = json.loads(json.dumps(DEFAULT_DB))
        save_db(db)
        return db

    try:
        with open(DB_FILE, "r", encoding="utf-8") as file:
            db = json.load(file)
        if not db.get("mandis"): db["mandis"] = DEFAULT_DB["mandis"]
        if not db.get("crops"): db["crops"] = DEFAULT_DB["crops"]
        if not db.get("slots"): db["slots"] = DEFAULT_DB["slots"]
        if "bookings" not in db: db["bookings"] = []
        return db
    except Exception as error:
        db = json.loads(json.dumps(DEFAULT_DB))
        save_db(db)
        return db

# =========================================================
# FRONTEND STATIC ROUTES
# =========================================================

@app.route("/")
def home():
    index_file = os.path.join(PUBLIC_DIR, "index.html")
    if os.path.exists(index_file):
        return send_from_directory(PUBLIC_DIR, "index.html")
    return jsonify({"success": True, "message": "KisanSetu API is running"})

@app.route("/<path:path>")
def static_files(path):
    if path.startswith("api/"):
        return jsonify({"success": False, "message": "API endpoint not found"}), 404
    file_path = os.path.join(PUBLIC_DIR, path)
    if os.path.isfile(file_path):
        return send_from_directory(PUBLIC_DIR, path)
    return send_from_directory(PUBLIC_DIR, "index.html")

# =========================================================
# OTP API ENDPOINTS
# =========================================================

@app.route("/api/send-otp", methods=["POST"])
def send_otp():
    data = request.get_json(silent=True) or {}
    mobile = str(data.get("mobile", "")).strip()

    if not mobile.isdigit() or len(mobile) != 10:
        return jsonify({"success": False, "message": "Valid 10 digit mobile number enter karein."}), 400

    generated_otp = str(random.randint(1000, 9999))
    OTP_STORE[mobile] = {
        "otp": generated_otp,
        "verified": False,
        "created_at": datetime.now()
    }

    return jsonify({
        "success": True,
        "message": f"OTP sent to +91 {mobile}",
        "otp": generated_otp
    })

@app.route("/api/verify-otp", methods=["POST"])
def verify_otp():
    data = request.get_json(silent=True) or {}
    mobile = str(data.get("mobile", "")).strip()
    entered_otp = str(data.get("otp", "")).strip()

    if not mobile or mobile not in OTP_STORE:
        return jsonify({"success": False, "message": "Pehle Send OTP par click karke OTP mangwayein."}), 400

    stored = OTP_STORE[mobile]

    if stored["otp"] != entered_otp:
        return jsonify({"success": False, "message": "Galat OTP! Kripya sahi 4-digit OTP darj karein."}), 400

    stored["verified"] = True
    return jsonify({"success": True, "message": "Mobile number verify ho gaya hai! ✅"})

# =========================================================
# MANDI, CROP, SLOT, BOOKING ENDPOINTS
# =========================================================

@app.route("/api/mandis", methods=["GET"])
def get_mandis():
    return jsonify({"success": True, "mandis": load_db()["mandis"]})

@app.route("/api/crops", methods=["GET"])
def get_crops():
    return jsonify({"success": True, "crops": load_db()["crops"]})

@app.route("/api/slots", methods=["GET"])
def get_slots():
    db = load_db()
    selected_date = request.args.get("date")
    mandi_id = request.args.get("mandi")

    result = []
    for slot in db["slots"]:
        booked_count = sum(
            1 for b in db["bookings"]
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

@app.route("/api/bookings", methods=["POST"])
def create_booking():
    data = request.get_json(silent=True) or {}
    mobile = str(data.get("mobile", "")).strip()

    # OTP Verification Enforcement
    if mobile in OTP_STORE and not OTP_STORE[mobile].get("verified", False):
        return jsonify({"success": False, "message": "Mobile OTP Verification zaroori hai!"}), 400

    db = load_db()
    mandi = next((item for item in db["mandis"] if item.get("id") == str(data.get("mandi_id"))), None)
    crop = next((item for item in db["crops"] if item.get("id") == str(data.get("crop_id"))), None)

    if not mandi or not crop:
        return jsonify({"success": False, "message": "Invalid Mandi or Crop selection"}), 400

    quantity = float(data.get("quantity", 0))
    booking_date = str(data.get("date", "")).strip()

    msp = float(crop["msp"])
    estimated_amount = round(quantity * msp, 2)

    booking_id = str(uuid.uuid4()).replace("-", "")[:8].upper()
    token_number = "KS-" + datetime.now().strftime("%y%m%d") + "-" + str(len(db["bookings"]) + 1).zfill(3)

    booking = {
        "booking_id": booking_id,
        "token": token_number,
        "farmer_name": str(data.get("farmer_name", "")).strip(),
        "mobile": mobile,
        "kisan_id": str(data.get("kisan_id", "")).strip(),
        "mandi_id": mandi["id"],
        "mandi_name": mandi["name"],
        "district": mandi["district"],
        "state": mandi["state"],
        "crop_id": crop["id"],
        "crop_name": crop["name"],
        "crop_name_hi": crop["name_hi"],
        "quantity": quantity,
        "msp": msp,
        "estimated_amount": estimated_amount,
        "vehicle_type": str(data.get("vehicle_type", "")).strip(),
        "vehicle_number": str(data.get("vehicle_number", "")).upper().strip(),
        "date": booking_date,
        "slot": str(data.get("slot", "")).strip(),
        "village": str(data.get("village", "")).strip(),
        "bank_last4": str(data.get("bank_last4", "")).strip(),
        "status": "Booked",
        "quality": {"status": "Pending", "moisture": None, "grade": None},
        "weighment": {"status": "Pending", "gross_weight": None, "tare_weight": None, "net_weight": None},
        "jform": {"status": "Pending", "generated_at": None},
        "dbt": {"status": "Pending", "amount": estimated_amount},
        "created_at": datetime.now().isoformat()
    }

    db["bookings"].append(booking)
    save_db(db)

    return jsonify({"success": True, "message": "Slot booked successfully", "booking": booking}), 201

@app.route("/api/token/<token>", methods=["GET"])
def get_token(token):
    db = load_db()
    booking = next((b for b in db["bookings"] if b.get("token") == token), None)
    if not booking:
        return jsonify({"success": False, "message": "Token not found"}), 404
    return jsonify({"success": True, "booking": booking})

@app.route("/api/bookings/<booking_id>/status", methods=["PUT"])
def update_status(booking_id):
    data = request.get_json(silent=True) or {}
    new_status = data.get("status")

    db = load_db()
    booking = next((b for b in db["bookings"] if b.get("booking_id") == booking_id), None)
    if not booking:
        return jsonify({"success": False, "message": "Booking not found"}), 404

    booking["status"] = new_status
    if new_status == "DBT Paid":
        booking["dbt"]["status"] = "Paid"

    save_db(db)
    return jsonify({"success": True, "message": "Status updated", "booking": booking})

@app.route("/api/dashboard", methods=["GET"])
def dashboard():
    db = load_db()
    bookings = db.get("bookings", [])
    return jsonify({
        "success": True,
        "total_bookings": len(bookings),
        "farmers_benefited": len(set(b.get("mobile") for b in bookings if b.get("mobile"))),
        "dbt_disbursed": sum(b.get("dbt", {}).get("amount", 0) for b in bookings if b.get("dbt", {}).get("status") == "Paid"),
        "active_tokens": sum(1 for b in bookings if b.get("status") not in ["DBT Paid", "Cancelled"])
    })

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    print(f"KisanSetu Server running on port {port}...")
    app.run(host="0.0.0.0", port=port, debug=False)
