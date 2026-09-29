const API = "/api";

let crops = [];
let mandis = [];
let isAadhaarVerified = false;
let currentRole = "seller";
let currentLang = "hi";

// =====================================
// 8 REGIONAL LANGUAGES DICTIONARY
// =====================================

const LANGUAGES = {
    hi: {
        app_title: "KisanSetu",
        app_subtitle: "किसान खरीद एवं मंडी डिजिटल पोर्टल",
        txt_booking_heading: "मंडी स्लॉट बुकिंग",
        txt_booking_sub: "अपनी फसल बेचने के लिए पास की मंडी चुनें और लाइव टोकन पाएं।",
        txt_aadhaar_heading: "🆔 डिजिटल आधार eKYC सत्यापन",
        lbl_farmer_name: "किसान का नाम (Farmer Name) *",
        lbl_kisan_id: "जमीन रजिस्ट्री / किसान ID *",
        lbl_mandi: "खरीद मंडी (Purchase Mandi) *",
        lbl_crop: "फसल (Crop) *",
        lbl_quantity: "अनुमानित मात्रा (क्विंटल) *",
        lbl_village: "गांव / तहसील *",
        lbl_vehicle_type: "वाहन प्रकार *",
        lbl_vehicle_number: "वाहन नंबर *",
        lbl_date: "स्लॉट तारीख *",
        lbl_slot: "समय स्लॉट *",
        lbl_bank: "आधार बैंक खाता अंतिम 4 अंक",
        lbl_est_payment: "अनुमानित एमएसपी भुगतान",
        speech_text: "किसानसेतु पोर्टल। अपनी फसल बेचने के लिए मंडी, फसल और स्लॉट चुनें।"
    },
    en: {
        app_title: "KisanSetu",
        app_subtitle: "Farmer Procurement & Mandi Digital Portal",
        txt_booking_heading: "Procurement Mandi Slot Booking",
        txt_booking_sub: "Select nearby mandi and book slot to get your digital token.",
        txt_aadhaar_heading: "🆔 Digital Aadhaar eKYC Verification",
        lbl_farmer_name: "Farmer Name *",
        lbl_kisan_id: "Land Registry / Kisan ID *",
        lbl_mandi: "Purchase Mandi *",
        lbl_crop: "Crop *",
        lbl_quantity: "Estimated Quantity (Quintals) *",
        lbl_village: "Village / Sub-district *",
        lbl_vehicle_type: "Vehicle Type *",
        lbl_vehicle_number: "Vehicle Plate No. *",
        lbl_date: "Slot Date *",
        lbl_slot: "Time Window *",
        lbl_bank: "Aadhaar Bank A/c Last 4 Digits",
        lbl_est_payment: "Estimated MSP Payment",
        speech_text: "Welcome to KisanSetu. Book your mandi slot for crop procurement."
    },
    marwari: {
        app_title: "किसानसेतु (मारवाड़ी)",
        app_subtitle: "मारवाड़ किसान मंडी अर बेचान पोर्टल",
        txt_booking_heading: "मंडी री बारी (स्लॉट) बुकिंग",
        txt_booking_sub: "आपरी जिणस (फसल) बेचबा सारू पास री मंडी अर टेम चुणो।",
        txt_aadhaar_heading: "🆔 आधार कार्ड सत्यापण (eKYC)",
        lbl_farmer_name: "किसान रो नाम *",
        lbl_kisan_id: "जमीन खाता री ID *",
        lbl_mandi: "बेचान री मंडी *",
        lbl_crop: "जिणस / फसल *",
        lbl_quantity: "बोरी / क्विंटल *",
        lbl_village: "गांव / ढाणी *",
        lbl_vehicle_type: "गाड़ी / ट्राली *",
        lbl_vehicle_number: "गाड़ी रा नंबर *",
        lbl_date: "बारी री तारीख *",
        lbl_slot: "टेम रो टाइम *",
        lbl_bank: "बैंक खाता रा आखरी ४ नंबर",
        lbl_est_payment: "अंदाजित सरकारी भाव रुपया",
        speech_text: "राम राम सा! किसानसेतु में आपरी फसल बेचबा सारू मंडी अर टाइम चुणो।"
    },
    sekhavati: {
        app_title: "किसानसेतु (शेखावाटी)",
        app_subtitle: "शेखावाटी मंडी अर फसल बेचान पोर्टल",
        txt_booking_heading: "मंडी की बारी (स्लॉट) बुक करो",
        txt_booking_sub: "आपणी फसल बेचबा ताई नजदीकी मंडी अर टेम सेलेक्ट करो।",
        txt_aadhaar_heading: "🆔 आधार कार्ड वेरिफिकेशन",
        lbl_farmer_name: "किसान को नाम *",
        lbl_kisan_id: "जमीन की रसीद ID *",
        lbl_mandi: "खरीद मंडी *",
        lbl_crop: "फसल *",
        lbl_quantity: "मात्रा (क्विंटल) *",
        lbl_village: "गांव / कस्वा *",
        lbl_vehicle_type: "साधन / ट्राली *",
        lbl_vehicle_number: "साधन का नंबर *",
        lbl_date: "तारीख *",
        lbl_slot: "टेम का स्लॉट *",
        lbl_bank: "बैंक खाता का पिछला ४ नंबर",
        lbl_est_payment: "अनुमानित रुप्या",
        speech_text: "राम राम भाई! शेखावाटी मंडी में फसल बेचबा ताई टोकन बुक करो।"
    },
    hadoti: {
        app_title: "किसानसेतु (हाड़ौती)",
        app_subtitle: "हाड़ौती मंडी खरीद पोर्टल",
        txt_booking_heading: "मंडी स्लॉट बुकिंग",
        txt_booking_sub: "फसल बेचना के खातर मंडी और टाइम चुणो।",
        txt_aadhaar_heading: "🆔 आधार eKYC चेकिंग",
        lbl_farmer_name: "किसान को नाम *",
        lbl_kisan_id: "खसरा / जमीन ID *",
        lbl_mandi: "हाड़ौती मंडी *",
        lbl_crop: "फसल *",
        lbl_quantity: "क्विंटल *",
        lbl_village: "गांव *",
        lbl_vehicle_type: "ट्राली / ट्रक *",
        lbl_vehicle_number: "गाड़ी नंबर *",
        lbl_date: "तारीख *",
        lbl_slot: "टाइम स्लॉट *",
        lbl_bank: "बैंक खाता नंबर",
        lbl_est_payment: "कुल पेमेंट",
        speech_text: "जय हाड़ौती! मंडी में फसल बेचना के खातर स्लॉट बुक करो।"
    },
    mevadi: {
        app_title: "किसानसेतु (मेवाड़ी)",
        app_subtitle: "मेवाड़ मंडी पोर्टल",
        txt_booking_heading: "मंडी बारी बुकिंग",
        txt_booking_sub: "फसल बेचवा सारू मंडी अर टाइम सेलेक्ट करो।",
        txt_aadhaar_heading: "🆔 आधार सत्यापण",
        lbl_farmer_name: "किसान रो नाम *",
        lbl_kisan_id: "खाता ID *",
        lbl_mandi: "मेवाड़ मंडी *",
        lbl_crop: "फसल *",
        lbl_quantity: "क्विंटल *",
        lbl_village: "गांव *",
        lbl_vehicle_type: "गाड़ी *",
        lbl_vehicle_number: "गाड़ी नंबर *",
        lbl_date: "तारीख *",
        lbl_slot: "टाइम *",
        lbl_bank: "बैंक नंबर",
        lbl_est_payment: "पेमेंट",
        speech_text: "खम्मा घणी! मेवाड़ मंडी में फसल बेचवा सारू स्लॉट बुक करो।"
    },
    vagdi: {
        app_title: "किसानसेतु (वागड़ी)",
        app_subtitle: "वागड़ मंडी पोर्टल",
        txt_booking_heading: "मंडी स्लॉट बुकिंग",
        txt_booking_sub: "फसल वेचवा साटू मंडी अने टाइम चुणो।",
        txt_aadhaar_heading: "🆔 आधार eKYC चेक",
        lbl_farmer_name: "किसान नु नाम *",
        lbl_kisan_id: "जमीन ID *",
        lbl_mandi: "मंडी *",
        lbl_crop: "फसल *",
        lbl_quantity: "क्विंटल *",
        lbl_village: "गांव *",
        lbl_vehicle_type: "गाड़ी *",
        lbl_vehicle_number: "गाड़ी नंबर *",
        lbl_date: "तारीख *",
        lbl_slot: "टाइम *",
        lbl_bank: "बैंक खातु *",
        lbl_est_payment: "कुल रुपया",
        speech_text: "जोहार सा! वागड़ मंडी मा फसल वेचवा साटू टोकन बुक करो।"
    },
    mevati: {
        app_title: "किसानसेतु (मेवाती)",
        app_subtitle: "मेवात अलवर मंडी बेचान पोर्टल",
        txt_booking_heading: "मंडी स्लॉट बुकिंग",
        txt_booking_sub: "फसल बेचन के लिए मंडी और टेम सेलेक्ट करो।",
        txt_aadhaar_heading: "🆔 आधार कार्ड वेरिफिकेशन",
        lbl_farmer_name: "किसान को नाम *",
        lbl_kisan_id: "जमीन ID *",
        lbl_mandi: "मेवात मंडी *",
        lbl_crop: "फसल *",
        lbl_quantity: "क्विंटल *",
        lbl_village: "गांव *",
        lbl_vehicle_type: "गाड़ी *",
        lbl_vehicle_number: "नंबर प्लेट *",
        lbl_date: "तारीख *",
        lbl_slot: "टेम स्लॉट *",
        lbl_bank: "बैंक अकाउंट नंबर",
        lbl_est_payment: "अनुमानित रुपया",
        speech_text: "सलाम अलैकुम! अलवर मेवात मंडी में फसल बेचन के लिए स्लॉट बुक करो।"
    }
};

// Initialize App
document.addEventListener("DOMContentLoaded", async () => {
    setMinimumDate();
    await loadMandis();
    await loadCrops();
    setupEvents();
    setupVoice();
    loadDashboard();
    loadBuyerBids();
});

function setMinimumDate() {
    const input = document.getElementById("booking_date");
    if (!input) return;
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    input.min = `${year}-${month}-${day}`;
    input.value = `${year}-${month}-${day}`;
}

// =====================================
// LANGUAGE SWITCHER
// =====================================

function changeLanguage(langCode) {
    currentLang = langCode;
    const dict = LANGUAGES[langCode] || LANGUAGES["hi"];

    for (const key in dict) {
        const el = document.getElementById(key);
        if (el) {
            el.textContent = dict[key];
        }
    }
}

// =====================================
// USER ROLE SWITCHER (Seller vs Buyer)
// =====================================

function switchUserRole(role) {
    currentRole = role;
    const sellerBtn = document.getElementById("roleSellerBtn");
    const buyerBtn = document.getElementById("roleBuyerBtn");

    if (role === "buyer") {
        sellerBtn.classList.remove("active");
        buyerBtn.classList.add("active");
        showSection("buyer_portal");
        alert("🏢 Switched to Vyapari (Buyer) Mode! You can place purchase bids.");
    } else {
        buyerBtn.classList.remove("active");
        sellerBtn.classList.add("active");
        showSection("booking");
    }
}

// =====================================
// GPS NEAREST MANDI LOCATOR
// =====================================

function findNearestMandiGPS() {
    const statusText = document.getElementById("gpsStatusText");
    if (!navigator.geolocation) {
        alert("Geolocation is not supported by your browser.");
        return;
    }

    if (statusText) statusText.textContent = "⌛ Fetching your GPS location...";

    navigator.geolocation.getCurrentPosition(
        async (position) => {
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;

            try {
                const res = await fetch(`${API}/nearest-mandi?lat=${lat}&lng=${lng}`);
                const result = await res.json();

                if (res.ok && result.success && result.nearest_mandi) {
                    const nearest = result.nearest_mandi;
                    const select = document.getElementById("mandi");
                    select.value = nearest.id;

                    if (statusText) {
                        statusText.textContent = `📍 Nearest Mandi: ${nearest.name} (${nearest.distance_km} km away)`;
                    }
                    alert(`📍 GPS Location Detected!\nNearest Mandi: ${nearest.name} (${nearest.district})\nDistance: ${nearest.distance_km} km away.`);
                    loadSlots();
                }
            } catch (err) {
                console.error(err);
                if (statusText) statusText.textContent = "❌ Could not calculate nearest mandi.";
            }
        },
        (error) => {
            alert("Please enable Location / GPS permissions to auto-detect nearest Mandi.");
            if (statusText) statusText.textContent = "❌ GPS Access Denied.";
        }
    );
}

// =====================================
// REAL AADHAAR eKYC VERIFICATION
// =====================================

function formatAadhaarInput(input) {
    let value = input.value.replace(/\D/g, "");
    let formatted = "";
    for (let i = 0; i < value.length; i++) {
        if (i > 0 && i % 4 === 0) formatted += " ";
        formatted += value[i];
    }
    input.value = formatted;
}

async function sendAadhaarOTP() {
    const aadhaarInput = document.getElementById("aadhaar");
    const aadhaar = aadhaarInput ? aadhaarInput.value.replace(/\s/g, "").trim() : "";

    if (!/^[0-9]{12}$/.test(aadhaar)) {
        alert("Please enter a valid 12-digit Aadhaar Number.");
        return;
    }

    const sendBtn = document.getElementById("sendAadhaarOtpBtn");
    sendBtn.disabled = true;

    try {
        const response = await fetch(`${API}/send-aadhaar-otp`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ aadhaar })
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
            alert(result.message || "Aadhaar OTP error.");
            sendBtn.disabled = false;
            return;
        }

        document.getElementById("aadhaarOtpSection").style.display = "block";
        alert(`🆔 UIDAI eKYC Message:\n${result.message}\nDemo Aadhaar OTP: ${result.otp}`);

        sendBtn.textContent = "🔄 Resend OTP";
        sendBtn.disabled = false;

    } catch (error) {
        alert("Server connection error.");
        sendBtn.disabled = false;
    }
}

async function verifyAadhaarOTP() {
    const aadhaar = document.getElementById("aadhaar").value.replace(/\s/g, "").trim();
    const otp = document.getElementById("aadhaar_otp_input").value.trim();

    if (!otp || otp.length !== 6) {
        alert("Kripya 6-digit Aadhaar OTP enter karein.");
        return;
    }

    const verifyBtn = document.getElementById("verifyAadhaarOtpBtn");
    verifyBtn.disabled = true;

    try {
        const response = await fetch(`${API}/verify-aadhaar-otp`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ aadhaar, otp })
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
            alert(result.message || "Aadhaar Verification Failed.");
            verifyBtn.disabled = false;
            return;
        }

        isAadhaarVerified = true;
        document.getElementById("farmer_name").value = result.farmer_name;
        document.getElementById("kisan_id").value = result.land_id;

        document.getElementById("aadhaarBadge").textContent = "✅ UIDAI eKYC Verified";
        document.getElementById("aadhaarOtpSection").style.display = "none";

        const sendBtn = document.getElementById("sendAadhaarOtpBtn");
        sendBtn.textContent = "✅ Verified";
        sendBtn.disabled = true;
        sendBtn.style.background = "#2b8a3e";

        document.getElementById("aadhaar").readOnly = true;
        alert(`🎉 Aadhaar eKYC Verified Successfully!\nFarmer Name: ${result.farmer_name}\nLand Registry ID: ${result.land_id}`);

    } catch (error) {
        alert("Server Error.");
        verifyBtn.disabled = false;
    }
}

// =====================================
// DATA LOADERS & EVENTS
// =====================================

async function loadMandis() {
    try {
        const res = await fetch(`${API}/mandis`);
        const result = await res.json();
        mandis = result.mandis || [];
        const select = document.getElementById("mandi");
        const bidMandi = document.getElementById("bidMandi");

        select.innerHTML = `<option value="">Select Purchase Mandi</option>`;
        if (bidMandi) bidMandi.innerHTML = `<option value="">Select Target Mandi</option>`;

        mandis.forEach(m => {
            select.innerHTML += `<option value="${m.id}">${m.name} - ${m.district}</option>`;
            if (bidMandi) bidMandi.innerHTML += `<option value="${m.name}">${m.name}</option>`;
        });
    } catch (err) { console.error(err); }
}

async function loadCrops() {
    try {
        const res = await fetch(`${API}/crops`);
        const result = await res.json();
        crops = result.crops || [];
        const select = document.getElementById("crop");
        const calcSelect = document.getElementById("calcCrop");
        const bidCrop = document.getElementById("bidCrop");

        select.innerHTML = `<option value="">Select Fasal</option>`;
        calcSelect.innerHTML = `<option value="">Select Crop</option>`;
        if (bidCrop) bidCrop.innerHTML = `<option value="">Select Crop</option>`;

        crops.forEach(c => {
            select.innerHTML += `<option value="${c.id}">${c.name} (${c.name_hi})</option>`;
            calcSelect.innerHTML += `<option value="${c.id}">${c.name} - ₹${c.msp}/Qtl</option>`;
            if (bidCrop) bidCrop.innerHTML += `<option value="${c.name}">${c.name}</option>`;
        });
    } catch (err) { console.error(err); }
}

function setupEvents() {
    document.getElementById("crop").addEventListener("change", calculateBookingAmount);
    document.getElementById("quantity").addEventListener("input", calculateBookingAmount);
    document.getElementById("mandi").addEventListener("change", loadSlots);
    document.getElementById("booking_date").addEventListener("change", loadSlots);
    document.getElementById("calcCrop").addEventListener("change", calculateMSP);
    document.getElementById("calcQuantity").addEventListener("input", calculateMSP);
    document.getElementById("bookingForm").addEventListener("submit", submitBooking);
}

function calculateBookingAmount() {
    const cropId = document.getElementById("crop").value;
    const quantity = Number(document.getElementById("quantity").value);
    const crop = crops.find(c => c.id === cropId);

    if (!crop || !quantity) {
        document.getElementById("amount").textContent = "₹ 0";
        document.getElementById("mspText").textContent = "Select crop to calculate MSP";
        return;
    }
    const amount = quantity * crop.msp;
    document.getElementById("amount").textContent = formatCurrency(amount);
    document.getElementById("mspText").textContent = `${quantity} Qtl × ₹${crop.msp.toLocaleString("en-IN")} per Quintal`;
}

async function loadSlots() {
    const mandi = document.getElementById("mandi").value;
    const date = document.getElementById("booking_date").value;
    const slotSelect = document.getElementById("slot");

    if (!mandi || !date) {
        slotSelect.innerHTML = `<option value="">Select Date & Mandi First</option>`;
        return;
    }

    try {
        const res = await fetch(`${API}/slots?mandi=${mandi}&date=${date}`);
        const result = await res.json();
        const slots = result.slots || [];
        slotSelect.innerHTML = `<option value="">Select Time Slot</option>`;
        slots.forEach(item => {
            const disabled = !item.is_available ? "disabled" : "";
            const text = !item.is_available ? `${item.slot} - FULL` : `${item.slot} - ${item.available} slots available`;
            slotSelect.innerHTML += `<option value="${item.slot}" ${disabled}>${text}</option>`;
        });
    } catch (err) { console.error(err); }
}

async function submitBooking(event) {
    event.preventDefault();

    if (!isAadhaarVerified) {
        alert("⚠️ Real Aadhaar eKYC Verification zaroori hai. Pehle 'Get Aadhaar OTP' par click karein!");
        return;
    }

    const data = {
        farmer_name: document.getElementById("farmer_name").value,
        mobile: document.getElementById("mobile").value,
        aadhaar: document.getElementById("aadhaar").value.replace(/\s/g, ""),
        kisan_id: document.getElementById("kisan_id").value,
        mandi_id: document.getElementById("mandi").value,
        crop_id: document.getElementById("crop").value,
        quantity: document.getElementById("quantity").value,
        village: document.getElementById("village").value,
        vehicle_type: document.getElementById("vehicle_type").value,
        vehicle_number: document.getElementById("vehicle_number").value,
        date: document.getElementById("booking_date").value,
        slot: document.getElementById("slot").value,
        bank_last4: document.getElementById("bank_last4").value
    };

    try {
        const res = await fetch(`${API}/bookings`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data)
        });
        const result = await res.json();
        if (!res.ok) { alert(result.message);
