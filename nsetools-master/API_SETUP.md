# Real-time NSE Dashboard Setup Guide

## Quick Start (3 Steps)

### Step 1: Install Dependencies
```bash
# Install NSETools
pip install -e .

# Install API server dependencies
pip install fastapi uvicorn[standard] websockets
```

### Step 2: Start the Backend Server
```bash
# Run the FastAPI server
python api_server.py

# Or with uvicorn directly
uvicorn api_server:app --reload --host 0.0.0.0 --port 8000
```

Server will start at: `http://localhost:8000`

### Step 3: Open the Dashboard
```bash
# Option A: Open the HTML dashboard directly in browser
# Just open dashboard_example.html in Chrome/Firefox

# Option B: Serve with a simple HTTP server
python -m http.server 3000
# Then visit: http://localhost:3000/dashboard_example.html
```

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Your Dashboard                          │
│              (React/Vue/Vanilla JS)                         │
│                                                             │
│  Component subscribes to stocks: ["INFY", "TCS", ...]      │
└──────────────────────┬──────────────────────────────────────┘
                       │ WebSocket Connection
                       │ ws://localhost:8000/ws
┌──────────────────────▼──────────────────────────────────────┐
│              FastAPI Server (api_server.py)                 │
│                                                             │
│  • REST Endpoints: /api/stock/{symbol}                     │
│  • WebSocket: Real-time streaming                          │
│  • Updates every 5 seconds                                 │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│                   NSETools Library                          │
│                                                             │
│  nse = Nse()                                               │
│  nse.get_quote('INFY')                                     │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│                NSE India APIs                              │
│          https://www.nseindia.com/api/...                  │
└─────────────────────────────────────────────────────────────┘
```

---

## API Endpoints

### REST API
- `GET /` - API documentation
- `GET /api/stock/{symbol}` - Get stock quote
- `GET /api/index/{index_name}` - Get index quote
- `GET /api/gainers?index=NIFTY` - Top gainers
- `GET /api/losers?index=NIFTY` - Top losers
- `GET /api/indices` - All indices
- `GET /api/stocks-in-index/{index_name}` - Stocks with quotes

### WebSocket
- `ws://localhost:8000/ws` - Real-time data stream

#### WebSocket Protocol

**Subscribe to stocks:**
```json
{
  "action": "subscribe",
  "symbols": ["INFY", "TCS", "RELIANCE"]
}
```

**Unsubscribe:**
```json
{
  "action": "unsubscribe"
}
```

**Keep-alive ping:**
```json
{
  "action": "ping"
}
```

**Server sends quote updates:**
```json
{
  "type": "quotes",
  "data": [
    {
      "symbol": "INFY",
      "lastPrice": 1425.30,
      "change": 12.50,
      "pChange": 0.88,
      "open": 1420.00,
      "high": 1430.50,
      "low": 1418.00,
      "previousClose": 1412.80,
      "vwap": 1424.15
    }
  ],
  "timestamp": "2026-01-22T14:30:15.123Z"
}
```

---

## Integration with Your Dashboard

### Option 1: Vanilla JavaScript (Easiest)
Just open `dashboard_example.html` - it's ready to use!

### Option 2: React
```jsx
import NSEDashboard from './react_example';

function App() {
  return <NSEDashboard />;
}
```

### Option 3: Vue 3
```vue
<template>
  <div class="dashboard">
    <h1>NSE Dashboard</h1>
    <div v-for="stock in quotes" :key="stock.symbol">
      {{ stock.symbol }}: ₹{{ stock.lastPrice }}
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';

const ws = ref(null);
const quotes = ref([]);

onMounted(() => {
  ws.value = new WebSocket('ws://localhost:8000/ws');
  
  ws.value.onopen = () => {
    ws.value.send(JSON.stringify({
      action: 'subscribe',
      symbols: ['INFY', 'TCS', 'RELIANCE']
    }));
  };
  
  ws.value.onmessage = (event) => {
    const message = JSON.parse(event.data);
    if (message.type === 'quotes') {
      quotes.value = message.data;
    }
  };
});

onUnmounted(() => {
  if (ws.value) ws.value.close();
});
</script>
```

---

## Customization

### Change Update Frequency
In `api_server.py`, line ~195:
```python
# Update every 5 seconds (NSE data updates ~5-10 seconds)
await asyncio.sleep(5)  # Change this value
```

### Add More Endpoints
```python
@app.get("/api/my-custom-endpoint")
async def my_custom_endpoint():
    # Use any NSETools method
    data = nse.get_52_week_high()
    return {"success": True, "data": data}
```

### CORS Configuration
In `api_server.py`, line ~23:
```python
allow_origins=["http://localhost:3000"],  # Your frontend URL
```

---

## Production Deployment

### Docker
```dockerfile
FROM python:3.11-slim

WORKDIR /app
COPY . /app

RUN pip install -e . && \
    pip install fastapi uvicorn[standard] websockets

EXPOSE 8000
CMD ["uvicorn", "api_server:app", "--host", "0.0.0.0", "--port", "8000"]
```

Build and run:
```bash
docker build -t nse-api .
docker run -p 8000:8000 nse-api
```

### Using Nginx as Reverse Proxy
```nginx
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }
}
```

---

## Troubleshooting

### WebSocket not connecting
- Check if backend is running: `curl http://localhost:8000/`
- Check browser console for errors
- Verify WebSocket URL matches server port

### No data updating
- Ensure you've subscribed to stocks
- Check if NSE market is open (Mon-Fri, 9:15 AM - 3:30 PM IST)
- Check server logs for API errors

### Rate limiting
- NSE may block too many requests
- Default 5-second updates are safe
- Don't go below 3 seconds

### CORS errors
- Update `allow_origins` in `api_server.py`
- For development, use `allow_origins=["*"]`

---

## Performance Tips

1. **Subscribe only to needed stocks** (max 10-15 recommended)
2. **Update interval:** 5 seconds is optimal for NSE data
3. **Use WebSockets** instead of polling REST endpoints
4. **Cache on client side** for smooth UI updates

---

## Market Hours
- **NSE Trading Hours:** 9:15 AM - 3:30 PM IST (Mon-Fri)
- Outside market hours, you'll get last closing prices
- Pre-market: 9:00 AM - 9:15 AM
- Post-market: 3:30 PM - 4:00 PM

---

## Next Steps

1. ✅ Start the backend: `python api_server.py`
2. ✅ Open dashboard: `dashboard_example.html`
3. ✅ Integrate into your React/Vue app
4. ✅ Customize styling and features
5. ✅ Deploy to production

Happy Trading! 📈
