import React, { useContext, useEffect, useRef, useState } from "react";
import Chart from "../components/Chart";
import { AuthContext } from "../context/AuthContext";
import { getWatchlist, saveWatchlist, fetchPrices } from "../services/api";

export default function Home() {
  const { user, logout } = useContext(AuthContext);
  const [symbol, setSymbol] = useState("");
  const [watchlist, setWatchlist] = useState([]);
  const [prices, setPrices] = useState([]);
  const [alerts, setAlerts] = useState({});
  const [selectedSymbol, setSelectedSymbol] = useState(null);
  const [showChart, setShowChart] = useState(true);
  const [modalSymbol, setModalSymbol] = useState(null);
  const hasLoadedWatchlist = useRef(false);

  useEffect(() => {
    if (!user) return;
    getWatchlist()
      .then(({ symbols, alerts }) => {
        setWatchlist(symbols);
        setAlerts(alerts);
        if (symbols.length) setSelectedSymbol(symbols[0]);
        hasLoadedWatchlist.current = true;
      })
      .catch(console.error);
  }, [user]);

  useEffect(() => {
    if (!user || !hasLoadedWatchlist.current) return;
    saveWatchlist(watchlist, alerts).catch(console.error);
  }, [watchlist, alerts, user]);

  useEffect(() => {
    if (!watchlist.length) return;
    const fetchAll = async () => {
      try {
        const data = await fetchPrices(watchlist);
        setPrices(data);
        if (!selectedSymbol && data.length) {
          setSelectedSymbol(data[0].symbol);
        }
        for (const p of data) {
          const alertValue = parseFloat(alerts[p.symbol]);
          if (!isNaN(alertValue) && p.price <= alertValue) {
            setModalSymbol(p.symbol);
            break;
          }
        }
      } catch (err) {
        console.error("Failed to fetch prices", err);
      }
    };
    fetchAll();
    const id = setInterval(fetchAll, 5000);
    return () => clearInterval(id);
  }, [watchlist, selectedSymbol]);

  const addSymbol = (e) => {
    e.preventDefault();
    const sym = symbol.toUpperCase().trim();
    if (sym && !watchlist.includes(sym)) {
      setWatchlist((prev) => [...prev, sym]);
      setSymbol("");
    }
  };

  const removeSymbol = (sym) => {
    setWatchlist((prev) => prev.filter((s) => s !== sym));
    setPrices((prev) => prev.filter((p) => p.symbol !== sym));
    setAlerts((prev) => {
      const { [sym]: _, ...rest } = prev;
      return rest;
    });
    if (selectedSymbol === sym) setSelectedSymbol(null);
  };

  const setAlertPrice = (sym, value) => {
    setAlerts((prev) => ({ ...prev, [sym]: value }));
  };

  return (
    <div className="page-wrapper">
      <div className="glass-card">
        <header className="header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h1>Stock Tracker</h1>
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            {user?.email && <span style={{ fontWeight: "bold" }}>{user.email}</span>}
            <button onClick={logout} className="button">Logout</button>
          </div>
        </header>

        <section className="add-stock">
          <form onSubmit={addSymbol}>
            <input
              className="input"
              placeholder="Enter ticker, e.g. AAPL"
              value={symbol}
              onChange={(e) => setSymbol(e.target.value)}
            />
            <button className="button" type="submit">Add</button>
          </form>
        </section>

        <section className="watchlist">
          <h2>Your Watchlist</h2>
          {prices.length ? (
            <table>
              <thead>
                <tr>
                  <th>Symbol</th>
                  <th>Price</th>
                  <th>Change (%)</th>
                  <th>Alert ≤</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {prices.map((p) => {
                  const raw = alerts[p.symbol];
                  const alertPrice = raw !== undefined && raw !== "" ? Number(raw) : null;
                  const isAlert = alertPrice !== null && !isNaN(alertPrice) && p.price <= alertPrice;

                  return (
                    <tr key={p.symbol} className={isAlert ? "alert flash" : ""}>
                      <td onClick={() => setSelectedSymbol(p.symbol)} style={{ cursor: "pointer" }}>{p.symbol}</td>
                      <td>{p.price.toFixed(2)}</td>
                      <td className={p.change >= 0 ? "positive" : "negative"}>{p.change.toFixed(2)}</td>
                      <td>
                        <input
                          className="alert-input"
                          type="number"
                          placeholder="Price"
                          value={alerts[p.symbol] || ""}
                          onChange={(e) => setAlertPrice(p.symbol, e.target.value)}
                        />
                      </td>
                      <td>
                        <button className="remove-button" onClick={() => removeSymbol(p.symbol)}>Remove</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <p>No stocks in your watchlist yet.</p>
          )}
        </section>

        <section className="chart">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h2>
              Price Chart
              {selectedSymbol && (
                <span style={{ marginLeft: "1rem", fontSize: "1.1rem", opacity: 0.7 }}>
                  ({selectedSymbol.toUpperCase()})
                </span>
              )}
            </h2>
            {showChart && (
              <button className="button" onClick={() => setShowChart(false)}>Close Chart</button>
            )}
            {!showChart && (
              <button className="button" onClick={() => setShowChart(true)}>Open Chart</button>
            )}
          </div>
          {showChart && selectedSymbol ? (
            <Chart symbol={selectedSymbol} />
          ) : (
            showChart && <div className="chart-placeholder">Select a stock to view its price chart</div>
          )}
        </section>

        {modalSymbol && (
          <div className="modal-backdrop">
            <div className="modal">
              <h2>⚠️ Price Alert!</h2>
              <p>{modalSymbol} has hit your alert price.</p>
              <button onClick={() => setModalSymbol(null)}>OK</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
