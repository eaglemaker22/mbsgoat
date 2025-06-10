return {
  statusCode: 200,
  body: JSON.stringify({
    "Retail Sales (Excl. Food)": {
      latest: "0.2%",
      last_month: "0.1%",
      year_ago: "1.5%",
      latest_date: "2025-06-01"
    },
    ...
  })
}
