const API = "/api";

let crops = [];
let mandis = [];
let isMobileVerified = false;
let currentBookingToken = "";

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
    if (!input.value) {
        input.value = `${year}-${month}-${day}`;
    }
}

// =====================================
// OTP VERIFICATION LOGIC
// =====================================

async function sendOTP() {
    const mobileInput = document.getElementById("mobile");
    const mobile = mobileInput.value.trim();

    if (!/^[0-9]{10}$/.test(mobile)) {
        alert("Kripya sahi 10-digit mobile number enter karein.");
        mobileInput.focus();
        return;
    }

    const sendBtn = document.getElementById("sendOtpBtn");
    sendBtn.disabled = true;
    sendBtn.textContent = "⏳ Bhej rahe hain...";

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
            sendBtn.textContent = "📲 OTP Bhejein";
            return;
        }

        document.getElementById("otpSection").style.display = "block";
        document.getElementById("otp_input").value = result.otp || "";
        alert(`📩 ${result.message}\nDemo OTP: ${result.otp}`);
        sendBtn.textContent = "🔄 Resend OTP";
        sendBtn.disabled = false;

    } catch (error) {
        console.error(error);
        alert("Server connection error. Kripya check karein server online hai ya nahi.");
        sendBtn.disabled = false;
        sendBtn.textContent = "📲 OTP Bhejein";
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
    verifyBtn.textContent = "Checking...";

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
            verifyBtn.textContent = "✅ Verify OTP";
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
        console.error(error);
        alert("Server Error in OTP verification.");
        verifyBtn.disabled = false;
        verifyBtn.textContent = "✅ Verify OTP";
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
            select.innerHTML += `<option value="${m.id}">${m.name} (${m.district})</option>`;
        });
    } catch (err) {
        console.error("loadMandis error:", err);
    }
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
    } catch (err) {
        console.error("loadCrops error:", err);
    }
}

function setupEvents() {
    document.getElementById("crop").addEventListener("change", calculateBookingAmount);
    document.getElementById("quantity").addEventListener("input", calculateBookingAmount);
    document.getElementById("mandi").addEventListener("change", loadSlots);
    document.getElementById("booking_date").addEventListener("change", loadSlots);
    document.getElementById("calcCrop").addEventListener("change", calculateMSP);
    document.getElementById("calcQuantity").addEventListener("input", calculateMSP);
    document.getElementById("bookingForm").addEventListener("submit", submitBooking);

    const tokenInput = document.getElementById("tokenSearch");
    if (tokenInput) {
        tokenInput.addEventListener("keypress", (e) => {
            if (e.key === "Enter") searchToken();
        });
    }
}

function calculateBookingAmount() {
    const cropId = document.getElementById("crop").value;
    const quantity = Number(document.getElementById("quantity").value);
    const crop = crops.find(c => c.id === cropId);

    if (!crop || !quantity || quantity <= 0) {
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
        const res = await fetch(`${API}/slots?mandi=${encodeURIComponent(mandi)}&date=${encodeURIComponent(date)}`);
        const result = await res.json();
        const slots = result.slots || [];
        slotSelect.innerHTML = `<option value="">Select Time Slot</option>`;
        slots.forEach(item => {
            const disabled = !item.is_available ? "disabled" : "";
            const text = !item.is_available ? `${item.slot} - FULL` : `${item.slot} (${item.available} slots left)`;
            slotSelect.innerHTML += `<option value="${item.slot}" ${disabled}>${text}</option>`;
        });
    } catch (err) {
        console.error("loadSlots error:", err);
    }
}

async function submitBooking(event) {
    event.preventDefault();

    if (!isMobileVerified) {
        alert("⚠️ Mobile OTP verification zaroori hai. Pehle 'OTP Bhejein' par click karein!");
        return;
    }

    const submitBtn = document.getElementById("submitBtn");
    submitBtn.disabled = true;
    submitBtn.textContent = "⏳ Booking Confirmation...";

    const data = {
        farmer_name: document.getElementById("farmer_name").value.trim(),
        mobile: document.getElementById("mobile").value.trim(),
        kisan_id: document.getElementById("kisan_id").value.trim(),
        mandi_id: document.getElementById("mandi").value,
        crop_id: document.getElementById("crop").value,
        quantity: document.getElementById("quantity").value,
        village: document.getElementById("village").value.trim(),
        vehicle_type: document.getElementById("vehicle_type").value,
        vehicle_number: document.getElementById("vehicle_number").value.trim(),
        date: document.getElementById("booking_date").value,
        slot: document.getElementById("slot").value,
        bank_last4: document.getElementById("bank_last4").value.trim() || "4821"
    };

    try {
        const res = await fetch(`${API}/bookings`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data)
        });
        const result = await res.json();
        submitBtn.disabled = false;
        submitBtn.textContent = "✅ Confirm Slot Booking & Generate Token";

        if (!res.ok || !result.success) {
            alert(result.message || "Booking failed.");
            return;
        }

        currentBookingToken = result.booking.token;
        document.getElementById("tokenSearch").value = result.booking.token;

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
    } catch (err) {
        console.error(err);
        submitBtn.disabled = false;
        submitBtn.textContent = "✅ Confirm Slot Booking & Generate Token";
        alert("Server Error while creating booking.");
    }
}

function showToken(booking) {
    document.getElementById("tokenDetails").innerHTML = `
        <div class="token-card">
            <div class="token-number">${booking.token}</div>
            <div class="token-grid">
                <div class="token-item"><span>Farmer</span><strong>${booking.farmer_name}</strong></div>
                <div class="token-item"><span>Crop</span><strong>${booking.crop_name} (${booking.crop_name_hi})</strong></div>
                <div class="token-item"><span>Quantity</span><strong>${booking.quantity} Quintals</strong></div>
                <div class="token-item"><span>Mandi</span><strong>${booking.mandi_name}</strong></div>
                <div class="token-item"><span>Date</span><strong>${formatDate(booking.date)}</strong></div>
                <div class="token-item"><span>Time Slot</span><strong>${booking.slot}</strong></div>
                <div class="token-item"><span>Est. MSP Payment</span><strong style="color: #087f5b;">${formatCurrency(booking.estimated_amount)}</strong></div>
                <div class="token-item"><span>Aadhaar A/c</span><strong>****${booking.bank_last4 || "4821"}</strong></div>
            </div>
        </div>`;
    document.getElementById("tokenModal").classList.add("show");
}

function closeModal() {
    document.getElementById("tokenModal").classList.remove("show");
}

function viewCurrentTokenStatus() {
    closeModal();
    showSection('status');
    if (currentBookingToken) {
        document.getElementById("tokenSearch").value = currentBookingToken;
        searchToken();
    }
}

async function searchToken() {
    const token = document.getElementById("tokenSearch").value.trim().toUpperCase();
    if (!token) {
        alert("Token number enter karein (e.g. KS-260929-001).");
        return;
    }
    const resultBox = document.getElementById("tokenResult");
    resultBox.innerHTML = `<p style="color:#087f5b; margin-top:15px;">⏳ Searching token details...</p>`;

    try {
        const res = await fetch(`${API}/token/${encodeURIComponent(token)}`);
        const result = await res.json();
        if (!res.ok || !result.success) {
            resultBox.innerHTML = `<p style="color:#d9534f; margin-top:15px; font-weight:bold;">❌ Token not found. Kripya token number sahi se check karein.</p>`;
            return;
        }
        renderTokenStatus(result.booking);
    } catch (err) {
        console.error(err);
        resultBox.innerHTML = `<p style="color:#d9534f; margin-top:15px;">❌ Connection error.</p>`;
    }
}

// =====================================
// PAYMENT STATUS & WORKFLOW RENDERER
// =====================================

function renderTokenStatus(booking) {
    const statuses = ["Booked", "Gate Entry", "Quality Check", "Weighment", "J-Form Generated", "DBT Paid"];
    const currentIndex = statuses.indexOf(booking.status);

    const isPaid = booking.status === "DBT Paid" || (booking.dbt && booking.dbt.status === "Paid");
    const dbtAmount = booking.dbt ? booking.dbt.amount : booking.estimated_amount;
    const bankLast4 = booking.bank_last4 || "4821";
    const refNo = (booking.dbt && booking.dbt.ref_no) ? booking.dbt.ref_no : "DBT-2026-984120";

    let html = `
        <div class="token-card">
            <div class="token-number">${booking.token}</div>

            <div class="token-grid">
                <div class="token-item"><span>Farmer Name</span><strong>${booking.farmer_name} (${booking.mobile})</strong></div>
                <div class="token-item"><span>Crop & Quantity</span><strong>${booking.crop_name} - ${booking.quantity} Qtl</strong></div>
                <div class="token-item"><span>Mandi</span><strong>${booking.mandi_name} (${booking.district || ''})</strong></div>
                <div class="token-item"><span>Slot Date</span><strong>${formatDate(booking.date)} (${booking.slot})</strong></div>
            </div>

            <!-- PAYMENT STATUS CARD -->
            <div class="payment-status-card ${isPaid ? 'paid' : 'pending'}">
                <div class="payment-header">
                    <span class="payment-icon">${isPaid ? '💳' : '⏳'}</span>
                    <div>
                        <h3>DBT Payment Status: <span class="status-title">${isPaid ? 'PAID / DISBURSED ✅' : 'PENDING ⏳'}</span></h3>
                        <p>${isPaid ? 'MSP Payment successfully transferred to Aadhaar Bank A/c' : 'Payment will be released after Weighment & J-Form verification'}</p>
                    </div>
                </div>

                <div class="payment-details-grid">
                    <div>
                        <span class="lbl">Amount ${isPaid ? 'Paid' : 'Estimated'}:</span>
                        <strong class="val amount-green">${formatCurrency(dbtAmount)}</strong>
                    </div>
                    <div>
                        <span class="lbl">Bank Account:</span>
                        <strong class="val">Aadhaar Bank A/c (****${bankLast4})</strong>
                    </div>
                    <div>
                        <span class="lbl">DBT Ref No:</span>
                        <strong class="val">${isPaid ? refNo : 'Generated upon payment'}</strong>
                    </div>
                </div>
            </div>

            <!-- TIMELINE -->
            <h4 style="margin-top: 25px; color: #087f5b;">Procurement Stage Timeline:</h4>
            <div class="timeline">
    `;

    statuses.forEach((status, idx) => {
        const active = idx <= currentIndex;
        html += `
            <div class="timeline-item ${active ? "active" : ""}">
                ${active ? "✅" : "⏳"} <strong>${status}</strong>
                ${status === "DBT Paid" ? (isPaid ? ' — <span style="color:#2b8a3e; font-weight:bold;">Direct Benefit Transfer Completed</span>' : ' — Payment Pending') : ''}
            </div>
        `;
    });

    if (currentIndex >= 0 && currentIndex < statuses.length - 1) {
        html += `
            <div class="workflow-action">
                <button class="primary-btn" onclick="advanceStatus('${booking.booking_id}', '${statuses[currentIndex + 1]}')">
                    ▶️ Advance Stage to: ${statuses[currentIndex + 1]}
                </button>
                <small>Demo Note: Click button to test next stage workflow (Quality → Weighment → J-Form → DBT Payout).</small>
            </div>
        `;
    } else if (isPaid) {
        html += `
            <div class="workflow-complete" style="margin-top: 20px; padding: 16px; background: #eaf8f1; border-radius: 10px; color: #167344; font-weight: bold;">
                🎉 Procurement Workflow Complete! ${formatCurrency(dbtAmount)} Direct Benefit Transfer (DBT) has been credited to Aadhaar linked account.
            </div>
        `;
    }

    html += `
            </div>
        </div>
    `;

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
        if (result.booking) {
            renderTokenStatus(result.booking);
            loadDashboard();
        }
    } catch (err) {
        console.error(err);
        alert("Error updating status.");
    }
}

async function loadDashboard() {
    try {
        const res = await fetch(`${API}/dashboard`);
        const data = await res.json();
        document.getElementById("totalBookings").textContent = data.total_bookings || 0;
        document.getElementById("farmers").textContent = data.farmers_benefited || 0;
        document.getElementById("dbt").textContent = formatCurrency(data.dbt_disbursed || 0);
        document.getElementById("activeTokens").textContent = data.active_tokens || 0;
    } catch (err) {
        console.error("loadDashboard error:", err);
    }
}

function calculateMSP() {
    const cropId = document.getElementById("calcCrop").value;
    const qty = Number(document.getElementById("calcQuantity").value);
    const crop = crops.find(c => c.id === cropId);
    if (!crop || !qty || qty <= 0) {
        document.getElementById("calcAmount").textContent = "₹0";
        return;
    }
    document.getElementById("calcAmount").textContent = formatCurrency(crop.msp * qty);
}

function setupVoice() {
    const btn = document.getElementById("voiceBtn");
    if (!btn) return;
    btn.addEventListener("click", () => {
        if (!("speechSynthesis" in window)) {
            alert("Aapke browser me voice playback support nahi hai.");
            return;
        }
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance("किसान सेतु पोर्टल। अपनी फसल मंडी में बेचने के लिए लाइव स्लॉट बुक करें और डिजिटल टोकन प्राप्त करें।");
        utterance.lang = "hi-IN";
        utterance.rate = 0.9;
        window.speechSynthesis.speak(utterance);
    });
}

function showSection(id) {
    document.querySelectorAll(".section").forEach(s => s.classList.remove("active"));
    const targetSection = document.getElementById(id);
    if (targetSection) targetSection.classList.add("active");

    document.querySelectorAll(".navbar button").forEach(btn => {
        if (btn.getAttribute("data-section") === id) {
            btn.classList.add("active");
        } else {
            btn.classList.remove("active");
        }
    });

    if (id === "dashboard") loadDashboard();
}

function formatCurrency(val) {
    return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(val || 0);
}

function formatDate(d) {
    if (!d) return "N/A";
    const dateObj = new Date(d.includes("T") ? d : d + "T00:00:00");
    return isNaN(dateObj.getTime()) ? d : dateObj.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}
