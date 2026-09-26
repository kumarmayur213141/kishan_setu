const API = "/api";

let crops = [];
let mandis = [];
let isMobileVerified = false;

document.addEventListener("DOMContentLoaded", async () => {
    setMinimumDate();
    await loadMandis();
    await loadCrops();
    setupEvents();
    setupVoice();
    loadDashboard();
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
// OTP VERIFICATION FUNCTIONS
// =====================================

async function sendOTP() {
    const mobile = document.getElementById("mobile").value.trim();

    if (!/^[0-9]{10}$/.test(mobile)) {
        alert("Please enter a valid 10-digit mobile number.");
        return;
    }

    const sendBtn = document.getElementById("sendOtpBtn");
    sendBtn.disabled = true;

    try {
        const response = await fetch(`${API}/send-otp`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ mobile })
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
            alert(result.message || "OTP bhejne me error aaya.");
            sendBtn.disabled = false;
            return;
        }

        document.getElementById("otpSection").style.display = "block";
        alert(`📩 ${result.message}\nDemo OTP: ${result.otp}`);
        sendBtn.textContent = "🔄 Resend OTP";
        sendBtn.disabled = false;

    } catch (error) {
        alert("Server connection error.");
        sendBtn.disabled = false;
    }
}

async function verifyOTP() {
    const mobile = document.getElementById("mobile").value.trim();
    const otp = document.getElementById("otp_input").value.trim();

    if (!otp || otp.length !== 4) {
        alert("Kripya 4-digit OTP enter karein.");
        return;
    }

    const verifyBtn = document.getElementById("verifyOtpBtn");
    verifyBtn.disabled = true;

    try {
        const response = await fetch(`${API}/verify-otp`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ mobile, otp })
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
            alert(result.message || "OTP Verification Failed.");
            verifyBtn.disabled = false;
            return;
        }

        isMobileVerified = true;
        document.getElementById("otpBadge").textContent = "✅ Verified";
        document.getElementById("otpSection").style.display = "none";

        const sendBtn = document.getElementById("sendOtpBtn");
        sendBtn.textContent = "✅ Verified";
        sendBtn.disabled = true;
        sendBtn.style.background = "#2b8a3e";

        document.getElementById("mobile").readOnly = true;
        alert("🎉 Mobile Number Verification Successful!");

    } catch (error) {
        alert("Server Error.");
        verifyBtn.disabled = false;
    }
}

// =====================================
// API DATA LOADERS
// =====================================

async function loadMandis() {
    try {
        const res = await fetch(`${API}/mandis`);
        const result = await res.json();
        mandis = result.mandis || [];
        const select = document.getElementById("mandi");
        select.innerHTML = `<option value="">Select Purchase Mandi</option>`;
        mandis.forEach(m => {
            select.innerHTML += `<option value="${m.id}">${m.name} - ${m.district}</option>`;
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
        select.innerHTML = `<option value="">Select Fasal</option>`;
        calcSelect.innerHTML = `<option value="">Select Crop</option>`;
        crops.forEach(c => {
            select.innerHTML += `<option value="${c.id}">${c.name} (${c.name_hi})</option>`;
            calcSelect.innerHTML += `<option value="${c.id}">${c.name} - ₹${c.msp}/Qtl</option>`;
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

    if (!isMobileVerified) {
        alert("⚠️ Mobile OTP verification zaroori hai. Pehle 'OTP Bhejein' par click karein!");
        return;
    }

    const data = {
        farmer_name: document.getElementById("farmer_name").value,
        mobile: document.getElementById("mobile").value,
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
        if (!res.ok) { alert(result.message); return; }

        showToken(result.booking);
        document.getElementById("bookingForm").reset();
        isMobileVerified = false;
        document.getElementById("otpBadge").textContent = "";
        document.getElementById("mobile").readOnly = false;
        const sendBtn = document.getElementById("sendOtpBtn");
        sendBtn.textContent = "📲 OTP Bhejein";
        sendBtn.disabled = false;
        sendBtn.style.background = "#087f5b";

        setMinimumDate();
        calculateBookingAmount();
        loadDashboard();
    } catch (err) { alert("Server Error"); }
}

function showToken(booking) {
    document.getElementById("tokenDetails").innerHTML = `
        <div class="token-card">
            <div class="token-number">${booking.token}</div>
            <div class="token-grid">
                <div class="token-item"><span>Farmer</span><strong>${booking.farmer_name}</strong></div>
                <div class="token-item"><span>Crop</span><strong>${booking.crop_name}</strong></div>
                <div class="token-item"><span>Quantity</span><strong>${booking.quantity} Quintals</strong></div>
                <div class="token-item"><span>Mandi</span><strong>${booking.mandi_name}</strong></div>
                <div class="token-item"><span>Date</span><strong>${formatDate(booking.date)}</strong></div>
                <div class="token-item"><span>Time Slot</span><strong>${booking.slot}</strong></div>
            </div>
        </div>`;
    document.getElementById("tokenModal").classList.add("show");
}

function closeModal() { document.getElementById("tokenModal").classList.remove("show"); }

async function searchToken() {
    const token = document.getElementById("tokenSearch").value.trim().toUpperCase();
    if (!token) return;
    try {
        const res = await fetch(`${API}/token/${token}`);
        const result = await res.json();
        if (!res.ok) { document.getElementById("tokenResult").innerHTML = `<p style="color:red;margin-top:15px;">❌ Token not found</p>`; return; }
        renderTokenStatus(result.booking);
    } catch (err) { console.error(err); }
}

function renderTokenStatus(booking) {
    const statuses = ["Booked", "Gate Entry", "Quality Check", "Weighment", "J-Form Generated", "DBT Paid"];
    const currentIndex = statuses.indexOf(booking.status);

    let html = `<div class="token-card"><div class="token-number">${booking.token}</div><div class="timeline">`;
    statuses.forEach((status, idx) => {
        const active = idx <= currentIndex;
        html += `<div class="timeline-item ${active ? "active" : ""}">${active ? "✅" : "⏳"} <strong>${status}</strong></div>`;
    });
    if (currentIndex >= 0 && currentIndex < statuses.length - 1) {
        html += `<div class="workflow-action"><button class="primary-btn" onclick="advanceStatus('${booking.booking_id}', '${statuses[currentIndex + 1]}', '${booking.token}')">▶️ Next Step: ${statuses[currentIndex + 1]}</button></div>`;
    }
    html += `</div></div>`;
    document.getElementById("tokenResult").innerHTML = html;
}

async function advanceStatus(bookingId, nextStatus) {
    try {
        const res = await fetch(`${API}/bookings/${bookingId}/status`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: nextStatus })
        });
        const result = await res.json();
        renderTokenStatus(result.booking);
        loadDashboard();
    } catch (err) { console.error(err); }
}

async function loadDashboard() {
    try {
        const res = await fetch(`${API}/dashboard`);
        const data = await res.json();
        document.getElementById("totalBookings").textContent = data.total_bookings;
        document.getElementById("farmers").textContent = data.farmers_benefited;
        document.getElementById("dbt").textContent = formatCurrency(data.dbt_disbursed);
        document.getElementById("activeTokens").textContent = data.active_tokens;
    } catch (err) { console.error(err); }
}

function calculateMSP() {
    const cropId = document.getElementById("calcCrop").value;
    const qty = Number(document.getElementById("calcQuantity").value);
    const crop = crops.find(c => c.id === cropId);
    if (!crop || !qty) { document.getElementById("calcAmount").textContent = "₹0"; return; }
    document.getElementById("calcAmount").textContent = formatCurrency(crop.msp * qty);
}

function setupVoice() {
    const btn = document.getElementById("voiceBtn");
    if (!btn) return;
    btn.addEventListener("click", () => {
        if (!("speechSynthesis" in window)) return;
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance("KisanSetu Portal. Apni fasal mandi me bechne ke liye slot book karein.");
        utterance.lang = "hi-IN";
        window.speechSynthesis.speak(utterance);
    });
}

function showSection(id) {
    document.querySelectorAll(".section").forEach(s => s.classList.remove("active"));
    document.getElementById(id).classList.add("active");
    if (id === "dashboard") loadDashboard();
}

function formatCurrency(val) {
    return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(val);
}

function formatDate(d) {
    return new Date(d + "T00:00:00").toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}
