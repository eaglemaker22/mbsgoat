// public/script.js

// Helper to format missing data
function formatValue(val) {
  return val !== null && val !== undefined && val !== "" ? val : "--";
}

// After page loads, fetch bond data and update display
document.addEventListener("DOMContentLoaded", async () => {
  try {
    // === TOP DASHBOARD DATA ===
    const resTop = await fetch("/.netlify/functions/getTopDashboardData");
    const dataTop = await resTop.json();

    if (dataTop?.UMBS_5_5 && dataTop?.US10Y) {
      const umbsChange = dataTop.UMBS_5_5.change || "N/A";
      const umbsCurrent = dataTop.UMBS_5_5.current || "N/A";
      const us10yChange = dataTop.US10Y.change || "N/A";
      const us10yYield = dataTop.US10Y.yield || "N/A";

      // Update top ticker values
      document.querySelectorAll(".grid.grid-cols-3 > div")[0].innerHTML = `
        <div class="text-xs">UMBS 5.5</div>
        <div class="text-sm">${umbsChange} | ${umbsCurrent}</div>
      `;
      document.querySelectorAll(".grid.grid-cols-3 > div")[1].innerHTML = `
        <div class="text-xs">US10Y</div>
        <div class="text-sm">${us10yChange} | ${us10yYield}</div>
      `;

      // Update timestamp
      const timestampEl = document.querySelector(".text-right.text-xs.text-gray-400.mb-2");
      const rawTime = dataTop.UMBS_5_5.last_updated;
      if (rawTime && timestampEl) {
        const dateObj = new Date(rawTime.replace(" ", "T"));
        const timeString = dateObj.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
        const dateString = dateObj.toLocaleDateString();
        timestampEl.textContent = `${timeString} ${dateString}`;
      }
    }

    // === FULL BOND TABLE DATA ===
    const resAll = await fetch("/.netlify/functions/getAllBondData");
    const dataAll = await resAll.json();

    const bondKeys = [
      "UMBS_5_5", "UMBS_6_0", "GNMA_5_5", "GNMA_6_0",
      "UMBS_5_5_Shadow", "UMBS_6_0_Shadow", "GNMA_5_5_Shadow", "GNMA_6_0_Shadow"
    ];

    bondKeys.forEach((key) => {
      const bond = dataAll[key] || {};

      // Change with color + arrow
      const changeEl = document.getElementById(`${key}_change`);
      const changeVal = formatValue(bond.change);

      if (changeEl) {
        changeEl.textContent = changeVal;

        changeEl.classList.remove("text-green-500", "text-red-500");

        if (bond.change?.startsWith("-")) {
          changeEl.classList.add("text-red-500");
          changeEl.textContent = `↓ ${changeVal}`;
        } else if (bond.change !== null && bond.change !== undefined && bond.change !== "") {
          changeEl.classList.add("text-green-500");
          changeEl.textContent = `↑ ${changeVal}`;
        }
      }

      // Other bond values
      document.getElementById(`${key}_current`).textContent = formatValue(bond.current);
      document.getElementById(`${key}_prevClose`).textContent = formatValue(bond.prevClose);
      document.getElementById(`${key}_open`).textContent = formatValue(bond.open);
      document.getElementById(`${key}_high`).textContent = formatValue(bond.high);
      document.getElementById(`${key}_low`).textContent = formatValue(bond.low);
    });

  } catch (err) {
    console.error("Dashboard fetch error:", err);
  }
});
