console.log("✅ script.js is loaded");
async function updateTopDashboard() {
  try {
    const response = await fetch('/.netlify/functions/getTopDashboardData');
    const data = await response.json();

    // --- Update UMBS 5.5 ---
    document.getElementById("umbs-current").textContent = data.umbs_5_5.current;
    document.getElementById("umbs-change").textContent = data.umbs_5_5.daily_change || "N/A";
    document.getElementById("umbs-timestamp").textContent = data.umbs_5_5.last_updated;

    const umbsBox = document.getElementById("umbs-box");
    if (parseFloat(data.umbs_5_5.daily_change) > 0) {
      umbsBox.style.backgroundColor = "red";
    } else if (parseFloat(data.umbs_5_5.daily_change) < 0) {
      umbsBox.style.backgroundColor = "green";
    } else {
      umbsBox.style.backgroundColor = "gray";
    }

    // --- Shadow 5.5 ---
    document.getElementById("shadow-current").textContent = data.shadow_5_5.current;
    document.getElementById("shadow-change").textContent = data.shadow_5_5.daily_change || "N/A";
    const shadowBox = document.getElementById("shadow-box");
    if (parseFloat(data.shadow_5_5.daily_change) > 0) {
      shadowBox.style.backgroundColor = "red";
    } else if (parseFloat(data.shadow_5_5.daily_change) < 0) {
      shadowBox.style.backgroundColor = "green";
    } else {
      shadowBox.style.backgroundColor = "gray";
    }

    // --- US10Y ---
    document.getElementById("us10y-current").textContent = data.us10y.current;
    const us10yBox = document.getElementById("us10y-box");
    if (parseFloat(data.us10y.daily_change) > 0) {
      us10yBox.style.backgroundColor = "red";
    } else if (parseFloat(data.us10y.daily_change) < 0) {
      us10yBox.style.backgroundColor = "green";
    } else {
      us10yBox.style.backgroundColor = "gray";
    }

    // --- US30Y ---
    document.getElementById("us30y-current").textContent = data.us30y.current;
    const us30yBox = document.getElementById("us30y-box");
    if (parseFloat(data.us30y.current) > parseFloat(data.us10y.current)) {
      us30yBox.style.backgroundColor = "red";
    } else if (parseFloat(data.us30y.current) < parseFloat(data.us10y.current)) {
      us30yBox.style.backgroundColor = "green";
    } else {
      us30yBox.style.backgroundColor = "gray";
    }

  } catch (err) {
    console.error("Error updating dashboard:", err);
  }
}

updateTopDashboard();
