// React Component Example for NSE Real-time Dashboard
// Install: npm install react react-dom

import React, { useState, useEffect, useCallback } from 'react';

const NSEDashboard = () => {
  const [ws, setWs] = useState(null);
  const [connected, setConnected] = useState(false);
  const [quotes, setQuotes] = useState([]);
  const [symbols, setSymbols] = useState('INFY,TCS,RELIANCE,WIPRO,HDFCBANK');
  const [lastUpdate, setLastUpdate] = useState(null);

  // WebSocket connection
  useEffect(() => {
    const websocket = new WebSocket('ws://localhost:8000/ws');

    websocket.onopen = () => {
      console.log('WebSocket connected');
      setConnected(true);
      setWs(websocket);
      
      // Auto-subscribe to default stocks
      websocket.send(JSON.stringify({
        action: 'subscribe',
        symbols: symbols.split(',').map(s => s.trim())
      }));
    };

    websocket.onmessage = (event) => {
      const message = JSON.parse(event.data);
      
      if (message.type === 'quotes') {
        setQuotes(message.data);
        setLastUpdate(new Date(message.timestamp));
      }
    };

    websocket.onerror = (error) => {
      console.error('WebSocket error:', error);
      setConnected(false);
    };

    websocket.onclose = () => {
      console.log('WebSocket disconnected');
      setConnected(false);
      
      // Reconnect after 5 seconds
      setTimeout(() => window.location.reload(), 5000);
    };

    // Cleanup
    return () => {
      if (websocket.readyState === WebSocket.OPEN) {
        websocket.close();
      }
    };
  }, []);

  // Keep-alive ping
  useEffect(() => {
    const interval = setInterval(() => {
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ action: 'ping' }));
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [ws]);

  const subscribeToStocks = useCallback(() => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      const symbolList = symbols.split(',').map(s => s.trim()).filter(s => s);
      ws.send(JSON.stringify({
        action: 'subscribe',
        symbols: symbolList
      }));
    }
  }, [ws, symbols]);

  const unsubscribe = useCallback(() => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ action: 'unsubscribe' }));
      setQuotes([]);
    }
  }, [ws]);

  return (
    <div className="container" style={styles.container}>
      <h1 style={styles.title}>📈 NSE Real-time Market Dashboard</h1>
      
      <div style={{
        ...styles.status,
        backgroundColor: connected ? '#d4edda' : '#f8d7da',
        color: connected ? '#155724' : '#721c24'
      }}>
        {connected ? 'Connected ✓' : 'Disconnected ✗'}
      </div>

      <div style={styles.controls}>
        <input
          type="text"
          value={symbols}
          onChange={(e) => setSymbols(e.target.value)}
          placeholder="Enter stock symbols (e.g., INFY, TCS, RELIANCE)"
          style={styles.input}
        />
        <button onClick={subscribeToStocks} style={styles.button}>
          Subscribe
        </button>
        <button onClick={unsubscribe} style={styles.button}>
          Clear
        </button>
      </div>

      <div style={styles.stockGrid}>
        {quotes.map(stock => (
          <StockCard key={stock.symbol} stock={stock} />
        ))}
      </div>

      {lastUpdate && (
        <div style={styles.timestamp}>
          Last updated: {lastUpdate.toLocaleTimeString()}
        </div>
      )}
    </div>
  );
};

const StockCard = ({ stock }) => {
  const isPositive = stock.change >= 0;

  return (
    <div style={{
      ...styles.stockCard,
      borderLeft: `5px solid ${isPositive ? '#28a745' : '#dc3545'}`
    }}>
      <div style={styles.stockSymbol}>{stock.symbol}</div>
      <div style={styles.stockPrice}>₹{stock.lastPrice?.toFixed(2) || 'N/A'}</div>
      <div style={{
        ...styles.stockChange,
        color: isPositive ? '#28a745' : '#dc3545'
      }}>
        {isPositive ? '▲' : '▼'} {stock.change?.toFixed(2) || '0.00'} 
        ({stock.pChange?.toFixed(2) || '0.00'}%)
      </div>

      <div style={styles.stockDetails}>
        <DetailItem label="Open" value={`₹${stock.open?.toFixed(2) || 'N/A'}`} />
        <DetailItem label="High" value={`₹${stock.high?.toFixed(2) || 'N/A'}`} />
        <DetailItem label="Low" value={`₹${stock.low?.toFixed(2) || 'N/A'}`} />
        <DetailItem label="Prev Close" value={`₹${stock.previousClose?.toFixed(2) || 'N/A'}`} />
      </div>
    </div>
  );
};

const DetailItem = ({ label, value }) => (
  <div style={styles.detailItem}>
    <span style={styles.detailLabel}>{label}</span>
    <span style={styles.detailValue}>{value}</span>
  </div>
);

const styles = {
  container: {
    maxWidth: '1400px',
    margin: '0 auto',
    padding: '30px',
    backgroundColor: 'white',
    borderRadius: '20px',
    boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
  },
  title: {
    color: '#333',
    marginBottom: '10px'
  },
  status: {
    padding: '10px 20px',
    borderRadius: '8px',
    display: 'inline-block',
    marginBottom: '20px',
    fontWeight: 'bold'
  },
  controls: {
    marginBottom: '30px',
    display: 'flex',
    gap: '10px',
    flexWrap: 'wrap'
  },
  input: {
    padding: '12px 20px',
    border: '2px solid #ddd',
    borderRadius: '8px',
    fontSize: '16px',
    flex: 1,
    minWidth: '250px'
  },
  button: {
    padding: '12px 30px',
    background: '#667eea',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    cursor: 'pointer',
    transition: 'all 0.3s'
  },
  stockGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gap: '20px',
    marginTop: '20px'
  },
  stockCard: {
    background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
    padding: '20px',
    borderRadius: '12px',
    boxShadow: '0 5px 15px rgba(0,0,0,0.1)',
    transition: 'transform 0.3s'
  },
  stockSymbol: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#333',
    marginBottom: '10px'
  },
  stockPrice: {
    fontSize: '32px',
    fontWeight: 'bold',
    color: '#667eea',
    margin: '10px 0'
  },
  stockChange: {
    fontSize: '18px',
    fontWeight: 'bold'
  },
  stockDetails: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '10px',
    marginTop: '15px',
    paddingTop: '15px',
    borderTop: '1px solid rgba(0,0,0,0.1)'
  },
  detailItem: {
    display: 'flex',
    flexDirection: 'column'
  },
  detailLabel: {
    fontSize: '12px',
    color: '#666',
    textTransform: 'uppercase'
  },
  detailValue: {
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#333'
  },
  timestamp: {
    textAlign: 'center',
    color: '#666',
    marginTop: '20px',
    fontSize: '14px'
  }
};

export default NSEDashboard;
