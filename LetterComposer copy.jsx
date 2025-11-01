 import React, { useRef, useState, useEffect } from "react";

const KASZTA_WIDTH = 1618;
const KASZTA_HEIGHT = 1080;
const SLOTS_COUNT = 20;

function getImageWidth(src) {
  return new Promise((resolve) => {
    const img = new window.Image();
    img.onload = () => resolve(img.width);
    img.src = src;
  });
}

export default function LetterComposer() {
  const [letterFields, setLetterFields] = useState([]);
  const [slots, setSlots] = useState(Array(SLOTS_COUNT).fill(null));
  const [activeLetter, setActiveLetter] = useState(null);
  const [ghostPos, setGhostPos] = useState({ x: 0, y: 0, visible: false });
  const [isDragging, setIsDragging] = useState(false);
  const kasztaRef = useRef();
  const wierszownikRef = useRef();
  const [kasztaW, setKasztaW] = useState(KASZTA_WIDTH);

  // BLOKUJ SCROLL strony
  useEffect(() => {
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = oldOverflow; };
  }, []);

  // Responsywna szerokość kaszty
  useEffect(() => {
    function handleResize() {
      if (kasztaRef.current) {
        const parentW = kasztaRef.current.parentElement.offsetWidth;
        setKasztaW(Math.min(parentW, KASZTA_WIDTH));
      }
    }
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    fetch('/poz.json')
      .then(res => res.json())
      .then(setLetterFields)
      .catch(() => setLetterFields([]));
  }, []);

  // DRAG START (mouse/touch na field)
  const handleFieldDragStart = async (field, e) => {
    e.preventDefault();
    const width = await getImageWidth(field.img);
    setActiveLetter({ ...field, width });
    let x = 0, y = 0;
    if (e.touches && e.touches[0]) {
      x = e.touches[0].clientX;
      y = e.touches[0].clientY;
    } else if (e.clientX && e.clientY) {
      x = e.clientX;
      y = e.clientY;
    }
    setGhostPos({ x, y, visible: true });
    setIsDragging(true);
  };

  // DRAG MOVE & DROP (document-level, działa na iOS)
  useEffect(() => {
    if (!isDragging) return;
    const moveGhost = (e) => {
      setGhostPos({
        x: e.clientX,
        y: e.clientY,
        visible: true
      });
    };
    const moveGhostTouch = (e) => {
      if (e.touches && e.touches[0]) {
        setGhostPos({
          x: e.touches[0].clientX,
          y: e.touches[0].clientY,
          visible: true
        });
      }
    };
    const handleDrop = (e) => {
      let x = 0, y = 0;
      if (e.changedTouches && e.changedTouches[0]) {
        x = e.changedTouches[0].clientX;
        y = e.changedTouches[0].clientY;
      } else if (e.clientX && e.clientY) {
        x = e.clientX;
        y = e.clientY;
      }
      if (wierszownikRef.current) {
        const rect = wierszownikRef.current.getBoundingClientRect();
        if (
          x >= rect.left &&
          x <= rect.right &&
          y >= rect.top &&
          y <= rect.bottom
        ) {
          placeLetter();
        } else {
          setActiveLetter(null);
          setGhostPos({ x: 0, y: 0, visible: false });
        }
      }
      setIsDragging(false);
    };
    document.addEventListener("mousemove", moveGhost);
    document.addEventListener("touchmove", moveGhostTouch, { passive: false });
    document.addEventListener("mouseup", handleDrop);
    document.addEventListener("touchend", handleDrop, { passive: false });
    return () => {
      document.removeEventListener("mousemove", moveGhost);
      document.removeEventListener("touchmove", moveGhostTouch);
      document.removeEventListener("mouseup", handleDrop);
      document.removeEventListener("touchend", handleDrop);
    };
    // eslint-disable-next-line
  }, [isDragging]);

  // Umieszcza literę na wierszowniku
  function placeLetter() {
    let idx = slots.lastIndexOf(null);
    if (idx === -1) idx = 0;
    const updatedSlots = [...slots];
    updatedSlots[idx] = { ...activeLetter, id: Math.random().toString(36) };
    setSlots(updatedSlots);
    setActiveLetter(null);
    setGhostPos({ x: 0, y: 0, visible: false });
    setIsDragging(false);
  }

  // Kaszta – klik/tap poza polem kaszty anuluje ghosta
  function handleKasztaBackgroundClick(e) {
    setActiveLetter(null);
    setGhostPos({ x: 0, y: 0, visible: false });
    setIsDragging(false);
  }

  // Usuwanie liter z wierszownika
  const removeLetterFromSlot = (i) => {
    const updatedSlots = [...slots];
    updatedSlots[i] = null;
    setSlots(updatedSlots);
  };

  const scale = kasztaW / KASZTA_WIDTH;
  const kasztaH = kasztaW * (KASZTA_HEIGHT / KASZTA_WIDTH);
  const lineW = kasztaW * 0.8; // WIERSZOWNIK 80% kaszty

  function renderLettersOnLine() {
    let right = 0;
    let visibleSlots = [];
    for (let i = slots.length - 1; i >= 0; i--) {
      const slot = slots[i];
      if (!slot) continue;
      right += slot.width * scale;
      visibleSlots.push(
        <div
          key={slot.id}
          style={{
            position: "absolute",
            left: lineW - right,
            top: `${16 * scale}px`,
            width: slot.width * scale,
            height: 96 * scale,
            zIndex: 3,
            cursor: "pointer"
          }}
          onClick={() => removeLetterFromSlot(i)}
          title="Kliknij, aby usunąć literę z wierszownika"
        >
          <img
            src={slot.img}
            alt={slot.char}
            width={slot.width * scale}
            height={96 * scale}
            draggable={false}
            style={{ display: "block" }}
          />
        </div>
      );
    }
    return visibleSlots.reverse();
  }

  // Ghost litera
  const renderGhostLetter = () => {
    if (!activeLetter || !ghostPos.visible) return null;
    return (
      <img
        src={activeLetter.img}
        alt={activeLetter.char}
        style={{
          position: "fixed",
          left: ghostPos.x - (activeLetter.width * scale) / 2,
          top: ghostPos.y - 48 * scale,
          width: activeLetter.width * scale,
          height: activeLetter.height * scale,
          pointerEvents: "none",
          zIndex: 1000,
          opacity: 0.95,
          filter: "drop-shadow(0 3px 10px #3333)"
        }}
      />
    );
  };

  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        background: "#f5f6f8",
        overflow: "hidden",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "flex-start",
        touchAction: "none"
      }}
    >
      {/* Kaszta */}
      <div
        ref={kasztaRef}
        style={{
          position: "relative",
          width: kasztaW,
          height: kasztaH,
          margin: "0 auto",
          border: "2px solid #d1d5db",
          borderRadius: 8,
          overflow: "hidden",
          background: "#fff",
          touchAction: "none"
        }}
      >
        {/* Tło łapiące kliknięcie na kaszcie */}
        <div
          onClick={handleKasztaBackgroundClick}
          onTouchEnd={handleKasztaBackgroundClick}
          style={{
            position: "absolute",
            left: 0, top: 0, width: "100%", height: "100%",
            zIndex: 1, background: "transparent"
          }}
        />
        <img
          src="/assets/kaszta.jpg"
          alt="Kaszta zecerska"
          style={{
            width: "100%",
            height: "auto",
            display: "block",
            pointerEvents: "none"
          }}
        />
        {/* Fieldy na kaszcie – tylko drag start */}
        {letterFields.map(field => (
          <button
            key={field.char + field.x1 + field.y1 + field.x2 + field.y2}
            onMouseDown={e => handleFieldDragStart(field, e)}
            onTouchStart={e => handleFieldDragStart(field, e)}
            aria-label="Wybierz czcionkę"
            style={{
              position: "absolute",
              left: Math.min(field.x1, field.x2) * scale,
              top: Math.min(field.y1, field.y2) * scale,
              width: Math.abs(field.x2 - field.x1) * scale,
              height: Math.abs(field.y2 - field.y1) * scale,
              border: "0px solid #2563eb",
              background: "rgba(96,165,250,0.0)",
              borderRadius: "10px",
              cursor: "pointer",
              zIndex: 2,
              boxSizing: "border-box",
              outline: "none",
              userSelect: "none",
              touchAction: "none"
            }}
          />
        ))}
      </div>
       
      {/* Wierszownik */}
      <div
        ref={wierszownikRef}
        style={{
          position: "relative",
          width: lineW,
          minHeight: 116 * scale + 15,
          margin: "12px auto 24px auto",
          borderRadius: 8,
          background: "#959595",
          touchAction: "none"
        }}
      >

        <div
          style={{
            position: "absolute",
            left: 0,
            right: 10,
            top: 96 * scale + 16 * scale,
            width: lineW,
            height: 4,
            background: "#333",
            zIndex: 1
          }}
        />
        {renderLettersOnLine()}
      </div>
<div style={{fontSize:12, color:"#777", marginTop:-16}}>
     Educational Game for the Muzeum Książki Artystycznej w Łodzi by <a href="https://peterwolf.pl">peterwolf.pl</a>
    </div>
      {renderGhostLetter()}
            
    </div>


  );
}
