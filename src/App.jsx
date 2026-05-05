import { useEffect, useState } from "react";
import "./App.css";

const API_URL = "https://restockdex-production.up.railway.app";

function App() {
  const [liveData, setLiveData] = useState([]);
  const [trafficData, setTrafficData] = useState(null);
  const [postcode, setPostcode] = useState(
    localStorage.getItem("restockdex_postcode") || ""
  );
  const [savedPostcode, setSavedPostcode] = useState(
    localStorage.getItem("restockdex_postcode") || ""
  );
  const [seenLinks, setSeenLinks] = useState(new Set());
  const [notificationPermission, setNotificationPermission] = useState(
    "Notification" in window ? Notification.permission : "unsupported"
  );

  useEffect(() => {
    fetchStock();
    fetchTraffic();

    const interval = setInterval(() => {
      fetchStock();
      fetchTraffic();
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  async function requestNotifications() {
    if (!("Notification" in window)) {
      alert("Your browser does not support notifications.");
      setNotificationPermission("unsupported");
      return;
    }

    const permission = await Notification.requestPermission();
    setNotificationPermission(permission);

    if (permission === "granted") {
      new Notification("RestockDex alerts enabled 🔔", {
        body: "You’ll be notified when new Pokémon drops are detected.",
      });
    }
  }

  async function fetchStock() {
    try {
      const res = await fetch(`${API_URL}/stock`);
      const data = await res.json();

      setSeenLinks((currentSeenLinks) => {
        const updatedSeenLinks = new Set(currentSeenLinks);

        data.forEach((item) => {
          const isNewDrop = item.stock?.includes("NEW DROP");
          const hasNotBeenNotified = !updatedSeenLinks.has(item.link);

          if (isNewDrop && hasNotBeenNotified) {
            updatedSeenLinks.add(item.link);

            if ("Notification" in window && Notification.permission === "granted") {
              new Notification("🚨 New Pokémon Drop!", {
                body: item.product,
              });
            }
          }
        });

        return updatedSeenLinks;
      });

      setLiveData(data);
    } catch (error) {
      console.error("Stock error:", error);
    }
  }

  async function fetchTraffic() {
    try {
      const res = await fetch(`${API_URL}/pokemon-center-traffic`);
      const data = await res.json();
      setTrafficData(data[0]);
    } catch (error) {
      console.error("Traffic error:", error);
    }
  }

  function savePostcode() {
    if (!postcode.trim()) {
      alert("Please enter a postcode.");
      return;
    }

    const cleanPostcode = postcode.trim().toUpperCase();
    localStorage.setItem("restockdex_postcode", cleanPostcode);
    setPostcode(cleanPostcode);
    setSavedPostcode(cleanPostcode);
  }

  const isHighTraffic = trafficData?.stock?.includes("POSSIBLE DROP");

  return (
    <div className="page">
      <div className="app">
        <header className="hero">
          <h1 className="textLogo">RestockDex</h1>
          <p className="eyebrow">UK Pokémon TCG Drop Monitor</p>
          <p className="subtitle">
            Live Pokémon drops, store tracking and Pokémon Center traffic alerts.
          </p>

          <div className="statusBox">
            <span className="statusDot"></span>
            Live Monitoring
          </div>

          <div className="notificationBox">
            <h3>🔔 Drop Notifications</h3>

            {notificationPermission === "granted" && (
              <p className="notifEnabled">
                Notifications are enabled. You’ll be alerted when new drops are detected.
              </p>
            )}

            {notificationPermission === "denied" && (
              <p className="notifBlocked">
                Notifications are blocked. Enable them in your browser settings to receive alerts.
              </p>
            )}

            {notificationPermission === "default" && (
              <>
                <p>
                  Turn on browser alerts so you don’t miss new Pokémon drops.
                </p>
                <button className="notifyButton" onClick={requestNotifications}>
                  Enable Drop Alerts
                </button>
              </>
            )}

            {notificationPermission === "unsupported" && (
              <p className="notifBlocked">
                This browser does not support notifications.
              </p>
            )}
          </div>
        </header>

        <section className="trafficSection">
          <div className="trafficPanel">
            <h2>Pokémon Center Traffic</h2>

            <span className={isHighTraffic ? "pill danger" : "pill success"}>
              {isHighTraffic ? "High Traffic" : "Low Traffic"}
            </span>

            <div className={`trafficCard ${isHighTraffic ? "high" : "low"}`}>
              <h3>
                {!trafficData
                  ? "🟡 Monitor Starting"
                  : isHighTraffic
                  ? "🚨 Possible Drop"
                  : "🟢 Normal Activity"}
              </h3>

              <p>
                {trafficData
                  ? trafficData.stock
                  : "Monitor active — checking every 60 seconds"}
              </p>

              <a
                href="https://www.pokemoncenter.com/en-gb/category/new-releases"
                target="_blank"
                className="viewButton"
              >
                Open Pokémon Center
              </a>
            </div>
          </div>
        </section>

        <section className="panel">
          <h2>Filters</h2>

          <input
            className="input"
            placeholder="Enter postcode"
            value={postcode}
            onChange={(e) => setPostcode(e.target.value.toUpperCase())}
          />

          <button className="saveButton" onClick={savePostcode}>
            Save Postcode
          </button>

          {savedPostcode && (
            <p className="savedPostcode">
              Tracking near <strong>{savedPostcode}</strong>
            </p>
          )}
        </section>

        <section className="panel">
          <h2>Live Drops</h2>

          <div className="dropList">
            {liveData.map((item, index) => {
              const isNew = item.stock?.includes("NEW DROP");

              return (
                <div
                  key={index}
                  className={isNew ? "dropCard newDrop" : "dropCard"}
                >
                  <div>
                    <span className="store">{item.store}</span>
                    <h3>{item.product}</h3>
                    <span className={isNew ? "pill danger" : "pill neutral"}>
                      {item.stock}
                    </span>
                  </div>

                  <a href={item.link} target="_blank" className="viewButton">
                    View
                  </a>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}

export default App;