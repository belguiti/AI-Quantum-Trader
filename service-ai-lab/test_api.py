import requests

url = "http://localhost:8002/lab/train"
payload = {
    "symbol": "BTC-USD",
    "startDate": "2023-01-01",
    "endDate": "2023-12-31",
    "indicators": ["RSI", "MACD"],
    "targetWinRate": 0.60,
    "trials": 5
}

response = requests.post(url, json=payload)
print(response.status_code)
print(response.json())
