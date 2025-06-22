// Helper to format missing data
function formatValue(val) {
  return val !== null && val !== undefined && val !== "" ? val : "--";
}

// Example data object structure. Replace this with your real Firebase fetch result.
const data = {
  UMBS_5_5: {
    change: "0.27",
    current: "99.05",
    prevClose: "98.95",
    open: "98.78",
    high: "99.05",
    low: "99.05"
  },
  UMBS_6_0: {
    change: "0.28",
    current: "101.04",
    prevClose: "100.96",
    open: "100.76",
    high: "101.04",
    low: "101.04"
  },
  GNMA_5_5: {
    change: "0.42",
    current: "99.33",
    prevClose: "99.19",
    open: "98.91",
    high: "99.33",
    low: "99.33"
  },
  GNMA_6_0: {
    change: null,
    current: null,
    prevClose: null,
    open: null,
    high: null,
    low: null
  },
  UMBS_5_5_Shadow: {
    change: "0.27",
    current: "99.05",
    prevClose: "98.95",
    open: "98.78",
    high: "99.05",
    low: "99.05"
  },
  UMBS_6_0_Shadow: {
    change: "0.28",
    current: "101.04",
    prevClose: "100.96",
    open: "100.76",
    high: "101.04",
    low: "101.04"
  },
  GNMA_5_5_Shadow: {
    change: "0.42",
    current: "99.33",
    prevClose: "99.19",
    open: "98.91",
    high: "99.33",
    low: "99.33"
  },
  GNMA_6_0_Shadow: {
    change: "-0.00",
    current: "99.38",
    prevClose: null,
    open: "99.38",
    high: "99.38",
    low: "99.38"
  }
};

const bondKeys = [
  "UMBS_5_5", "UMBS_6_0", "GNMA_5_5", "GNMA_6_0",
  "UMBS_5_5_Shadow", "UMBS_6_0_Shadow", "GNMA_5_5_Shadow", "GNMA_6_0_Shadow"
];

bondKeys.forEach((key) => {
  document.getElementById(`${key}_change`).textContent = formatValue(data[key]?.change);
  document.getElementById(`${key}_current`).textContent = formatValue(data[key]?.current);
  document.getElementById(`${key}_prevClose`).textContent = formatValue(data[key]?.prevClose);
  document.getElementById(`${key}_open`).textContent = formatValue(data[key]?.open);
  document.getElementById(`${key}_high`).textContent = formatValue(data[key]?.high);
  document.getElementById(`${key}_low`).textContent = formatValue(data[key]?.low);
});
