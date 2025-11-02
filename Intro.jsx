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
    <div style={{ textAlign: "center", padding: "220px", position: "relative" }}>
      <button
        onClick={handleAdminClick}
        style={{
          position: "absolute",
          top: 10,
          right: 10,
          background: "transparent",
          border: "1px",
          color: "#fff",
          cursor: "pointer",
          fontSize: "16px",
        }}
      >
        A
      </button>
     
      <h1
        style={{
          marginTop: "-200px",
          fontFamily: "GrohmanGrotesk-Classic",
          fontSize: "200px",
          color: "#FFF",
          height: "70px",
        }}
      >
        ZECER
      </h1>
      <h2
        style={{
          fontFamily: "GrohmanGrotesk-Classic",
          fontSize: "2.86rem",
          color: "#ff0000",
        }}
      >MUZEUM KSIĄŻKI ARTYSTYCZNEJ</h2>
      <h3
        style={{
          fontFamily: "GrohmanGrotesk-Classic",
          fontSize: "1.8rem",
          color: "#000000c2",
         //background: "#00000096",
         marginTop: "-20px",
        }}
      >WYBIERZ KASZTĘ:</h3>
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          gap: "0rem",
          marginTop: "0rem",
           
        }}
      >
      
        <img
          src="/assets/kaszta_szuflada.png"
          alt="Kaszta szuflada"
          style={{ width: "400px", cursor: "pointer" }}
          onClick={() => onSelect("szuflada")}
        />
     
     </div> 
    <h4
        style={{
          fontFamily: "GrohmanGrotesk-Classic",
          fontSize: "1.17rem",
          color: "#999",
          marginTop: "0rem",
           background: "#000000ea",
        }}
      >Czcionka Brygada 1918</h4>
        
    </div>
 
   
  );
}

