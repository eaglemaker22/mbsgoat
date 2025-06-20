// public/script.js
document.addEventListener("DOMContentLoaded", async () => {
  try {
    const res = await fetch("/.netlify/functions/getTopDashboardData");
    const data = await res.json();

    if (!data || !data.UMBS_5_5 || !data.US10Y) return;

    // === TOP TICKERS ===
    const umbsChange = data.UMBS_5_5.change || "N/A";
    const umbsCurrent = data.UMBS_5_5.current || "N/A";
    const us10yChange = data.US10Y.change || "N/A";
    const us10yYield = data.US10Y.yield || "N/A";

    // Replace hardcoded values in ticker section
    document.querySelectorAll(".grid.grid-cols-3 > div")[0].innerHTML = `
      <div class="text-xs">UMBS 5.5</div>
      <div class="text-sm">${umbsChange} | ${umbsCurrent}</div>
    `;
    document.querySelectorAll(".grid.grid-cols-3 > div")[1].innerHTML = `
      <div class="text-xs">US10Y</div>
      <div class="text-sm">${us10yChange} | ${us10yYield}</div>
    `;

    // === TIMESTAMP ===
    const timestampEl = document.querySelector(".text-right.text-xs.text-gray-400.mb-2");
    const rawTime = data.UMBS_5_5.last_updated;
    if (rawTime && timestampEl) {
      const dateObj = new Date(rawTime.replace(" ", "T"));
      const timeString = dateObj.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
      const dateString = dateObj.toLocaleDateString();
      timestampEl.textContent = `${timeString} ${dateString}`;
    }

  } catch (err) {
    console.error("Dashboard fetch error:", err);
  }
});
