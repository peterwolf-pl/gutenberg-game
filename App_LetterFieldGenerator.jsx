import React, { useMemo, useState } from "react";
import LetterFieldGenerator from "./LetterFieldGenerator";
import LetterFieldEditor from "./LetterFieldEditor";

const KASZTA_VARIANTS = {
  kaszta: {
    label: "Kaszta podstawowa",
    image: "/assets/kaszta.png",
    poz: "/poz.json",
  },
  szuflada: {
    label: "Szuflada",
    image: "/assets/kaszta_szuflada.png",
    poz: "/poz_szuflada.json",
  },
};

const NAV_ITEMS = [
  { id: "generator", label: "Generator pól" },
  { id: "editor", label: "Edytor pól" },
];

function NavButton({ active, label, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "10px 18px",
        borderRadius: 999,
        border: "1px solid",
        borderColor: active ? "#1d4ed8" : "rgba(148, 163, 184, 0.6)",
        background: active ? "#1d4ed8" : "rgba(255,255,255,0.65)",
        color: active ? "#fff" : "#0f172a",
        fontWeight: 600,
        cursor: "pointer",
        transition: "all 0.2s ease",
        boxShadow: active
          ? "0 8px 18px rgba(29, 78, 216, 0.25)"
          : "0 4px 12px rgba(15, 23, 42, 0.12)",
      }}
    >
      {label}
    </button>
  );
}

function App() {
  const [view, setView] = useState("generator");
  const [variant, setVariant] = useState("kaszta");

  const kasztaConfig = useMemo(
    () => KASZTA_VARIANTS[variant] ?? KASZTA_VARIANTS.kaszta,
    [variant]
  );

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(180deg, #e2e8f0 0%, #cbd5f5 40%, #f8fafc 100%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "32px",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 1280,
          background: "rgba(255,255,255,0.92)",
          borderRadius: 24,
          padding: "32px",
          boxShadow: "0 40px 120px rgba(15, 23, 42, 0.18)",
          backdropFilter: "blur(9px)",
        }}
      >
        <header
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 16,
            marginBottom: 28,
          }}
        >
          <div>
            <h1
              style={{
                fontSize: 32,
                margin: 0,
                color: "#0f172a",
                letterSpacing: "0.02em",
              }}
            >
              Panel administratora
            </h1>
            <p style={{ margin: "6px 0 0", color: "#475569", maxWidth: 720 }}>
              Zarządzaj polami liter kaszty: generuj nowe współrzędne oraz
              edytuj istniejące wpisy bezpośrednio na podglądzie kaszty.
            </p>
          </div>

          <nav
            style={{
              display: "flex",
              gap: 12,
              flexWrap: "wrap",
              alignItems: "center",
            }}
          >
            {NAV_ITEMS.map(item => (
              <NavButton
                key={item.id}
                active={view === item.id}
                label={item.label}
                onClick={() => setView(item.id)}
              />
            ))}

            {view === "editor" && (
              <label
                style={{
                  marginLeft: "auto",
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  fontWeight: 500,
                  color: "#1e293b",
                  padding: "6px 12px",
                  background: "rgba(226, 232, 240, 0.72)",
                  borderRadius: 999,
                }}
              >
                Wybierz kasztę:
                <select
                  value={variant}
                  onChange={event => setVariant(event.target.value)}
                  style={{
                    borderRadius: 999,
                    border: "1px solid rgba(148, 163, 184, 0.7)",
                    padding: "6px 12px",
                    fontWeight: 600,
                    color: "#0f172a",
                    background: "#fff",
                    cursor: "pointer",
                  }}
                >
                  {Object.entries(KASZTA_VARIANTS).map(([value, option]) => (
                    <option key={value} value={value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </nav>
        </header>

        <div style={{ background: "#f8fafc", borderRadius: 24, padding: 24 }}>
          {view === "generator" ? (
            <LetterFieldGenerator />
          ) : (
            <LetterFieldEditor
              kasztaImage={kasztaConfig.image}
              pozSrc={kasztaConfig.poz}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
