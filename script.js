// src/main.js - The main application logic for your LockMVP Dashboard

// Helper function to format timestamps nicely
function formatTimestamp(isoString) {
    if (!isoString) return '--';
    // If the string is in 'YYYY-MM-DD HH:MM:SS' format, convert it to ISO for Date parsing
    if (typeof isoString === 'string' && isoString.includes(' ') && !isoString.includes('T')) {
        isoString = isoString.replace(' ', 'T');
    }
    const date = new Date(isoString);
    if (isNaN(date.getTime())) {
        console.warn("Invalid date string for formatting:", isoString);
        return '--'; // Handle cases where date parsing fails
    }
    // Use Intl.DateTimeFormat for robust time zone and formatting
    const options = {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
        timeZoneName: 'short',
        timeZone: 'America/Phoenix' // MST (Phoenix, Arizona doesn't observe DST)
    };
    return new Intl.DateTimeFormat('en-US', options).format(date);
}

// Helper function to format FRED dates (YYYY-MM-DD)
function formatFredDate(dateString) {
    if (!dateString) return '--';
    // FRED dates are YYYY-MM-DD, so we can just return as is
    return dateString;
}

// Helper function to apply color to change values and format decimals
function applyChangeColor(elementId, value, decimals) {
    const element = document.getElementById(elementId);
    if (!element) return;

    element.classList.remove('text-green-400', 'text-red-400', 'text-gray-400'); // Remove existing colors (using 400 for retro theme)

    const dataType = element.getAttribute('data-type');
    const numericValue = parseFloat(value);

    if (isNaN(numericValue)) {
        element.textContent = '--';
        element.classList.add('text-gray-400'); // Default to neutral gray
        return;
    }

    let formattedValue = numericValue.toFixed(decimals);

    // Add '+' sign for positive values, toFixed handles '-' for negative
    if (numericValue > 0) {
        formattedValue = `+${formattedValue}`;
    }

    element.textContent = formattedValue; // Assign the correctly formatted string

    // Apply colors based on data-type attribute
    if (dataType === 'positive-green-negative-red') {
        if (numericValue > 0) {
            element.classList.add('text-green-400'); // Green for positive change
        } else if (numericValue < 0) {
            element.classList.add('text-red-400'); // Red for negative change
        } else {
            element.classList.add('text-gray-400'); // Neutral gray for zero change
        }
    } else if (dataType === 'positive-red-negative-green') {
        // This type is used for US10Y change, where positive (yields going up) is red and negative is green
        if (numericValue > 0) {
            element.classList.add('text-red-400');
        } else if (numericValue < 0) {
            element.classList.add('text-green-400');
        } else {
            element.classList.add('text-gray-400'); // Neutral gray for zero change
        }
    } else {
        element.classList.add('text-gray-400'); // Default color if data-type is not specified or recognized
    }
}

// Helper function to format general numeric values
function formatNumericValue(value, decimals) {
    const numValue = parseFloat(value);
    // If numValue is NaN, return '--'. Otherwise, format to fixed decimals.
    return isNaN(numValue) ? '--' : numValue.toFixed(decimals);
}

// --- Fetching Functions for Real-Time/Near Real-Time Data from 'market_data' collection ---

async function fetchMarketData() {
    console.log("Fetching market_data (MBS, Shadow, US10Y)...");
    try {
        // Fetch MBS Data
        const mbsResponse = await fetch('/.netlify/functions/getMBSData');
        const mbsData = await mbsResponse.json();
        if (mbsResponse.ok) {
            const products = [
                { id: 'umbs-5-5', prefix: 'UMBS_5_5' },
                { id: 'umbs-6-0', prefix: 'UMBS_6_0' },
                { id: 'gnma-5-5', prefix: 'GNMA_5_5' },
                { id: 'gnma-6-0', prefix: 'GNMA_6_0' }
            ];

            products.forEach(product => {
                const current = formatNumericValue(mbsData[`${product.prefix}_Current`], 2);
                const change = mbsData[`${product.prefix}_Daily_Change`];
                const open = formatNumericValue(mbsData[`${product.prefix}_Open`], 2);
                const todayClose = formatNumericValue(mbsData[`${product.prefix}_Close`], 2);
                const priorClose = formatNumericValue(mbsData[`${product.prefix}_PriorDayClose`], 2);
                const high = formatNumericValue(mbsData[`${product.prefix}_TodayHigh`], 2);
                const low = formatNumericValue(mbsData[`${product.prefix}_TodayLow`], 2);

                // Populate Ticker Table (explicitly creating rows if not present)
                const tickerTableBody = document.getElementById('ticker-table-body');
                if (tickerTableBody) {
                    let row = document.getElementById(`ticker-${product.id}`);
                    if (!row) {
                        row = document.createElement('tr');
                        row.id = `ticker-${product.id}`;
                        row.innerHTML = `
                            <td class="py-1 px-3">${product.id.replace(/-/g, ' ').toUpperCase()}</td>
                            <td class="py-1 px-3 text-right" id="${row.id}-change" data-type="positive-green-negative-red">--</td>
                            <td class="py-1 px-3 text-right" id="${row.id}-actual">--</td>
                            <td class="py-1 px-3 text-right" id="${row.id}-open">--</td>
                            <td class="py-1 px-3 text-right" id="${row.id}-prior">--</td>
                            <td class="py-1 px-3 text-right" id="${row.id}-high">--</td>
                            <td class="py-1 px-3 text-right" id="${row.id}-low">--</td>
                            <td class="py-1 px-3 text-right" id="${row.id}-updated">--</td>
                        `;
                        tickerTableBody.appendChild(row);
                    }

                    document.getElementById(`${row.id}-actual`).textContent = current;
                    document.getElementById(`${row.id}-open`).textContent = open;
                    document.getElementById(`${row.id}-prior`).textContent = priorClose;
                    document.getElementById(`${row.id}-high`).textContent = high;
                    document.getElementById(`${row.id}-low`).textContent = low;
                    document.getElementById(`${row.id}-updated`).textContent = formatTimestamp(mbsData.last_updated).split(' ')[1]; // Time only
                    applyChangeColor(`${row.id}-change`, change, 2);
                }


                // Update Top Metric Card for UMBS 5.5
                if (product.id === 'umbs-5-5') {
                    document.getElementById('top-umbs-5-5-current').textContent = current;
                    applyChangeColor('top-umbs-5-5-change', change, 2);
                }
            });
            document.getElementById('mbs-timestamp').textContent = formatTimestamp(mbsData.last_updated);
        } else {
            console.error('Error fetching MBS data:', mbsData.message || mbsResponse.statusText);
        }

        // Fetch Shadow Bonds Data
        const shadowResponse = await fetch('/.netlify/functions/getShadowBondsData');
        const shadowData = await shadowResponse.json();
        if (shadowResponse.ok) {
            const products = [
                { id: 'umbs-5-5-shadow', prefix: 'UMBS_5_5_Shadow' },
                { id: 'umbs-6-0-shadow', prefix: 'UMBS_6_0_Shadow' },
                { id: 'gnma-5-5-shadow', prefix: 'GNMA_5_5_Shadow' },
                { id: 'gnma-6-0-shadow', prefix: 'GNMA_6_0_Shadow' }
            ];

            products.forEach(product => {
                const current = formatNumericValue(shadowData[`${product.prefix}_Current`], 2);
                const change = shadowData[`${product.prefix}_Daily_Change`];
                const open = formatNumericValue(shadowData[`${product.prefix}_Open`], 2);
                const todayClose = formatNumericValue(shadowData[`${product.prefix}_Close`], 2);
                const priorClose = formatNumericValue(shadowData[`${product.prefix}_PriorDayClose`], 2);
                const high = formatNumericValue(shadowData[`${product.prefix}_TodayHigh`], 2);
                const low = formatNumericValue(shadowData[`${product.prefix}_TodayLow`], 2);

                // Populate Ticker Table
                const tickerTableBody = document.getElementById('ticker-table-body');
                if (tickerTableBody) {
                    let row = document.getElementById(`ticker-${product.id}`);
                    if (!row) {
                        row = document.createElement('tr');
                        row.id = `ticker-${product.id}`;
                        row.innerHTML = `
                            <td class="py-1 px-3">${product.id.replace(/-/g, ' ').toUpperCase()}</td>
                            <td class="py-1 px-3 text-right" id="${row.id}-change" data-type="positive-green-negative-red">--</td>
                            <td class="py-1 px-3 text-right" id="${row.id}-actual">--</td>
                            <td class="py-1 px-3 text-right" id="${row.id}-open">--</td>
                            <td class="py-1 px-3 text-right" id="${row.id}-prior">--</td>
                            <td class="py-1 px-3 text-right" id="${row.id}-high">--</td>
                            <td class="py-1 px-3 text-right" id="${row.id}-low">--</td>
                            <td class="py-1 px-3 text-right" id="${row.id}-updated">--</td>
                        `;
                        tickerTableBody.appendChild(row);
                    }
                    document.getElementById(`${row.id}-actual`).textContent = current;
                    document.getElementById(`${row.id}-open`).textContent = open;
                    document.getElementById(`${row.id}-prior`).textContent = priorClose;
                    document.getElementById(`${row.id}-high`).textContent = high;
                    document.getElementById(`${row.id}-low`).textContent = low;
                    document.getElementById(`${row.id}-updated`).textContent = formatTimestamp(shadowData.last_updated).split(' ')[1]; // Time only
                    applyChangeColor(`${row.id}-change`, change, 2);
                }

                // Update Top Metric Card for Shadow GNMA 5.5
                if (product.id === 'gnma-5-5-shadow') {
                    document.getElementById('top-shadow-gnma-5-5-current').textContent = current;
                    applyChangeColor('top-shadow-gnma-5-5-change', change, 2);
                }
            });
            document.getElementById('shadow-timestamp').textContent = formatTimestamp(shadowData.last_updated);
        } else {
            console.error('Error fetching Shadow Bonds data:', shadowData.message || shadowResponse.statusText);
        }

        // Fetch US10Y Data
        const us10yResponse = await fetch('/.netlify/functions/getUS10YData');
        const us10yData = await us10yResponse.json();
        if (us10yResponse.ok) {
            const current = formatNumericValue(us10yData.US10Y_Current, 3);
            const change = us10yData.US10Y_Daily_Change;
            const open = formatNumericValue(us10yData.US10Y_Open, 3);
            const todayClose = formatNumericValue(us10yData.US10Y_Close, 3);
            const priorClose = formatNumericValue(us10yData.US10Y_PriorDayClose, 3);
            const high = formatNumericValue(us10yData.US10Y_TodayHigh, 3);
            const low = formatNumericValue(us10yData.US10Y_TodayLow, 3);

            // Populate Ticker Table (US10Y row)
            const tickerTableBody = document.getElementById('ticker-table-body');
            if (tickerTableBody) {
                let row = document.getElementById(`ticker-us10y`);
                if (!row) {
                    row = document.createElement('tr');
                    row.id = `ticker-us10y`;
                    row.innerHTML = `
                        <td class="py-1 px-3">US10Y</td>
                        <td class="py-1 px-3 text-right" id="${row.id}-change" data-type="positive-red-negative-green">--</td>
                        <td class="py-1 px-3 text-right" id="${row.id}-actual">--</td>
                        <td class="py-1 px-3 text-right" id="${row.id}-open">--</td>
                        <td class="py-1 px-3 text-right" id="${row.id}-prior">--</td>
                        <td class="py-1 px-3 text-right" id="${row.id}-high">--</td>
                        <td class="py-1 px-3 text-right" id="${row.id}-low">--</td>
                        <td class="py-1 px-3 text-right" id="${row.id}-updated">--</td>
                    `;
                    tickerTableBody.appendChild(row);
                }
                document.getElementById(`${row.id}-actual`).textContent = current;
                document.getElementById(`${row.id}-open`).textContent = open;
                document.getElementById(`${row.id}-prior`).textContent = priorClose;
                document.getElementById(`${row.id}-high`).textContent = high;
                document.getElementById(`${row.id}-low`).textContent = low;
                document.getElementById(`${row.id}-updated`).textContent = formatTimestamp(us10yData.last_updated).split(' ')[1]; // Time only
                applyChangeColor(`${row.id}-change`, change, 3);
            }

            // Update Top Metric Card for US10Y
            document.getElementById('top-us10y-current').textContent = current;
            applyChangeColor('top-us10y-change', change, 3);

            document.getElementById('us10y-timestamp').textContent = formatTimestamp(us10yData.last_updated);
        } else {
            console.error('Error fetching US10Y data:', us10yData.message || us10yResponse.statusText);
        }

        // --- Clear existing "Loading real-time data..." row once data is fetched ---
        const tickerTableBody = document.getElementById('ticker-table-body');
        if (tickerTableBody && tickerTableBody.querySelector('td[colspan="8"]')) {
            tickerTableBody.innerHTML = ''; // Clear only if the loading row is present
        }


    } catch (error) {
        console.error('Error in fetchMarketData:', error);
        // Fallback for all market data if any fetch fails
        document.getElementById('mbs-timestamp').textContent = 'Error loading data';
        document.getElementById('shadow-timestamp').textContent = 'Error loading data';
        document.getElementById('us10y-timestamp').textContent = 'Error loading data';
    }
}


// --- Fetching Functions for FRED Data (Daily, Weekly, Monthly) from 'fred_reports' collection ---

async function fetchFredData() {
    console.log("Fetching FRED data...");
    try {
        // Daily Data (Mortgage Rates, Inflation, Treasury Spread)
        const dailyRates = [
            { id: 'daily-30y-fixed', label: '30Y Fixed Rate Conforming', seriesId: 'OBMMIC30YF' },
            { id: 'daily-30y-va', label: '30Y VA Mortgage Index', seriesId: 'OBMMIVA30YF' },
            { id: 'daily-30y-fha', label: '30Y FHA Mortgage Index', seriesId: 'OBMMIFHA30YF' },
            { id: 'daily-30y-jumbo', label: '30Y Jumbo Mortgage Index', seriesId: 'OBMMIJUMBO30YF' },
            { id: 'daily-30y-usda', label: '30Y USDA Mortgage Index', seriesId: 'OBMMIUSDA30YF' },
            { id: 'daily-30y-investment', label: '30Y Fixed Rate Conforming', seriesId: 'OBMMIC30YF' }, // Assuming investment is same as conforming for now, adjust if separate series exists
            { id: 'daily-breakeven', label: '10Y Breakeven Inflation Rate', seriesId: 'T10YIE' },
            { id: 'daily-treasury-spread', label: '10Y Treasury Minus 2Y Treasury', seriesId: 'T10Y2Y' },
        ];

        for (const rate of dailyRates) {
            try {
                const response = await fetch(`/.netlify/functions/getFredReport?reportName=${encodeURIComponent(rate.label)}`);
                const data = await response.json();
                if (response.ok && data.series_id === rate.seriesId) {
                    // Display Latest (Today)
                    document.getElementById(`${rate.id}-today`).textContent = data.latest !== null ? `${data.latest.toFixed(2)}%` : '--'; // Add % for rates
                    // For "Yesterday" and "Last Week", use placeholder as discussed
                    document.getElementById(`${rate.id}-yesterday`).textContent = '--';
                    document.getElementById(`${rate.id}-last-week`).textContent = '--';
                    document.getElementById(`${rate.id}-last-year`).textContent = data.year_ago !== null ? `${data.year_ago.toFixed(2)}%` : '--';
                    document.getElementById(`${rate.id}-updated`).textContent = formatFredDate(data.latest_date); // FRED date for latest
                } else {
                    console.warn(`Failed to fetch/match FRED data for ${rate.label}:`, data.message || response.statusText);
                    document.getElementById(`${rate.id}-today`).textContent = 'Error';
                    document.getElementById(`${rate.id}-last-year`).textContent = 'Error';
                    document.getElementById(`${rate.id}-updated`).textContent = 'Error';
                }
            } catch (error) {
                console.error(`Error fetching FRED Daily Data for ${rate.label}:`, error);
                document.getElementById(`${rate.id}-today`).textContent = 'Error';
                document.getElementById(`${rate.id}-last-year`).textContent = 'Error';
                document.getElementById(`${rate.id}-updated`).textContent = 'Error';
            }
        }
        // Update top 30Y Fixed Rate card using MORTGAGE30US from FRED (which is weekly but good for "latest")
        try {
            const response = await fetch(`/.netlify/functions/getFredReport?reportName=${encodeURIComponent('30Y Mortgage Avg US')}`);
            const data = await response.json();
            if (response.ok && data.series_id === 'MORTGAGE30US') {
                document.getElementById('top-30y-fixed-rate').textContent = data.latest !== null ? `${data.latest.toFixed(2)}%` : '--';
                document.getElementById('top-30y-fixed-date').textContent = formatFredDate(data.latest_date);
            } else {
                console.warn(`Failed to fetch top 30Y Fixed Rate from FRED:`, data.message || response.statusText);
                document.getElementById('top-30y-fixed-rate').textContent = 'Error';
                document.getElementById('top-30y-fixed-date').textContent = 'Error';
            }
        } catch (error) {
            console.error('Error fetching top 30Y Fixed Rate (FRED):', error);
            document.getElementById('top-30y-fixed-rate').textContent = 'Error';
            document.getElementById('top-30y-fixed-date').textContent = 'Error';
        }


        // Weekly Data (Freddie Mac Avg Rates)
        const weeklyRates = [
            { id: 'weekly-30y', label: '30Y Mortgage Avg US', seriesId: 'MORTGAGE30US' },
            { id: 'weekly-15y', label: '15Y Mortgage Avg US', seriesId: 'MORTGAGE15US' },
        ];

        for (const rate of weeklyRates) {
            try {
                const response = await fetch(`/.netlify/functions/getFredReport?reportName=${encodeURIComponent(rate.label)}`);
                const data = await response.json();
                if (response.ok && data.series_id === rate.seriesId) {
                    document.getElementById(`${rate.id}-this-week`).textContent = data.latest !== null ? `${data.latest.toFixed(2)}%` : '--';
                    document.getElementById(`${rate.id}-last-week`).textContent = '--'; // Placeholder as discussed
                    document.getElementById(`${rate.id}-last-month`).textContent = data.last_month !== null ? `${data.last_month.toFixed(2)}%` : '--';
                    document.getElementById(`${rate.id}-last-year`).textContent = data.year_ago !== null ? `${data.year_ago.toFixed(2)}%` : '--';
                } else {
                    console.warn(`Failed to fetch/match FRED Weekly Data for ${rate.label}:`, data.message || response.statusText);
                    document.getElementById(`${rate.id}-this-week`).textContent = 'Error';
                    document.getElementById(`${rate.id}-last-week`).textContent = 'Error';
                    document.getElementById(`${rate.id}-last-month`).textContent = 'Error';
                    document.getElementById(`${rate.id}-last-year`).textContent = 'Error';
                }
            } catch (error) {
                console.error(`Error fetching FRED Weekly Data for ${rate.label}:`, error);
                document.getElementById(`${rate.id}-this-week`).textContent = 'Error';
                document.getElementById(`${rate.id}-last-week`).textContent = 'Error';
                document.getElementById(`${rate.id}-last-month`).textContent = 'Error';
                document.getElementById(`${rate.id}-last-year`).textContent = 'Error';
            }
        }
        document.getElementById('weekly-data-updated').textContent = formatTimestamp(new Date().toISOString()); // Use current time or a 'max(data.latest_date)'


        // Monthly Data (Housing, Permits, Retail Sales)
        const monthlyData = [
            { id: 'monthly-housing-starts', label: 'Total Housing Starts', seriesId: 'HOUST' },
            { id: 'monthly-permits', label: 'Building Permits', seriesId: 'PERMIT' },
            { id: 'monthly-sf-housing-starts', label: 'Single-Family Housing Starts', seriesId: 'HOUST1F' },
            { id: 'monthly-sf-permits', label: 'Single-Family Permits', seriesId: 'PERMIT1' },
            { id: 'monthly-retail-sales', label: 'Retail Sales (Excl. Food)', seriesId: 'RSXFS' },
        ];

        for (const dataPoint of monthlyData) {
            try {
                const response = await fetch(`/.netlify/functions/getFredReport?reportName=${encodeURIComponent(dataPoint.label)}`);
                const data = await response.json();
                if (response.ok && data.series_id === dataPoint.seriesId) {
                    document.getElementById(`${dataPoint.id}-current`).textContent = data.latest !== null ? formatNumericValue(data.latest, 0) : '--'; // Round to whole numbers
                    document.getElementById(`${dataPoint.id}-last-month`).textContent = data.last_month !== null ? formatNumericValue(data.last_month, 0) : '--';
                    document.getElementById(`${dataPoint.id}-last-year`).textContent = data.year_ago !== null ? formatNumericValue(data.year_ago, 0) : '--';
                    document.getElementById(`${dataPoint.id}-next`).textContent = '--'; // Placeholder as discussed
                } else {
                    console.warn(`Failed to fetch/match FRED Monthly Data for ${dataPoint.label}:`, data.message || response.statusText);
                    document.getElementById(`${dataPoint.id}-current`).textContent = 'Error';
                    document.getElementById(`${dataPoint.id}-last-month`).textContent = 'Error';
                    document.getElementById(`${dataPoint.id}-last-year`).textContent = 'Error';
                    document.getElementById(`${dataPoint.id}-next`).textContent = 'Error';
                }
            } catch (error) {
                console.error(`Error fetching FRED Monthly Data for ${dataPoint.label}:`, error);
                document.getElementById(`${dataPoint.id}-current`).textContent = 'Error';
                document.getElementById(`${dataPoint.id}-last-month`).textContent = 'Error';
                document.getElementById(`${dataPoint.id}-last-year`).textContent = 'Error';
                document.getElementById(`${dataPoint.id}-next`).textContent = 'Error';
            }
        }
        document.getElementById('monthly-data-updated').textContent = formatTimestamp(new Date().toISOString()); // Use current time or 'max(data.latest_date)' for monthlies

    } catch (error) {
        console.error('Overall Error in fetchFredData:', error);
        // Set FRED section timestamp to error
        document.getElementById('fred-timestamp').textContent = 'Error loading FRED data';
    }
}


// Function to update the overall last updated timestamp in the header
function updateOverallTimestamp() {
    console.log("Updating overall timestamp...");
    const overallTimestampElement = document.getElementById('last-updated-overall');
    if (overallTimestampElement) {
        overallTimestampElement.textContent = `Last Refreshed: ${formatTimestamp(new Date().toISOString())}`;
    }
}

// Initial data fetches and set up refresh intervals
document.addEventListener('DOMContentLoaded', () => {
    // Initial fetches
    fetchMarketData(); // Combines MBS, Shadow, US10Y
    fetchFredData(); // Combines Daily, Weekly, Monthly FRED data
    updateOverallTimestamp(); // Update immediately on load

    // Set up refresh intervals
    // Market data (MBS, Shadow, US10Y) updates more frequently (e.g., every 5 minutes)
    setInterval(fetchMarketData, 5 * 60 * 1000); // 5 minutes

    // FRED data updates less frequently (e.g., every 60 minutes or longer for monthly data)
    setInterval(fetchFredData, 60 * 60 * 1000); // 60 minutes

    // Overall timestamp updates more frequently to show activity
    setInterval(updateOverallTimestamp, 60 * 1000); // Every 1 minute
});
