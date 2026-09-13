const API = "/api";

let crops = [];
let mandis = [];


// =====================================
// INITIAL LOAD
// =====================================

document.addEventListener("DOMContentLoaded", async () => {

    setMinimumDate();

    await loadMandis();
    await loadCrops();

    setupEvents();

    loadDashboard();

});


// =====================================
// DATE
// =====================================

function setMinimumDate() {

    const input = document.getElementById("booking_date");

    const today = new Date();

    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");

    const todayString = `${year}-${month}-${day}`;

    input.min = todayString;

    input.value = todayString;
}


// =====================================
// MANDI
// =====================================

async function loadMandis() {

    try {

        const response = await fetch(`${API}/mandis`);

        const result = await response.json();

        if (!response.ok || !result.success) {
            throw new Error(result.message || "Mandi API error");
        }

        mandis = Array.isArray(result.mandis) ? result.mandis : [];

        const select = document.getElementById("mandi");

        select.innerHTML = `
            <option value="">Select Purchase Mandi</option>
        `;

        mandis.forEach(mandi => {

            const option = document.createElement("option");

            option.value = mandi.id;

            option.textContent =
                `${mandi.name} - ${mandi.district}`;

            select.appendChild(option);

        });

    } catch (error) {

        console.error(error);

        alert("Mandi data load nahi ho saka.");

    }

}


// =====================================
// CROPS
// =====================================

async function loadCrops() {

    try {

        const response = await fetch(`${API}/crops`);

        const result = await response.json();

        if (!response.ok || !result.success) {
            throw new Error(result.message || "Crop API error");
        }

        crops = Array.isArray(result.crops) ? result.crops : [];

        const select = document.getElementById("crop");

        const calcSelect =
            document.getElementById("calcCrop");

        select.innerHTML = `
            <option value="">Select Fasal</option>
        `;

        calcSelect.innerHTML = `
            <option value="">Select Crop</option>
        `;

        crops.forEach(crop => {

            const option =
                document.createElement("option");

            option.value = crop.id;

            option.textContent =
                `${crop.name} (${crop.name_hi})`;

            select.appendChild(option);


            const calcOption =
                document.createElement("option");

            calcOption.value = crop.id;

            calcOption.textContent =
                `${crop.name} - ₹${crop.msp}/Qtl`;

            calcSelect.appendChild(calcOption);

        });

    } catch (error) {

        console.error(error);

        alert("Crop data load nahi ho saka.");

    }

}


// =====================================
// EVENTS
// =====================================

function setupEvents() {

    document
        .getElementById("crop")
        .addEventListener(
            "change",
            calculateBookingAmount
        );


    document
        .getElementById("quantity")
        .addEventListener(
            "input",
            calculateBookingAmount
        );


    document
        .getElementById("mandi")
        .addEventListener(
            "change",
            loadSlots
        );


    document
        .getElementById("booking_date")
        .addEventListener(
            "change",
            loadSlots
        );


    document
        .getElementById("calcCrop")
        .addEventListener(
            "change",
            calculateMSP
        );


    document
        .getElementById("calcQuantity")
        .addEventListener(
            "input",
            calculateMSP
        );


    document
        .getElementById("bookingForm")
        .addEventListener(
            "submit",
            submitBooking
        );

}


// =====================================
// CALCULATE BOOKING AMOUNT
// =====================================

function calculateBookingAmount() {

    const cropId =
        document.getElementById("crop").value;

    const quantity =
        Number(document.getElementById("quantity").value);

    const crop =
        crops.find(c => c.id === cropId);

    if (!crop || !quantity) {

        document.getElementById("amount")
            .textContent = "₹ 0";

        document.getElementById("mspText")
            .textContent =
            "Select crop to calculate MSP";

        return;
    }

    const amount =
        quantity * crop.msp;

    document.getElementById("amount")
        .textContent =
        formatCurrency(amount);

    document.getElementById("mspText")
        .textContent =
        `${quantity} Qtl × ₹${crop.msp.toLocaleString("en-IN")} per Quintal`;

}


// =====================================
// SLOTS
// =====================================

async function loadSlots() {

    const mandi =
        document.getElementById("mandi").value;

    const date =
        document.getElementById("booking_date").value;

    const slotSelect =
        document.getElementById("slot");


    if (!mandi || !date) {

        slotSelect.innerHTML = `
            <option value="">
            Select Date & Mandi First
            </option>
        `;

        return;
    }


    try {

        const response =
            await fetch(
                `${API}/slots?mandi=${mandi}&date=${date}`
            );

        const result =
            await response.json();

        if (!response.ok || !result.success) {
            throw new Error(result.message || "Slot API error");
        }

        const slots =
            Array.isArray(result.slots) ? result.slots : [];


        slotSelect.innerHTML = `
            <option value="">
            Select Time Slot
            </option>
        `;


        slots.forEach(item => {

            const option =
                document.createElement("option");

            option.value = item.slot;


            if (!item.is_available) {

                option.disabled = true;

                option.textContent =
                    `${item.slot} - FULL`;

            } else {

                option.textContent =
                    `${item.slot} - ${item.available} slots available`;

            }

            slotSelect.appendChild(option);

        });

    } catch (error) {

        console.error(error);

    }

}


// =====================================
// SUBMIT BOOKING
// =====================================

async function submitBooking(event) {

    event.preventDefault();


    const data = {

        farmer_name:
            document.getElementById("farmer_name").value,

        mobile:
            document.getElementById("mobile").value,

        kisan_id:
            document.getElementById("kisan_id").value,

        mandi_id:
            document.getElementById("mandi").value,

        crop_id:
            document.getElementById("crop").value,

        quantity:
            document.getElementById("quantity").value,

        village:
            document.getElementById("village").value,

        vehicle_type:
            document.getElementById("vehicle_type").value,

        vehicle_number:
            document.getElementById("vehicle_number").value,

        date:
            document.getElementById("booking_date").value,

        slot:
            document.getElementById("slot").value,

        bank_last4:
            document.getElementById("bank_last4").value

    };


    if (!/^[0-9]{10}$/.test(data.mobile)) {

        alert("Please enter valid 10 digit mobile number.");

        return;

    }


    if (!data.mandi_id) {

        alert("Please select Purchase Mandi.");

        return;

    }


    if (!data.crop_id) {

        alert("Please select Fasal.");

        return;

    }


    if (!data.slot) {

        alert("Please select a time slot.");

        return;

    }


    try {

        const response =
            await fetch(`${API}/bookings`, {

                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify(data)

            });


        const result =
            await response.json();


        if (!response.ok) {

            alert(result.message);

            return;

        }


        showToken(result.booking);

        document
            .getElementById("bookingForm")
            .reset();

        setMinimumDate();

        calculateBookingAmount();

        loadDashboard();

    } catch (error) {

        console.error(error);

        alert(
            "Server se connection nahi ho raha."
        );

    }

}


// =====================================
// TOKEN MODAL
// =====================================

function showToken(booking) {

    const details = document
        .getElementById("tokenDetails");


    details.innerHTML = `

        <div class="token-card">

            <div class="token-number">
                ${booking.token}
            </div>

            <div class="token-grid">

                <div class="token-item">
                    <span>Farmer</span>
                    <strong>${booking.farmer_name}</strong>
                </div>

                <div class="token-item">
                    <span>Crop</span>
                    <strong>${booking.crop_name}</strong>
                </div>

                <div class="token-item">
                    <span>Quantity</span>
                    <strong>${booking.quantity} Quintals</strong>
                </div>

                <div class="token-item">
                    <span>Mandi</span>
                    <strong>${booking.mandi_name}</strong>
                </div>

                <div class="token-item">
                    <span>Date</span>
                    <strong>${formatDate(booking.date)}</strong>
                </div>

                <div class="token-item">
                    <span>Time Slot</span>
                    <strong>${booking.slot}</strong>
                </div>

            </div>

        </div>

    `;


    document
        .getElementById("tokenModal")
        .classList.add("show");

}


function closeModal() {

    document
        .getElementById("tokenModal")
        .classList.remove("show");

}


// =====================================
// TOKEN SEARCH
// =====================================

async function searchToken() {

    const token =
        document
            .getElementById("tokenSearch")
            .value
            .trim()
            .toUpperCase();


    if (!token) {

        alert("Token number enter karein.");

        return;

    }


    try {

        const response =
            await fetch(
                `${API}/token/${token}`
            );


        const result =
            await response.json();


        if (!response.ok) {

            document
                .getElementById("tokenResult")
                .innerHTML =
                `<p style="margin-top:20px">
                    ❌ Token not found
                </p>`;

            return;

        }


        renderTokenStatus(
            result.booking
        );

    } catch (error) {

        console.error(error);

    }

}


// =====================================
// STATUS UI
// =====================================

function renderTokenStatus(booking) {

    const statuses = [

        "Booked",
        "Gate Entry",
        "Quality Check",
        "Weighment",
        "J-Form Generated",
        "DBT Paid"

    ];


    const currentIndex =
        statuses.indexOf(booking.status);


    let html = `

        <div class="token-card">

            <div class="token-number">
                ${booking.token}
            </div>

            <div class="token-grid">

                <div class="token-item">
                    <span>Farmer</span>
                    <strong>${booking.farmer_name}</strong>
                </div>

                <div class="token-item">
                    <span>Crop</span>
                    <strong>${booking.crop_name}</strong>
                </div>

                <div class="token-item">
                    <span>Quantity</span>
                    <strong>${booking.quantity} Quintals</strong>
                </div>

                <div class="token-item">
                    <span>Mandi</span>
                    <strong>${booking.mandi_name}</strong>
                </div>

                <div class="token-item">
                    <span>Estimated/Payable</span>
                    <strong>
                        ${formatCurrency(
                            booking.dbt.amount
                        )}
                    </strong>
                </div>

                <div class="token-item">
                    <span>Current Status</span>
                    <strong>
                        ${booking.status}
                    </strong>
                </div>

            </div>


            <div class="timeline">

    `;


    statuses.forEach((status, index) => {

        const active =
            index <= currentIndex;

        html += `

            <div class="timeline-item
                ${active ? "active" : ""}">

                ${active ? "✅" : "⏳"}

                <strong>
                    ${status}
                </strong>

                ${
                    status === "DBT Paid"
                    ? (
                        booking.dbt.status === "Paid"
                        ? " — Payment Completed"
                        : " — Payment Pending"
                    )
                    : ""
                }

            </div>

        `;

    });


    html += `

            </div>

        </div>

    `;


    document
        .getElementById("tokenResult")
        .innerHTML = html;

}


// =====================================
// DASHBOARD
// =====================================

async function loadDashboard() {

    try {

        const response =
            await fetch(
                `${API}/dashboard`
            );

        const data =
            await response.json();


        document
            .getElementById("totalBookings")
            .textContent =
            data.total_bookings;


        document
            .getElementById("farmers")
            .textContent =
            data.farmers_benefited;


        document
            .getElementById("dbt")
            .textContent =
            formatCurrency(
                data.dbt_disbursed
            );


        document
            .getElementById("activeTokens")
            .textContent =
            data.active_tokens;

    } catch (error) {

        console.error(error);

    }

}


// =====================================
// MSP CALCULATOR
// =====================================

function calculateMSP() {

    const cropId =
        document
            .getElementById("calcCrop")
            .value;

    const quantity =
        Number(
            document
                .getElementById("calcQuantity")
                .value
        );


    const crop =
        crops.find(
            c => c.id === cropId
        );


    if (!crop || !quantity) {

        document
            .getElementById("calcAmount")
            .textContent =
            "₹0";

        return;

    }


    const amount =
        crop.msp * quantity;


    document
        .getElementById("calcAmount")
        .textContent =
        formatCurrency(amount);

}


// =====================================
// SECTION
// =====================================

function showSection(sectionId) {

    document
        .querySelectorAll(".section")
        .forEach(section => {

            section.classList.remove(
                "active"
            );

        });


    document
        .getElementById(sectionId)
        .classList.add("active");


    if (sectionId === "dashboard") {

        loadDashboard();

    }

}


// =====================================
// HELPERS
// =====================================

function formatCurrency(value) {

    return new Intl.NumberFormat(
        "en-IN",
        {
            style: "currency",
            currency: "INR",
            maximumFractionDigits: 0
        }
    ).format(value);

}


function formatDate(dateString) {

    const date =
        new Date(dateString + "T00:00:00");

    return date.toLocaleDateString(
        "en-IN",
        {
            day: "2-digit",
            month: "short",
            year: "numeric"
        }
    );

}