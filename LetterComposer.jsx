import React, { useRef, useState, useEffect } from "react";

const KASZTA_WIDTH = 2222;
const KASZTA_HEIGHT = 1521;
const SLOTS_COUNT = 20;
const LINE_OFFSET_RIGHT = 340;
const LINE_OFFSET_BOTTOM = 240;
const WIERSZOWNIK_SRC = "/assets/wierszownik.jpg";

function getImageSize(src) {
  return new Promise((resolve) => {
    const img = new window.Image();
    img.onload = () => resolve({ width: img.width, height: img.height });
    img.src = src;
  });
}
export default function LetterComposer({ onMoveLineToPage, onBack, kasztaImage = "/assets/kaszta_szuflada.png", pozSrc = "/poz_szuflada.json" }) {

  const [letterFields, setLetterFields] = useState([]);
  const [slots, setSlots] = useState(Array(SLOTS_COUNT).fill(null));
  const [activeLetter, setActiveLetter] = useState(null);
  const [ghostPos, setGhostPos] = useState({ x: 0, y: 0, visible: false });
  const [isDragging, setIsDragging] = useState(false);
  const [pickupAnim, setPickupAnim] = useState(false);
  const kasztaRef = useRef();
  const wierszownikRef = useRef();
  const [kasztaW, setKasztaW] = useState(KASZTA_WIDTH);
  const [wierszownikDims, setWierszownikDims] = useState({ width: 1, height: 1 });

  useEffect(() => {
    const img = new window.Image();
    img.onload = () => setWierszownikDims({ width: img.width, height: img.height });
    img.src = WIERSZOWNIK_SRC;
  }, []);

  // BLOKUJ SCROLL strony
  useEffect(() => {
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = oldOverflow; };
  }, []);

  // Responsywna szerokość kaszty i dopasowanie do ekranu
  useEffect(() => {
    function handleResize() {
      const vw = window.innerWidth * 0.95;
      const footerH = 38 + 20; // wysokość stopki + margines
      const wierszownikMinH = 140;
      const gap = 16 + 16;
      const maxH = window.innerHeight - footerH - wierszownikMinH - gap;
      const kasztaWbyH = maxH * (KASZTA_WIDTH / KASZTA_HEIGHT);
      setKasztaW(Math.min(KASZTA_WIDTH, vw, kasztaWbyH));
    }
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const base = typeof window !== "undefined" ? window.location.href : "http://localhost";
    let resolvedPoz = pozSrc;
    try {
      resolvedPoz = new URL(pozSrc, base).href;
    } catch (urlError) {
      console.warn("[LetterComposer] Nie udało się zbudować pełnej ścieżki do pliku pozycji:", urlError);
    }

    console.info(`[LetterComposer] Pobieranie pól liter z ${resolvedPoz}`);

    fetch(pozSrc)
      .then(res => {
        if (!res.ok) {
          throw new Error(`Nie udało się pobrać pól (${res.status}) z ${resolvedPoz}`);
        }
        return res.json();
      })
      .then(data => {
        setLetterFields(Array.isArray(data) ? data : []);
      })
      .catch(error => {
        console.error("[LetterComposer] Błąd podczas pobierania pól:", error);
        setLetterFields([]);
      });
  }, [pozSrc]);


  // DRAG START (mouse/touch na field)
  const handleFieldDragStart = async (field, e) => {
    e.preventDefault();
    const { width, height } = await getImageSize(field.img);
    setActiveLetter({ ...field, width, height });
    setPickupAnim(true);
    setTimeout(() => setPickupAnim(false), 300);
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
  const handleBack = () => {
    setSlots(Array(SLOTS_COUNT).fill(null));
    setActiveLetter(null);
    setGhostPos({ x: 0, y: 0, visible: false });
    setIsDragging(false);
    if (typeof onBack === "function") {
      onBack();
    }
  };

  const kasztaScale = kasztaW / KASZTA_WIDTH;
  const kasztaH = kasztaW * (KASZTA_HEIGHT / KASZTA_WIDTH);
  const lineW = kasztaW * 0.8; // WIERSZOWNIK 80% kaszty
  const wierszScale = lineW / wierszownikDims.width;
  const lineH = wierszownikDims.height * wierszScale;
  const letterScale = wierszScale;
  const offsetRight = LINE_OFFSET_RIGHT * wierszScale;
  const baseline = lineH - LINE_OFFSET_BOTTOM * wierszScale;

  function renderLettersOnLine() {
    let right = 0;
    const visibleSlots = [];
    for (let i = slots.length - 1; i >= 0; i--) {
      const slot = slots[i];
      if (!slot) continue;
      const w = slot.width * letterScale;
      const h = (slot.height || 96) * letterScale;
      right += w;
      visibleSlots.push(
        <div
          key={slot.id}
          style={{
            position: "absolute",
            left: lineW - offsetRight - right,
            top: baseline - h,
            width: w,
            height: h,
            zIndex: 3,
            cursor: "pointer"
          }}
          onClick={() => removeLetterFromSlot(i)}
          title="Kliknij, aby usunąć literę z wierszownika"
        >
          <img
            src={slot.img}
            alt={slot.char}
            width={w}
            height={h}
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
          left: ghostPos.x - (activeLetter.width * letterScale) / 2,
          top: ghostPos.y - ((activeLetter.height || 96) * letterScale) / 2,
          width: activeLetter.width * letterScale,
          height: (activeLetter.height || 96) * letterScale,
          pointerEvents: "none",
          zIndex: 1000,
          opacity: 1,
          filter: "drop-shadow(2px 2px 2px #999)",
          animation: pickupAnim ? "letter-pop 0.3s ease-out forwards" : undefined
        }}
      />
    );
  };

  // --- RENDER ---
  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "stretch",
        overflow: "hidden",
        boxSizing: "border-box"
      }}
    >
      {/* GŁÓWNY BLOK */}
        <div
          style={{
            flex: "1 1 auto",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            minHeight: 0,
            width: "100%",
            overflow: "hidden",
            position: "relative",
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
            border: "0px solid #d1d5db",
            borderRadius: 8,
            overflow: "hidden",
            background: "none",
            touchAction: "none",
            flexShrink: 0
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
            src={kasztaImage}
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
                left: Math.min(field.x1, field.x2) * kasztaScale,
                top: Math.min(field.y1, field.y2) * kasztaScale,
                width: Math.abs(field.x2 - field.x1) * kasztaScale,
                height: Math.abs(field.y2 - field.y1) * kasztaScale,
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
          style={{
            width: "100%",
            display: "flex",
            justifyContent: "center",
            marginTop: 0,
          }}
        >
          <div
            ref={wierszownikRef}
            style={{
              position: "relative",
              width: lineW,
              height: lineH,
              margin: "1px auto 0px auto",
              touchAction: "none",
              flexShrink: 0,
              boxSizing: "border-box",
            }}
          >
            <img
              src={WIERSZOWNIK_SRC}
              alt="Wierszownik"
              style={{
                width: "100%",
                height: "100%",
                display: "block",
                pointerEvents: "none",
              }}
            />
            {renderLettersOnLine()}
          </div>
        </div>
         {/* Panel boczny po LEWEJ */}
        <div
          style={{
            position: "absolute",
            left: 10,
            bottom: 70,
            zIndex: 10,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <button
            onClick={() => typeof onBack === "function" && onBack()}
            style={{
              background: "#222",
              color: "#fff",
              border: "2px solid #888",
              borderRadius: "10%",
              width: 39,
              height: 39,
              fontSize: 24,
              fontWeight: "bold",
              cursor: "pointer",
              boxShadow: "2px 2px 8px #0002",
              outline: "none",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
            title="Wróć do wyboru kaszty"
            aria-label="Wróć do wyboru kaszty"
          >
            <span
              style={{
                display: "inline-block",
                transform: "translateY(0px)",
                fontFamily: "Arial, sans-serif",
              }}
            >
              &#8592;
            </span>
          </button>
        </div>
        {/* Panel boczny po PRAWEJ */}
        <div
          style={{
            position: "absolute",
            right: 10,
            bottom: 70,
            zIndex: 10,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <button
            onClick={() => {
              const line = slots.filter(Boolean);
              if (typeof onMoveLineToPage === "function") {
                onMoveLineToPage(line);
                setSlots(Array(SLOTS_COUNT).fill(null));
              }
            }}
            style={{
              background: "#222",
              color: "#fff",
              border: "2px solid #888",
              borderRadius: "10%",
              width: 39,
              height: 39,
              fontSize: 24,
              fontWeight: "bold",
              cursor: "pointer",
              boxShadow: "2px 2px 8px #0002",
              outline: "none",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
            title="Przenieś linię na stronę"
            aria-label="Przenieś linię na stronę"
          >
          <span
            style={{
              display: "inline-block",
              transform: "translateY(0px)",
              fontFamily: "Arial, sans-serif",
            }}
          >
            &#8594;
          </span>
          </button>
        </div>
        {renderGhostLetter()}
      </div>
      {/* STOPKA */}
      <p
        style={{
          width: "100%",
          background: "#000",
          color: "#969498",
          textAlign: "center",
          fontSize: 13,
          letterSpacing: 0.2,
          fontFamily: "inherit",
          padding: "12px 0 8px 0",
          flexShrink: 0,
          marginTop: "auto",
          marginBottom: "0px",
          userSelect: "none"
        }}
      >
        <b>ZECER</b> &nbsp; &nbsp; &nbsp;  gra edukacyjna dla <a href="https://mkalodz.pl" target="_blank" rel="noopener" style={{ color: "#fafafa", textDecoration: "none", transition: "color 0.45s" }}
          onMouseEnter={e => e.target.style.color = "#ff0000"} onMouseLeave={e => e.target.style.color = "#969498"}
          onTouchStart={e => e.target.style.color = "#ff0000"}
          onTouchEnd={e => e.target.style.color = "#969498"} > Muzeum Książki Artystycznej w Łodzi</a> &nbsp; &nbsp; &nbsp;  &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp;  &nbsp; &nbsp; &nbsp;  produkcja: <a href="https://peterwolf.pl" target="_blank" rel="noopener" style={{ color: "#fafafa", textDecoration: "none", transition: "color 0.45s" }}
            onMouseEnter={e => e.target.style.color = "#ff0000"}
            onMouseLeave={e => e.target.style.color = "#969498"}
            onTouchStart={e => e.target.style.color = "#ff0000"}
            onTouchEnd={e => e.target.style.color = "#969498"} >peterwolf.pl</a>
      </p>
    </div>
  );
}