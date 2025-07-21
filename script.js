// --- Helper Functions ---
function updateTextElement(elementId, value) {
  const element = document.getElementById(elementId);
  if (element) {
    // Check if the value is actually changing before applying highlight
    if (element.textContent !== String(value)) { // Convert value to string for comparison
      // Remove the class first to reset the animation
      element.classList.remove('highlight-on-update');
      // Trigger reflow to restart the animation
      void element.offsetWidth; // This forces a reflow
      // Add the class back
      element.classList.add('highlight-on-update');
    }
    element.textContent = value;
    console.log(`DEBUG (updateTextElement): Updated element '${elementId}' with value: '${value}'`);
  } else {
    console.warn(`DEBUG (updateTextElement): Element with ID '${elementId}' NOT FOUND!`);
  }
}

// Function to update a value and apply color based on a separate change value
// Used for: US10Y/US30Y Yields, 30Y/15Y Fixed Rates (top snapshot)
function updateValueWithColorBasedOnChange(valueElementId, changeValue, isInverted = false) {
  const valueElement = document.getElementById(valueElementId);
  if (!valueElement) {
    console.warn(`DEBUG (updateValueWithColorBasedOnChange): Value element with ID '${valueElementId}' NOT FOUND!`);
    return;
  }

  const numericChange = parseFloat(changeValue);

  // Determine positive/negative flags
  let isPositiveChange = false;
  let isNegativeChange = false;
  if (!isNaN(numericChange)) {
    if (isInverted) {
      isPositiveChange = numericChange < 0; // Inverted: negative change is "positive"
      isNegativeChange = numericChange > 0; // Inverted: positive change is "negative"
    } else {
      isPositiveChange = numericChange > 0;
      isNegativeChange = numericChange < 0;
    }
  }

  // Remove existing color classes
  valueElement.classList.remove('positive', 'negative', 'neutral');

  // Apply new color class
  if (isPositiveChange) {
    valueElement.classList.add('positive');
  } else if (isNegativeChange) {
    valueElement.classList.add('negative');
  } else {
    valueElement.classList.add('neutral'); // For zero or non-numeric changes
  }

  // The actual value text is updated by updateTextElement, which also handles highlight
  // This function only handles the color based on change.
  // The value itself should be updated by a separate call to updateTextElement
  // before or after calling this function.
  console.log(`DEBUG (updateValueWithColorBasedOnChange): Applied color to '${valueElementId}' based on change: '${changeValue}' (Positive: ${isPositiveChange}, Negative: ${isNegativeChange})`);
}

// MODIFIED: Corrected logic for value update and color application
function updateChangeIndicator(valueElementId, changeElementId, value, change, isInverted = false) {
  // Ensure the main value is updated and triggers highlight
  updateTextElement(valueElementId, formatValue(value));

  const changeElement = document.getElementById(changeElementId);
  const parentHeaderItem = changeElement ? changeElement.closest('.header-item') : null;

  if (changeElement) {
    let formattedChange = formatValue(change);
    const numericChange = parseFloat(change);

    // Determine positive/negative flags BEFORE applying classes
    let isPositiveChange = false;
    let isNegativeChange = false;
    if (!isNaN(numericChange)) {
      if (isInverted) {
        isPositiveChange = numericChange < 0; // Inverted: negative change is "positive"
        isNegativeChange = numericChange > 0; // Inverted: positive change is "negative"
      } else {
        isPositiveChange = numericChange > 0;
        isNegativeChange = numericChange < 0;
      }
    }

    // Remove existing color classes
    changeElement.classList.remove('positive', 'negative');
    if (parentHeaderItem) {
      parentHeaderItem.classList.remove('positive-bg', 'negative-bg', 'neutral-bg'); // Reset all background classes
    }

    // Apply new color class and update formattedChange
    if (isPositiveChange) {
      changeElement.classList.add('positive');
      if (parentHeaderItem) parentHeaderItem.classList.add('positive-bg');
      formattedChange = `+${formattedChange}`; // Add '+' sign for positive changes
    } else if (isNegativeChange) {
      changeElement.classList.add('negative');
      if (parentHeaderItem) parentHeaderItem.classList.add('negative-bg');
    } else {
      // If change is 0 or NaN, apply neutral background if a parent header item exists
      if (parentHeaderItem) {
        parentHeaderItem.classList.add('neutral-bg');
      }
    }

    changeElement.textContent = formattedChange;
    console.log(`DEBUG (updateChangeIndicator): Updated change element '${changeElementId}' with value: '${formattedChange}'`);
  } else {
    console.warn(`DEBUG (updateChangeIndicator): Change element with ID '${changeElementId}' NOT FOUND!`);
  }
}


function formatValue(value) {
  if (value === null || value === undefined || value === '') {
    return '--';
  }
  const num = parseFloat(value);
  if (isNaN(num)) {
    return '--';
  }
  // Determine if it's a bond price (usually 2 decimal places) or yield (3 decimal places)
  // This is a heuristic; a more robust solution might pass a type hint
  if (value.toString().includes('.') && value.toString().split('.')[1].length > 2) {
    return num.toFixed(3); // Likely a yield
  }
  return num.toFixed(2); // Likely a price or general number
}

function formatTimestamp(timestamp) {
  if (!timestamp) {
    return '--';
  }
  try {
    // Assuming timestamp is in "YYYY-MM-DD HH:MM:SS" format
    const [datePart, timePart] = timestamp.split(' ');
    const [hours, minutes, seconds] = timePart.split(':');
    return `${hours}:${minutes}:${seconds}`;
  } catch (e) {
    console.error("Error formatting timestamp:", timestamp, e);
    return '--';
  }
}


// --- Fetch Functions ---

async function fetchAndUpdateMarketData() {
  try {
    const response = await fetch('/.netlify/functions/getMarketData');
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    console.log("DEBUG (fetchAndUpdateMarketData): Fetched market data:", data); // Log fetched data

    // Update MBS
    updateTextElement('umbs55Value', formatValue(data.UMBS_5_5.current));
    updateChangeIndicator('umbs55Value', 'umbs55Change', data.UMBS_5_5.current, data.UMBS_5_5.change);

    updateTextElement('umbs60Value', formatValue(data.UMBS_6_0.current));
    updateChangeIndicator('umbs60Value', 'umbs60Change', data.UMBS_6_0.current, data.UMBS_6_0.change);

    // Update Treasuries
    updateTextElement('us10yValue', formatValue(data.US10Y.current));
    updateChangeIndicator('us10yValue', 'us10yChange', data.US10Y.current, data.US10Y.change, true); // Inverted for yield

    updateTextElement('us30yValue', formatValue(data.US30Y.current));
    updateChangeIndicator('us30yValue', 'us30yChange', data.US30Y.current, data.US30Y.change, true); // Inverted for yield

    // Update Rates
    // For rates, "Today" refers to the daily change, "Yesterday" refers to the current rate.
    // The HTML has "Today" and "Yesterday" columns.
    // The "Today" column for rates should display the daily_change
    // The "Yesterday" column for rates should display the current rate (which was yesterday's close for the change calculation)
    updateTextElement('fixed30yToday', formatValue(data.fixed30Y.daily_change));
    updateValueWithColorBasedOnChange('fixed30yToday', data.fixed30Y.daily_change, true); // Inverted for rates
    updateTextElement('fixed30yYesterday', formatValue(data.fixed30Y.current));

    updateTextElement('fixed15yToday', formatValue(data.fixed15Y.daily_change));
    updateValueWithColorBasedOnChange('fixed15yToday', data.fixed15Y.daily_change, true); // Inverted for rates
    updateTextElement('fixed15yYesterday', formatValue(data.fixed15Y.current));


    // Update Equities
    updateTextElement('sp500Value', formatValue(data.SP500.current));
    updateChangeIndicator('sp500Value', 'sp500Change', data.SP500.current, data.SP500.change);

    updateTextElement('dowValue', formatValue(data.DOW.current));
    updateChangeIndicator('dowValue', 'dowChange', data.DOW.current, data.DOW.change);

    updateTextElement('nasdaqValue', formatValue(data.NASDAQ.current));
    updateChangeIndicator('nasdaqValue', 'nasdaqChange', data.NASDAQ.current, data.NASDAQ.change);

    updateTextElement('marketLastUpdated', `Last Updated: ${formatTimestamp(data.last_updated)}`);

  } catch (err) {
    console.error("Market data fetch error:", err);
    updateTextElement('marketLastUpdated', `Last Updated: Error`);
    // Set all snapshot values to '--' on error
    const snapshotElements = [
      'umbs55Value', 'umbs55Change', 'umbs60Value', 'umbs60Change',
      'us10yValue', 'us10yChange', 'us30yValue', 'us30yChange',
      'fixed30yToday', 'fixed30yYesterday', 'fixed15yToday', 'fixed15yYesterday',
      'sp500Value', 'sp500Change', 'dowValue', 'dowChange', 'nasdaqValue', 'nasdaqChange'
    ];
    snapshotElements.forEach(id => updateTextElement(id, '--'));
  }
}

async function fetchAndUpdateDailyRates() {
  try {
    const response = await fetch('/.netlify/functions/getDailyRatesData');
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    console.log("DEBUG (fetchAndUpdateDailyRates): Fetched daily rates data:", data); // Log fetched data

    updateTextElement('dailyRatesLastUpdated', `Last Updated: ${formatTimestamp(data.last_updated)}`);

    // Update 30Y Fixed
    updateTextElement('fixed30yCurrent', formatValue(data.fixed30Y.current));
    updateTextElement('fixed30yChange', formatValue(data.fixed30Y.daily_change));
    updateTextElement('fixed30yOpen', formatValue(data.fixed30Y.open));
    updateTextElement('fixed30yHigh', formatValue(data.fixed30Y.high));
    updateTextElement('fixed30yLow', formatValue(data.fixed30Y.low));
    updateTextElement('fixed30yPrevClose', formatValue(data.fixed30Y.prevClose));
    updateTextElement('fixed30yUpdated', formatTimestamp(data.fixed30Y.last_updated));

    // Update 15Y Fixed
    updateTextElement('fixed15yCurrent', formatValue(data.fixed15Y.current));
    updateTextElement('fixed15yChange', formatValue(data.fixed15Y.daily_change));
    updateTextElement('fixed15yOpen', formatValue(data.fixed15Y.open));
    updateTextElement('fixed15yHigh', formatValue(data.fixed15Y.high));
    updateTextElement('fixed15yLow', formatValue(data.fixed15Y.low));
    updateTextElement('fixed15yPrevClose', formatValue(data.fixed15Y.prevClose));
    updateTextElement('fixed15yUpdated', formatTimestamp(data.fixed15Y.last_updated));

    // Update FHA 30Y Fixed
    updateTextElement('fha30yCurrent', formatValue(data.fha30Y.current));
    updateTextElement('fha30yChange', formatValue(data.fha30Y.daily_change));
    updateTextElement('fha30yOpen', formatValue(data.fha30Y.open));
    updateTextElement('fha30yHigh', formatValue(data.fha30Y.high));
    updateTextElement('fha30yLow', formatValue(data.fha30Y.low));
    updateTextElement('fha30yPrevClose', formatValue(data.fha30Y.prevClose));
    updateTextElement('fha30yUpdated', formatTimestamp(data.fha30Y.last_updated));

    // Update VA 30Y Fixed
    updateTextElement('va30yCurrent', formatValue(data.va30Y.current));
    updateTextElement('va30yChange', formatValue(data.va30Y.daily_change));
    updateTextElement('va30yOpen', formatValue(data.va30Y.open));
    updateTextElement('va30yHigh', formatValue(data.va30Y.high));
    updateTextElement('va30yLow', formatValue(data.va30Y.low));
    updateTextElement('va30yPrevClose', formatValue(data.va30Y.prevClose));
    updateTextElement('va30yUpdated', formatTimestamp(data.va30Y.last_updated));

    // Update Jumbo 30Y Fixed
    updateTextElement('jumbo30yCurrent', formatValue(data.jumbo30Y.current));
    updateTextElement('jumbo30yChange', formatValue(data.jumbo30Y.daily_change));
    updateTextElement('jumbo30yOpen', formatValue(data.jumbo30Y.open));
    updateTextElement('jumbo30yHigh', formatValue(data.jumbo30Y.high));
    updateTextElement('jumbo30yLow', formatValue(data.jumbo30Y.low));
    updateTextElement('jumbo30yPrevClose', formatValue(data.jumbo30Y.prevClose));
    updateTextElement('jumbo30yUpdated', formatTimestamp(data.jumbo30Y.last_updated));

    // Update Jumbo 15Y Fixed
    updateTextElement('jumbo15yCurrent', formatValue(data.jumbo15Y.current));
    updateTextElement('jumbo15yChange', formatValue(data.jumbo15Y.daily_change));
    updateTextElement('jumbo15yOpen', formatValue(data.jumbo15Y.open));
    updateTextElement('jumbo15yHigh', formatValue(data.jumbo15Y.high));
    updateTextElement('jumbo15yLow', formatValue(data.jumbo15Y.low));
    updateTextElement('jumbo15yPrevClose', formatValue(data.jumbo15Y.prevClose));
    updateTextElement('jumbo15yUpdated', formatTimestamp(data.jumbo15Y.last_updated));


  } catch (err) {
    console.error("Daily rates data fetch error:", err);
    updateTextElement('dailyRatesLastUpdated', `Last Updated: Error`);
    // Set all daily rates values to '--' on error
    const rateElements = [
      'fixed30yCurrent', 'fixed30yChange', 'fixed30yOpen', 'fixed30yHigh', 'fixed30yLow', 'fixed30yPrevClose', 'fixed30yUpdated',
      'fixed15yCurrent', 'fixed15yChange', 'fixed15yOpen', 'fixed15yHigh', 'fixed15yLow', 'fixed15yPrevClose', 'fixed15yUpdated',
      'fha30yCurrent', 'fha30yChange', 'fha30yOpen', 'fha30yHigh', 'fha30yLow', 'fha30yPrevClose', 'fha30yUpdated',
      'va30yCurrent', 'va30yChange', 'va30yOpen', 'va30yHigh', 'va30yLow', 'va30yPrevClose', 'va30yUpdated',
      'jumbo30yCurrent', 'jumbo30yChange', 'jumbo30yOpen', 'jumbo30yHigh', 'jumbo30yLow', 'jumbo30yPrevClose', 'jumbo30yUpdated',
      'jumbo15yCurrent', 'jumbo15yChange', 'jumbo15yOpen', 'jumbo15yHigh', 'jumbo15yLow', 'jumbo15yPrevClose', 'jumbo15yUpdated'
    ];
    rateElements.forEach(id => updateTextElement(id, '--'));
  }
}

async function fetchAndUpdateLiveStockData() {
  try {
    const response = await fetch('/.netlify/functions/getLiveStockData');
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    console.log("DEBUG (fetchAndUpdateLiveStockData): Fetched live stock data:", data); // Log fetched data

    updateTextElement('liveStockLastUpdated', `Last Updated: ${formatTimestamp(data.last_updated)}`);

    // Update DOW
    updateTextElement('dowCurrent', formatValue(data.DOW.current));
    updateTextElement('dowChange', formatValue(data.DOW.daily_change));
    updateTextElement('dowOpen', formatValue(data.DOW.open));
    updateTextElement('dowHigh', formatValue(data.DOW.high));
    updateTextElement('dowLow', formatValue(data.DOW.low));
    updateTextElement('dowPrevClose', formatValue(data.DOW.prevClose));
    updateTextElement('dowUpdated', formatTimestamp(data.DOW.last_updated));

    // Update S&P 500
    updateTextElement('sp500Current', formatValue(data.SP500.current));
    updateTextElement('sp500Change', formatValue(data.SP500.daily_change));
    updateTextElement('sp500Open', formatValue(data.SP500.open));
    updateTextElement('sp500High', formatValue(data.SP500.high));
    updateTextElement('sp500Low', formatValue(data.SP500.low));
    updateTextElement('sp500PrevClose', formatValue(data.SP500.prevClose));
    updateTextElement('sp500Updated', formatTimestamp(data.SP500.last_updated));

    // Update NASDAQ
    updateTextElement('nasdaqCurrent', formatValue(data.NASDAQ.current));
    updateTextElement('nasdaqChange', formatValue(data.NASDAQ.daily_change));
    updateTextElement('nasdaqOpen', formatValue(data.NASDAQ.open));
    updateTextElement('nasdaqHigh', formatValue(data.NASDAQ.high));
    updateTextElement('nasdaqLow', formatValue(data.NASDAQ.low));
    updateTextElement('nasdaqPrevClose', formatValue(data.NASDAQ.prevClose));
    updateTextElement('nasdaqUpdated', formatTimestamp(data.NASDAQ.last_updated));

  } catch (err) {
    console.error("Live stock data fetch error:", err);
    updateTextElement('liveStockLastUpdated', `Last Updated: Error`);
    // Set all stock values to '--' on error
    const stockElements = [
      'dowCurrent', 'dowChange', 'dowOpen', 'dowHigh', 'dowLow', 'dowPrevClose', 'dowUpdated',
      'sp500Current', 'sp500Change', 'sp500Open', 'sp500High', 'sp500Low', 'sp500PrevClose', 'sp500Updated',
      'nasdaqCurrent', 'nasdaqChange', 'nasdaqOpen', 'nasdaqHigh', 'nasdaqLow', 'nasdaqPrevClose', 'nasdaqUpdated'
    ];
    stockElements.forEach(id => updateTextElement(id, '--'));
  }
}

async function fetchAndUpdateEconomicIndicators() {
  try {
    const response = await fetch('/.netlify/functions/getEconomicIndicators');
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    console.log("DEBUG (fetchAndUpdateEconomicIndicators): Fetched economic indicators data:", data); // Log fetched data

    updateTextElement('economicIndicatorsLastUpdated', `Last Updated: ${formatTimestamp(data.last_updated)}`);

    // Update CPI
    updateTextElement('cpiLatest', formatValue(data.CPI.latest));
    updateTextElement('cpiDate', data.CPI.date || '--');
    updateTextElement('cpiLastMonth', formatValue(data.CPI.lastMonth));
    updateTextElement('cpiYearAgo', formatValue(data.CPI.yearAgo));
    updateTextElement('cpiNextRelease', data.CPI.nextRelease || '--');
    updateTextElement('cpiCoveragePeriod', data.CPI.coveragePeriod || '--');

    // Update PPI
    updateTextElement('ppiLatest', formatValue(data.PPI.latest));
    updateTextElement('ppiDate', data.PPI.date || '--');
    updateTextElement('ppiLastMonth', formatValue(data.PPI.lastMonth));
    updateTextElement('ppiYearAgo', formatValue(data.PPI.yearAgo));
    updateTextElement('ppiNextRelease', data.PPI.nextRelease || '--');
    updateTextElement('ppiCoveragePeriod', data.PPI.coveragePeriod || '--');

    // Update Fed Funds Rate
    updateTextElement('fedFundsLatest', formatValue(data.FedFundsRate.latest));
    updateTextElement('fedFundsDate', data.FedFundsRate.date || '--');
    updateTextElement('fedFundsLastMonth', formatValue(data.FedFundsRate.lastMonth));
    updateTextElement('fedFundsYearAgo', formatValue(data.FedFundsRate.yearAgo));
    updateTextElement('fedFundsNextRelease', data.FedFundsRate.nextRelease || '--');
    updateTextElement('fedFundsCoveragePeriod', data.FedFundsRate.coveragePeriod || '--');

    // Update Unemployment Rate
    updateTextElement('unemploymentLatest', formatValue(data.UnemploymentRate.latest));
    updateTextElement('unemploymentDate', data.UnemploymentRate.date || '--');
    updateTextElement('unemploymentLastMonth', formatValue(data.UnemploymentRate.lastMonth));
    updateTextElement('unemploymentYearAgo', formatValue(data.UnemploymentRate.yearAgo));
    updateTextElement('unemploymentNextRelease', data.UnemploymentRate.nextRelease || '--');
    updateTextElement('unemploymentCoveragePeriod', data.UnemploymentRate.coveragePeriod || '--');

    // Update Housing Starts
    updateTextElement('housingStartsLatest', formatValue(data.HousingStarts.latest));
    updateTextElement('housingStartsDate', data.HousingStarts.date || '--');
    updateTextElement('housingStartsLastMonth', formatValue(data.HousingStarts.lastMonth));
    updateTextElement('housingStartsYearAgo', formatValue(data.HousingStarts.yearAgo));
    updateTextElement('housingStartsNextRelease', data.HousingStarts.nextRelease || '--');
    updateTextElement('housingStartsCoveragePeriod', data.HousingStarts.coveragePeriod || '--');

    // Update Building Permits
    updateTextElement('permitLatest', formatValue(data.BuildingPermits.latest));
    updateTextElement('permitDate', data.BuildingPermits.date || '--');
    updateTextElement('permitLastMonth', formatValue(data.BuildingPermits.lastMonth));
    updateTextElement('permitYearAgo', formatValue(data.BuildingPermits.yearAgo));
    updateTextElement('permitNextRelease', data.BuildingPermits.nextRelease || '--');
    updateTextElement('permitCoveragePeriod', data.BuildingPermits.coveragePeriod || '--');

    // Update 10Y Breakeven Inflation Rate
    updateTextElement('t10yieLatest', formatValue(data['10YIE'].latest));
    updateTextElement('t10yieDate', data['10YIE'].date || '--');
    updateTextElement('t10yieLastMonth', formatValue(data['10YIE'].lastMonth));
    updateTextElement('t10yieYearAgo', formatValue(data['10YIE'].yearAgo));
    updateTextElement('t10yieNextRelease', data['10YIE'].nextRelease || '--');
    updateTextElement('t10yieCoveragePeriod', data['10YIE'].coveragePeriod || '--');

    // Update 10Y Minus 2Y Treasury
    updateTextElement('t10y2yLatest', formatValue(data['10YMinus2Y'].latest));
    updateTextElement('t10y2yDate', data['10YMinus2Y'].date || '--');
    updateTextElement('t10y2yLastMonth', formatValue(data['10YMinus2Y'].lastMonth));
    updateTextElement('t10y2yYearAgo', formatValue(data['10YMinus2Y'].yearAgo));
    updateTextElement('t10y2yNextRelease', data['10YMinus2Y'].nextRelease || '--');
    updateTextElement('t10y2yCoveragePeriod', data['10YMinus2Y'].coveragePeriod || '--');

  } catch (err) {
    console.error("Economic indicators fetch error:", err);
    updateTextElement('economicIndicatorsLastUpdated', `Last Updated: Error`);
    // Set all economic indicators to '--' on error
    const ecoElements = [
      'cpiLatest', 'cpiDate', 'cpiLastMonth', 'cpiYearAgo', 'cpiNextRelease', 'cpiCoveragePeriod',
      'ppiLatest', 'ppiDate', 'ppiLastMonth', 'ppiYearAgo', 'ppiNextRelease', 'ppiCoveragePeriod',
      'fedFundsLatest', 'fedFundsDate', 'fedFundsLastMonth', 'fedFundsYearAgo', 'fedFundsNextRelease', 'fedFundsCoveragePeriod',
      'unemploymentLatest', 'unemploymentDate', 'unemploymentLastMonth', 'unemploymentYearAgo', 'unemploymentNextRelease', 'unemploymentCoveragePeriod',
      'housingStartsLatest', 'housingStartsDate', 'housingStartsLastMonth', 'housingStartsYearAgo', 'housingStartsNextRelease', 'housingStartsCoveragePeriod',
      'permitLatest', 'permitDate', 'permitLastMonth', 'permitYearAgo', 'permitNextRelease', 'permitCoveragePeriod',
      't10yieLatest', 't10yieDate', 't10yieLastMonth', 't10yieYearAgo', 't10yieNextRelease', 't10yieCoveragePeriod',
      't10y2yLatest', 't10y2yDate', 't10y2yLastMonth', 't10y2yYearAgo', 't10y2yNextRelease', 't10y2yCoveragePeriod'
    ];
    ecoElements.forEach(id => updateTextElement(id, '--'));
  }
}

async function fetchAndUpdateBondData() {
    try {
        // Fetch bond data from Netlify function
        const response = await fetch('/.netlify/functions/getAllBondData');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const bondData = await response.json();
        console.log("DEBUG (fetchAndUpdateBondData): FULL BOND DATA RECEIVED:", bondData); // Log entire received data

        // Update last updated timestamp for the section header
        updateTextElement('bondLastUpdated', `Last Updated: ${formatTimestamp(bondData.last_updated)}`);

        const bondInstruments = [
            "US10Y", "US30Y",
            "UMBS_5_5", "UMBS_6_0", "GNMA_5_5", "GNMA_6_0",
            "UMBS_5_5_Shadow", "UMBS_6_0_Shadow", "GNMA_5_5_Shadow", "GNMA_6_0_Shadow"
        ];

        bondInstruments.forEach(instrumentKey => {
            let baseId = instrumentKey.toLowerCase().replace(/_/g, '');
            // Explicitly handle shadow bonds for robustness, though replace should cover it
            if (instrumentKey === "GNMA_6_0_Shadow") {
                baseId = "gnma60shadow";
            } else if (instrumentKey === "GNMA_5_5_Shadow") {
                baseId = "gnma55shadow";
            }

            const instrumentData = bondData[instrumentKey];
            const tableIdPrefix = `${baseId}Table`;

            console.log(`DEBUG (fetchAndUpdateBondData): Processing instrument: '${instrumentKey}', baseId: '${baseId}'`); // Log instrument being processed
            console.log(`DEBUG (fetchAndUpdateBondData): instrumentData for '${instrumentKey}':`, instrumentData); // Log specific instrument data

            if (instrumentData) {
                updateTextElement(`${tableIdPrefix}Current`, formatValue(instrumentData.current));
                updateTextElement(`${tableIdPrefix}Change`, formatValue(instrumentData.change));
                updateTextElement(`${tableIdPrefix}Open`, formatValue(instrumentData.open));
                updateTextElement(`${tableIdPrefix}High`, formatValue(instrumentData.high));
                updateTextElement(`${tableIdPrefix}Low`, formatValue(instrumentData.low));
                updateTextElement(`${tableIdPrefix}PrevClose`, formatValue(instrumentData.prevClose));
                // This line ensures the individual instrument's timestamp is used
                updateTextElement(`${tableIdPrefix}Updated`, formatTimestamp(instrumentData.last_updated));
            } else {
                console.warn(`DEBUG (fetchAndUpdateBondData): Data missing or null for instrument: ${instrumentKey}. Setting to '--'.`); // Debug missing data
                // If data is missing, ensure all fields show '--'
                updateTextElement(`${tableIdPrefix}Current`, '--');
                updateTextElement(`${tableIdPrefix}Change`, '--');
                updateTextElement(`${tableIdPrefix}Open`, '--');
                updateTextElement(`${tableIdPrefix}High`, '--');
                updateTextElement(`${tableIdPrefix}Low`, '--');
                updateTextElement(`${tableIdPrefix}PrevClose`, '--');
                updateTextElement(`${tableIdPrefix}Updated`, '--'); // Ensure it's still '--' on error
            }
        });

    } catch (err) {
        console.error("Bond data fetch error:", err);
        updateTextElement('bondLastUpdated', `Last Updated: Error`);
        // On error, set all bond data to '--'
        const bondInstruments = [
            "US10Y", "US30Y",
            "UMBS_5_5", "UMBS_6_0", "GNMA_5_5", "GNMA_6_0",
            "UMBS_5_5_Shadow", "UMBS_6_0_Shadow", "GNMA_5_5_Shadow", "GNMA_6_0_Shadow"
        ];
        bondInstruments.forEach(instrumentKey => {
            let baseId = instrumentKey.toLowerCase().replace(/_/g, '');
            if (instrumentKey === "GNMA_6_0_Shadow") {
                baseId = "gnma60shadow";
            } else if (instrumentKey === "GNMA_5_5_Shadow") {
                baseId = "gnma55shadow";
            }
            const tableIdPrefix = `${baseId}Table`;
            updateTextElement(`${tableIdPrefix}Current`, '--');
            updateTextElement(`${tableIdPrefix}Change`, '--');
            updateTextElement(`${tableIdPrefix}Open`, '--');
            updateTextElement(`${tableIdPrefix}High`, '--');
            updateTextElement(`${tableIdPrefix}Low`, '--');
            updateTextElement(`${tableIdPrefix}PrevClose`, '--');
            updateTextElement(`${tableIdPrefix}Updated`, '--');
        });
    }
}

// --- Initialize & Refresh ---
document.addEventListener("DOMContentLoaded", () => {
  fetchAndUpdateMarketData();
  fetchAndUpdateDailyRates();
  fetchAndUpdateLiveStockData();
  fetchAndUpdateEconomicIndicators();
  fetchAndUpdateBondData();

  // Increased refresh rate for market and bond data
  setInterval(fetchAndUpdateMarketData, 30000); // Every 30 seconds
  setInterval(fetchAndUpdateLiveStockData, 30000); // Every 30 seconds
  setInterval(fetchAndUpdateBondData, 30000); // Every 30 seconds
  // Economic indicators and daily rates typically don't change as frequently,
  // so keeping them at default or slightly longer intervals might be efficient.
  // For now, let's keep daily rates at 60s, economic indicators at 5 minutes (300000ms)
  setInterval(fetchAndUpdateDailyRates, 60000); // Every 60 seconds
  setInterval(fetchAndUpdateEconomicIndicators, 300000); // Every 5 minutes
});
