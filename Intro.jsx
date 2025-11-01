import React from "react";

export default function Intro({ onSelect, onAdmin }) {
  function handleAdminClick() {
    const pwd = window.prompt("Podaj hasło:");
    if (pwd === "mask") {
      onAdmin && onAdmin();
    } else if (pwd !== null) {
      window.alert("Nieprawidłowe hasło");
    }
  }

  return (
    <div style={{ textAlign: "center", padding: "100px", position: "relative" }}>
      <button
        onClick={handleAdminClick}
        style={{
          position: "absolute",
          top: 10,
          right: 10,
          background: "transparent",
          border: "none",
          color: "#fff",
          cursor: "pointer",
          fontSize: "16px",
        }}
      >
        p
      </button>
      <h1
        style={{
          fontFamily: "GrohmanGrotesk-Classic",
          fontSize: "223px",
          color: "#FFF",
          height: "100px",
        }}
      >
        ZECER
      </h1>
      <h2
        style={{
          fontFamily: "GrohmanGrotesk-Classic",
          fontSize: "6.66rem",
          color: "#ff0000",
        }}
      >
        MUZEUM KSIĄŻKI ARTYSTYCZNEJ
      </h2>
      <h3
        style={{
          fontFamily: "GrohmanGrotesk-Classic",
          fontSize: "1.66rem",
          color: "#000",
        }}
      >
        WYBIERZ SWOJĄ KASZTĘ:
      </h3>
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          gap: "2rem",
          marginTop: "1rem",
        }}
      >
        <img
          src="/assets/kaszta.png"
          alt="Kaszta"
          style={{ width: "400px", cursor: "pointer" }}
          onClick={() => onSelect("kaszta")}
        />
        <img
          src="/assets/kaszta_szuflada.png"
          alt="Kaszta szuflada"
          style={{ width: "400px", cursor: "pointer" }}
          onClick={() => onSelect("szuflada")}
        />
      </div>
    </div>
  );
}

