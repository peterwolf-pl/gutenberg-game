import React, { useEffect, useMemo, useRef, useState } from "react";

const KASZTA_WIDTH = 2222;
const KASZTA_HEIGHT = 1521;

function formatFieldLabel(field, index) {
  const base = field?.char ? field.char : `Pozycja ${index + 1}`;
  return `${index + 1}. ${base}`;
}

function ensureNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export default function LetterFieldEditor({
  kasztaImage = "/assets/kaszta.png",
  pozSrc = "/poz.json",
}) {
  const [fields, setFields] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(null);
  const [step, setStep] = useState(0);
  const [clicks, setClicks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [displaySize, setDisplaySize] = useState({
    width: KASZTA_WIDTH,
    height: KASZTA_HEIGHT,
  });
  const kasztaRef = useRef(null);

  useEffect(() => {
    let ignore = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(pozSrc);
        if (!response.ok) {
          throw new Error(`Nie udało się pobrać pliku pozycji: ${response.status}`);
        }
        const data = await response.json();
        if (!ignore) {
          setFields(Array.isArray(data) ? data : []);
          setSelectedIndex(Array.isArray(data) && data.length > 0 ? 0 : null);
        }
      } catch (err) {
        if (!ignore) {
          console.error(err);
          setError(err.message || "Błąd podczas wczytywania pozycji");
          setFields([]);
          setSelectedIndex(null);
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    load();
    return () => {
      ignore = true;
    };
  }, [pozSrc]);

  useEffect(() => {
    function updateSize() {
      if (!kasztaRef.current) return;
      const rect = kasztaRef.current.getBoundingClientRect();
      setDisplaySize({ width: rect.width, height: rect.height });
    }

    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  const selectedField = useMemo(
    () => (selectedIndex != null ? fields[selectedIndex] : null),
    [fields, selectedIndex]
  );

  function updateSelectedField(patch) {
    if (selectedIndex == null) return;
    setFields(prev =>
      prev.map((field, index) =>
        index === selectedIndex ? { ...field, ...patch } : field
      )
    );
  }

  function handleKasztaClick(event) {
    if (selectedIndex == null || !kasztaRef.current) {
      return;
    }

    const rect = kasztaRef.current.getBoundingClientRect();
    const scaleX = KASZTA_WIDTH / rect.width;
    const scaleY = KASZTA_HEIGHT / rect.height;
    const x = Math.round((event.clientX - rect.left) * scaleX);
    const y = Math.round((event.clientY - rect.top) * scaleY);

    if (step === 0) {
      setClicks([{ x, y }]);
      setStep(1);
    } else {
      updateSelectedField({
        x1: clicks[0].x,
        y1: clicks[0].y,
        x2: x,
        y2: y,
      });
      setClicks([]);
      setStep(0);
    }
  }

  function handleFieldSelect(index) {
    setSelectedIndex(index);
    setStep(0);
    setClicks([]);
  }

  function handleCharChange(event) {
    updateSelectedField({ char: event.target.value });
  }

  function handleImgChange(event) {
    updateSelectedField({ img: event.target.value });
  }

  function handleCoordinateChange(key, value) {
    updateSelectedField({ [key]: ensureNumber(value) });
  }

  function handleDeleteSelected() {
    if (selectedIndex == null) return;
    setFields(prev => {
      const next = prev.filter((_, index) => index !== selectedIndex);
      setSelectedIndex(() => {
        if (next.length === 0) return null;
        if (selectedIndex >= next.length) return next.length - 1;
        return selectedIndex;
      });
      return next;
    });
    setStep(0);
    setClicks([]);
  }

  function handleAddField() {
    const newField = {
      char: "",
      x1: 0,
      y1: 0,
      x2: 0,
      y2: 0,
      img: "",
    };
    setFields(prev => {
      const next = [...prev, newField];
      setSelectedIndex(next.length - 1);
      return next;
    });
    setStep(0);
    setClicks([]);
  }

  function handleAutoImage() {
    if (!selectedField) return;
    const safeChar = (selectedField.char || "").trim();
    if (!safeChar) return;
    const postfix = safeChar.length === 1 && safeChar === safeChar.toUpperCase()
      ? `${safeChar}${safeChar}`
      : safeChar;
    const normalized = postfix === "spacja" ? "spacja" : postfix;
    const path = `/assets/letters/${normalized}.png`;
    updateSelectedField({ img: path });
  }

  const jsonOutput = useMemo(() => JSON.stringify(fields, null, 2), [fields]);

  return (
    <div style={{ maxWidth: 1180, margin: "0 auto", padding: "24px" }}>
      <h1 style={{ fontSize: 28, marginBottom: 12 }}>Edytor pól liter</h1>
      <p style={{ marginBottom: 16, color: "#475569" }}>
        Wczytano pozycje z pliku <code>{pozSrc}</code>. Wybierz literę z listy,
        a następnie kliknij dwa narożniki na kaszcie, aby ustawić jej pole.
      </p>

      {loading && <div>Ładowanie pozycji…</div>}
      {error && (
        <div style={{ color: "#dc2626", marginBottom: 16 }}>
          {error}
        </div>
      )}

      <div style={{ display: "flex", gap: 24 }}>
        <div style={{ flex: 1 }}>
          <div
            ref={kasztaRef}
            style={{
              position: "relative",
              width: "100%",
              maxWidth: KASZTA_WIDTH,
              border: "2px solid #bbb",
              borderRadius: 8,
              cursor: selectedIndex == null ? "not-allowed" : "crosshair",
              background: "#fff",
              overflow: "hidden",
            }}
            onClick={handleKasztaClick}
          >
            <img
              src={kasztaImage}
              alt="Kaszta"
              width={KASZTA_WIDTH}
              height={KASZTA_HEIGHT}
              style={{ width: "100%", height: "auto", display: "block" }}
              onLoad={() => {
                if (!kasztaRef.current) return;
                const rect = kasztaRef.current.getBoundingClientRect();
                setDisplaySize({ width: rect.width, height: rect.height });
              }}
            />

            {fields.map((field, index) => {
              const scaleX = displaySize.width / KASZTA_WIDTH;
              const scaleY = displaySize.height / KASZTA_HEIGHT;
              const left = Math.min(field.x1, field.x2) * scaleX;
              const top = Math.min(field.y1, field.y2) * scaleY;
              const width = Math.abs(field.x2 - field.x1) * scaleX;
              const height = Math.abs(field.y2 - field.y1) * scaleY;
              const isSelected = index === selectedIndex;
              return (
                <div
                  key={`${field.char}-${index}`}
                  onClick={event => {
                    event.stopPropagation();
                    handleFieldSelect(index);
                  }}
                  style={{
                    position: "absolute",
                    left: left,
                    top: top,
                    width: width,
                    height: height,
                    border: isSelected ? "3px solid #f97316" : "2px solid #2563eb",
                    background: isSelected
                      ? "rgba(249, 115, 22, 0.18)"
                      : "rgba(96, 165, 250, 0.16)",
                    boxSizing: "border-box",
                    cursor: "pointer",
                  }}
                >
                  <span
                    style={{
                      position: "absolute",
                      left: 2,
                      top: 2,
                      fontSize: 14,
                      color: "#1d4ed8",
                      fontWeight: "bold",
                      background: "rgba(255,255,255,0.82)",
                      borderRadius: 4,
                      padding: "0 4px",
                    }}
                  >
                    {field.char || `#${index + 1}`}
                  </span>
                </div>
              );
            })}

            {step === 1 && clicks.length === 1 && (
              <div
                style={{
                  position: "absolute",
                  left:
                    (clicks[0].x * displaySize.width) / KASZTA_WIDTH - 3,
                  top:
                    (clicks[0].y * displaySize.height) / KASZTA_HEIGHT - 3,
                  width: 6,
                  height: 6,
                  background: "#f97316",
                  borderRadius: "50%",
                }}
              />
            )}
          </div>
          {selectedField && step === 1 && (
            <div style={{ color: "#f97316", marginTop: 8 }}>
              Wybierz drugi narożnik pola dla litery {selectedField.char || "(bez nazwy)"}.
            </div>
          )}
        </div>

        <div style={{ width: 320, display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2 style={{ fontSize: 20 }}>Lista liter</h2>
              <button
                onClick={handleAddField}
                style={{
                  background: "#10b981",
                  border: "none",
                  color: "white",
                  padding: "4px 10px",
                  borderRadius: 6,
                  cursor: "pointer",
                }}
              >
                Dodaj
              </button>
            </div>
            <div
              style={{
                border: "1px solid #cbd5f5",
                borderRadius: 8,
                maxHeight: 300,
                overflowY: "auto",
                marginTop: 8,
              }}
            >
              {fields.map((field, index) => {
                const isSelected = index === selectedIndex;
                return (
                  <button
                    key={`${field.char}-${index}`}
                    onClick={() => handleFieldSelect(index)}
                    style={{
                      display: "block",
                      width: "100%",
                      textAlign: "left",
                      padding: "8px 12px",
                      border: "none",
                      borderBottom: "1px solid #e2e8f0",
                      background: isSelected ? "#dbeafe" : "white",
                      cursor: "pointer",
                      fontWeight: isSelected ? "600" : "500",
                    }}
                  >
                    {formatFieldLabel(field, index)}
                  </button>
                );
              })}
              {fields.length === 0 && (
                <div style={{ padding: "16px", color: "#6b7280" }}>
                  Brak pól do edycji.
                </div>
              )}
            </div>
          </div>

          {selectedField && (
            <div style={{ border: "1px solid #cbd5f5", borderRadius: 8, padding: 12 }}>
              <h3 style={{ fontSize: 18, marginBottom: 12 }}>Szczegóły litery</h3>
              <label style={{ display: "block", marginBottom: 8 }}>
                Znak
                <input
                  type="text"
                  value={selectedField.char || ""}
                  onChange={handleCharChange}
                  style={{
                    width: "100%",
                    marginTop: 4,
                    padding: "6px 8px",
                    borderRadius: 6,
                    border: "1px solid #94a3b8",
                  }}
                />
              </label>
              <label style={{ display: "block", marginBottom: 8 }}>
                Ścieżka obrazka
                <input
                  type="text"
                  value={selectedField.img || ""}
                  onChange={handleImgChange}
                  style={{
                    width: "100%",
                    marginTop: 4,
                    padding: "6px 8px",
                    borderRadius: 6,
                    border: "1px solid #94a3b8",
                  }}
                />
              </label>
              <button
                onClick={handleAutoImage}
                style={{
                  padding: "4px 10px",
                  borderRadius: 6,
                  border: "1px solid #cbd5f5",
                  background: "#f1f5f9",
                  cursor: "pointer",
                  marginBottom: 12,
                }}
              >
                Auto ścieżka na podstawie znaku
              </button>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
                {["x1", "y1", "x2", "y2"].map(key => (
                  <label key={key} style={{ display: "block" }}>
                    {key.toUpperCase()}
                    <input
                      type="number"
                      value={selectedField[key] ?? ""}
                      onChange={event => handleCoordinateChange(key, event.target.value)}
                      style={{
                        width: "100%",
                        marginTop: 4,
                        padding: "6px 8px",
                        borderRadius: 6,
                        border: "1px solid #94a3b8",
                      }}
                    />
                  </label>
                ))}
              </div>

              <button
                onClick={handleDeleteSelected}
                style={{
                  marginTop: 16,
                  width: "100%",
                  padding: "8px 10px",
                  borderRadius: 6,
                  border: "none",
                  background: "#ef4444",
                  color: "white",
                  cursor: "pointer",
                }}
              >
                Usuń literę
              </button>
            </div>
          )}
        </div>
      </div>

      <div style={{ marginTop: 32 }}>
        <h2 style={{ fontSize: 20, marginBottom: 8 }}>Aktualny JSON</h2>
        <textarea
          readOnly
          value={jsonOutput}
          style={{
            width: "100%",
            minHeight: 200,
            fontFamily: "monospace",
            fontSize: 14,
            padding: 12,
            borderRadius: 8,
            border: "1px solid #cbd5f5",
            background: "#0f172a",
            color: "#f8fafc",
          }}
          onFocus={event => event.target.select()}
        />
      </div>
    </div>
  );
}