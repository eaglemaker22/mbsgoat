// --- Helper Functions ---
function updateTextElement(elementId, value) {
  const element = document.getElementById(elementId);
  if (element) {
    element.textContent = value;
  }
}

function updateChangeIndicator(valueElementId, changeElementId, value, change, isInverted = false) {
  updateTextElement(valueElementId, formatValue(value));

  const changeElement = document.getElementById(changeElementId);
  const parentHeaderItem = changeElement ? changeElement.closest('.header-item') : null;

  if (changeElement) {
    let formattedChange = formatValue(change);
    changeElement.classList.remove('positive', 'negative');
    if (parentHeaderItem) {
      parentHeaderItem.classList.remove('positive-bg', 'negative-bg', 'neutral-bg');
    }

    let isPositiveChange = false;
    let isNegativeChange = false;

    const numericChange = parseFloat(change);
    if (!isNaN(numericChange)) {
      if (numericChange > 0) {
        formattedChange = `+${numericChange}`;
        isPositiveChange = true;
      } else if (numericChange < 0) {
        formattedChange = `${numericChange}`;
        isNegativeChange = true;
      }
    }

    if (isInverted) {
      if (isPositiveChange) {
        changeElement.classList.add('negative');
        if (parentHeaderItem) parentHeaderItem.classList.add('negative-bg');
      } else if (isNegativeChange) {
        changeElement.classList.add('positive');
        if (parentHeaderItem) parentHeaderItem.classList.add('positive-bg');
      } else {
        if (parentHeaderItem) parentHeaderItem.classList.add('neutral-bg');
      }
    } else {
      if (isPositiveChange) {
        changeElement.classList.add('positive');
        if (parentHeaderItem) parentHeaderItem.classList.add('positive-bg');
      } else if (isNegativeChange) {
        changeElement.classList.add('negative');
        if (parentHeaderItem) parentHeaderItem.classList.add('negative-bg');
      } else {
        if (parentHeaderItem) parentHeaderItem.classList.add('neutral-bg');
      }
    }

    changeElement.textContent = formattedChange;
  }
}

function formatValue(val) {
  const num = parseFloat(val);
  if (!isNaN(num)) {
    return num.toFixed(3);
  }
  return val !== null && val !== undefined && val !== "" ? val : "--";
}

function formatPercentage(val) {
  const formatted = formatValue(val);
  return formatted !== '--' ? `${formatted}%` : '--';
}

// --- Market Data ---
async function fetchAndUpdateMarketData() {
  console.log("Fetching market data...");
  try {
    const res = await fetch("/.netlify/functions/getTopDashboardData");
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    const data = await res.json();

    if (data?.US10Y) {
      const y = parseFloat(data.US10Y.yield);
      const c = parseFloat(data.US10Y.change);
      updateChangeIndicator('us10yValue', 'us10yChange', isNaN(y) ? "--" : y.toFixed(3), isNaN(c) ? "--" : c.toFixed(3), true);
      updateTextElement('us10yTableCurrent', formatValue(data.US10Y.yield));
      updateTextElement('us10yTableChange', formatValue(data.US10Y.change));
      updateTextElement('us10yTableUpdated', data.US10Y.last_updated ?? '--');
    }

    if (data?.US30Y) {
      const y = parseFloat(data.US30Y.yield);
      const c = parseFloat(data.US30Y.change);
      updateChangeIndicator('us30yValue', 'us30yChange', isNaN(y) ? "--" : y.toFixed(3), isNaN(c) ? "--" : c.toFixed(3), true);
    }

    if (data?.UMBS_5_5) {
      const v = parseFloat(data.UMBS_5_5.current);
      const c = parseFloat(data.UMBS_5_5.change);
      updateChangeIndicator('umbs55Value', 'umbs55Change', isNaN(v) ? "--" : v.toFixed(3), isNaN(c) ? "--" : c.toFixed(3));
    }

    if (data?.GNMA_5_5) {
      const v = parseFloat(data.GNMA_5_5.current);
      const c = parseFloat(data.GNMA_5_5.change);
      updateChangeIndicator('gnma55Value', 'gnma55Change', isNaN(v) ? "--" : v.toFixed(3), isNaN(c) ? "--" : c.toFixed(3));
    }

    if (data?.UMBS_6_0) {
      updateChangeIndicator('umbs60Value', 'umbs60Change', data.UMBS_6_0.current, data.UMBS_6_0.change);
    }

    if (data?.GNMA_6_0) {
      updateChangeIndicator('gnma60Value', 'gnma60Change', data.GNMA_6_0.current, data.GNMA_6_0.change);
    }

    if (data?.UMBS_5_5_Shadow) {
      updateChangeIndicator('shadowUMBS55Value', 'shadowUMBS55Change', data.UMBS_5_5_Shadow.current, data.UMBS_5_5_Shadow.change);
    }

    if (data?.GNMA_5_5_Shadow) {
      updateChangeIndicator('shadowGNMA55Value', 'shadowGNMA55Change', data.GNMA_5_5_Shadow.current, data.GNMA_5_5_Shadow.change);
    }

    if (data?.UMBS_6_0_Shadow) {
      updateChangeIndicator('shadowUMBS60Value', 'shadowUMBS60Change', data.UMBS_6_0_Shadow.current, data.UMBS_6_0_Shadow.change);
    }

    if (data?.GNMA_6_0_Shadow) {
      updateChangeIndicator('shadowGNMA60Value', 'shadowGNMA60Change', data.GNMA_6_0_Shadow.current, data.GNMA_6_0_Shadow.change);
    }
  } catch (err) {
    console.error("Market data fetch error:", err);
  }
}

// --- Initialization ---
window.addEventListener('DOMContentLoaded', () => {
  fetchAndUpdateMarketData();
  fetchAndUpdateDailyRates();
  fetchAndUpdateLiveStockData();
  fetchAndUpdateEconomicIndicators();
});

// --- Daily Rates ---
async function fetchAndUpdateDailyRates() {
  try {
    const res = await fetch("/.netlify/functions/getDailyRatesData");
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    const data = await res.json();

    function updateRateRow(prefix, rateData) {
      if (!rateData) return;

      updateTextElement(`${prefix}Current`, formatPercentage(rateData.latest));
      updateTextElement(`${prefix}Yesterday`, formatPercentage(rateData.yesterday));
      updateTextElement(`${prefix}LastMonth`, formatPercentage(rateData.last_month));
      updateTextElement(`${prefix}YearAgo`, formatPercentage(rateData.year_ago));

      let changeVs1M = null;
      let changeVs1Y = null;
      const latest = parseFloat(rateData.latest);
      const lastMonth = parseFloat(rateData.last_month);
      const yearAgo = parseFloat(rateData.year_ago);

      if (!isNaN(latest) && !isNaN(lastMonth)) {
        changeVs1M = (latest - lastMonth).toFixed(3);
      }
      if (!isNaN(latest) && !isNaN(yearAgo)) {
        changeVs1Y = (latest - yearAgo).toFixed(3);
      }

      updateTextElement(`${prefix}ChangeVs1M`, changeVs1M !== null ? `${changeVs1M}%` : "--");
      updateTextElement(`${prefix}ChangeVs1Y`, changeVs1Y !== null ? `${changeVs1Y}%` : "--");
    }

    updateRateRow("fixed30y", data.fixed30Y);
    updateRateRow("fixed15y", data.fixed15Y);
    updateRateRow("va30y", data.va30Y);
    updateRateRow("fha30y", data.fha30Y);
    updateRateRow("jumbo30y", data.jumbo30y);
    updateRateRow("usda30y", data.usda30y);
  } catch (err) {
    console.error("Daily Rates fetch error:", err);
  }
}

// --- Live Stock Data ---
async function fetchAndUpdateLiveStockData() {
  try {
    const res = await fetch("/.netlify/functions/getLiveStockData");
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    const data = await res.json();

    function updateStockChange(id, item) {
      const el = document.getElementById(id);
      if (!el) return;

      el.textContent = '';
      el.classList.remove('positive', 'negative');

      if (item && item.percentChange !== undefined) {
        const n = parseFloat(item.percentChange);
        if (!isNaN(n)) {
          const t = n.toFixed(2);
          if (n > 0) {
            el.textContent = `+${t}%`;
            el.classList.add('positive');
          } else if (n < 0) {
            el.textContent = `${t}%`;
            el.classList.add('negative');
          } else {
            el.textContent = '0.00%';
          }
        }
      } else {
        el.textContent = '--';
      }
    }

    updateStockChange('spyChange', data.SPY);
    updateStockChange('qqqChange', data.QQQ);
    updateStockChange('diaChange', data.DIA);
  } catch (err) {
    console.error("Stock data fetch error:", err);
  }
}

// --- Economic Indicators ---
async function fetchAndUpdateEconomicIndicators() {
  try {
    const res = await fetch("/.netlify/functions/getEconomicIndicatorsData");
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    const data = await res.json();

    const rows = {
      HOUST: "houst",
      PERMIT1: "permit1",
      HOUST1F: "houst1f",
      RSXFS: "rsxfs",
      UMCSENT: "umcsent",
      CSUSHPINSA: "csushpinsa",
      PERMIT: "permit",
      T10YIE: "t10yie",
      T10Y2Y: "t10y2y"
    };

    Object.entries(rows).forEach(([seriesId, prefix]) => {
      const d = data[seriesId];
      if (!d) return;
      updateTextElement(`${prefix}Latest`, formatValue(d.latest));
      updateTextElement(`${prefix}Date`, formatValue(d.latest_date));
      updateTextElement(`${prefix}LastMonth`, formatValue(d.last_month));
      updateTextElement(`${prefix}YearAgo`, formatValue(d.year_ago));
      updateTextElement(`${prefix}NextRelease`, formatValue(d.next_release));
      updateTextElement(`${prefix}CoveragePeriod`, formatValue(d.coverage_period));
    });
  } catch (err) {
    console.error("Economic Indicators fetch error:", err);
  }
}
