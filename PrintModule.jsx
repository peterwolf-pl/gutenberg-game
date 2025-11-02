import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import easterEggs from "./printEasterEggs";

const A4_WIDTH = 796;
const A4_HEIGHT = 1123;
const BASE_LETTER_HEIGHT = 96;
const LETTER_SCALE = 0.3;

const getLineHeight = (line) => {
  if (!line || line.length === 0) return BASE_LETTER_HEIGHT;
  return Math.max(
    ...line.map((l) => (l.height ? l.height * LETTER_SCALE : BASE_LETTER_HEIGHT))
  );
};

const getPrintLetterImage = (letter) => {
  if (!letter || !letter.img) return null;
  const fileName = letter.img.split("/").filter(Boolean).pop();
  if (!fileName) return null;
  return `/assets/letters/print/${fileName}`;
};

const normalizeWord = (word) =>
  (word || "")
    .toString()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");

const reverseString = (value = "") => value.split("").reverse().join("");

const easterEggMap = easterEggs.reduce((map, egg) => {
  const normalizedWord = normalizeWord(egg.word);
  const key = reverseString(normalizedWord);
  if (key && !map.has(key)) {
    map.set(key, egg);
  }
  return map;
}, new Map());

const getYoutubeEmbedUrl = (src) => {
  if (!src) return null;
  try {
    const url = new URL(src);
    if (url.hostname.includes("youtube.com")) {
      if (url.pathname === "/watch") {
        const id = url.searchParams.get("v");
        return id ? `https://www.youtube.com/embed/${id}?autoplay=1` : null;
      }
      if (url.pathname.startsWith("/embed/")) {
        return `${url.origin}${url.pathname}?autoplay=1`;
      }
    }
    if (url.hostname === "youtu.be") {
      const id = url.pathname.replace("/", "");
      return id ? `https://www.youtube.com/embed/${id}?autoplay=1` : null;
    }
  } catch (err) {
    return null;
  }
  return null;
};

export default function PrintModule({ lines = [], onBack }) {
  const [pageW, setPageW] = useState(A4_WIDTH);
  const [animReady, setAnimReady] = useState(false);
  const [rightPageShown, setRightPageShown] = useState(false);
  const [activeEgg, setActiveEgg] = useState(null);
  const triggeredEggsRef = useRef(new Set());
  const rightPageRef = useRef(null);
  const html2CanvasLoaderRef = useRef(null);

  const loadHtml2Canvas = useCallback(() => {
    if (typeof window === "undefined") {
      return Promise.resolve(null);
    }

    if (window.html2canvas) {
      return Promise.resolve(window.html2canvas);
    }

    if (!html2CanvasLoaderRef.current) {
      html2CanvasLoaderRef.current = new Promise((resolve, reject) => {
        const scriptId = "html2canvas-script";
        let script = document.getElementById(scriptId);

        const cleanup = () => {
          if (!script) {
            return;
          }
          script.removeEventListener("load", handleLoad);
          script.removeEventListener("error", handleError);
        };

        const handleLoad = () => {
          cleanup();
          resolve(window.html2canvas);
        };

        const handleError = (event) => {
          cleanup();
          html2CanvasLoaderRef.current = null;
          reject(event?.error || new Error("Nie udało się wczytać html2canvas"));
        };

        if (!script) {
          script = document.createElement("script");
          script.id = scriptId;
          script.src =
            "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js";
          script.async = true;
          script.crossOrigin = "anonymous";
          script.addEventListener("load", handleLoad);
          script.addEventListener("error", handleError);
          document.head.appendChild(script);
        } else {
          script.addEventListener("load", handleLoad);
          script.addEventListener("error", handleError);
        }
      });
    }

    return html2CanvasLoaderRef.current;
  }, []);

  const safeLines = useMemo(
    () => (Array.isArray(lines) ? lines : []),
    [lines]
  );

  // Dynamiczne skalowanie dwóch kartek w oknie
  useEffect(() => {
    function handleResize() {
      const maxW = window.innerWidth * 0.95;
      const stopkaH = 40 + 18;
      const maxH = window.innerHeight - stopkaH - 32;
      // Cała szerokość na DWA A4 + margines między nimi
      const cards = 2 * A4_WIDTH + 48;
      const byHeight = maxH * (cards / (1.5 * A4_HEIGHT));
      setPageW(Math.min(A4_WIDTH, (maxW - 48) / 2, byHeight / 2, A4_WIDTH));
    }
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const scale = pageW / A4_WIDTH;
  const pageH = pageW * (A4_HEIGHT / A4_WIDTH);
  const clampH = 320 * scale;
  const [clampTop, setClampTop] = useState(pageH - clampH);

  useEffect(() => {
    setClampTop(pageH - clampH);
    const t = setTimeout(() => setClampTop(-clampH), 1000);
    return () => clearTimeout(t);
  }, [pageH]);

  useEffect(() => {
    const t = setTimeout(() => setAnimReady(true), 1500);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!animReady) {
      setRightPageShown(false);
      return undefined;
    }
    const t = setTimeout(() => setRightPageShown(true), 1000);
    return () => clearTimeout(t);
  }, [animReady]);

  useEffect(() => {
    if (!rightPageShown) {
      return;
    }

    const triggered = triggeredEggsRef.current;
    for (const line of safeLines) {
      if (!Array.isArray(line) || line.length === 0) {
        continue;
      }
      const rawWord = line.map((l) => (l && l.char ? l.char : "")).join("");
      const normalized = normalizeWord(rawWord);
      if (!normalized || triggered.has(normalized)) {
        continue;
      }

      const egg = easterEggMap.get(normalized);
      if (egg) {
        triggered.add(normalized);
        setActiveEgg({ ...egg, rawWord });
        break;
      }
    }
  }, [rightPageShown, safeLines]);

  const printLines = useMemo(
    () =>
      safeLines.map((line) => {
        if (!Array.isArray(line)) {
          return [];
        }
        return line.map((letter) => ({
          ...letter,
          printImg: getPrintLetterImage(letter) || letter.img,
        }));
      }),
    [safeLines]
  );

  const handlePrintRightPage = useCallback(async () => {
    const rightPageEl = rightPageRef.current;

    if (!rightPageEl) {
      console.warn("[PrintModule] Nie znaleziono prawej strony do wydruku.");
      return;
    }

    try {
      const html2canvas = await loadHtml2Canvas();

      if (!html2canvas) {
        throw new Error("Brak biblioteki html2canvas");
      }

      const canvas = await html2canvas(rightPageEl, {
        backgroundColor: "#ffffff",
        scale: window.devicePixelRatio || 1,
        useCORS: true,
        scrollX: 0,
        scrollY: 0,
      });

      const dataUrl = canvas.toDataURL("image/png");

      const printWindow = window.open("", "_blank", "width=900,height=650");
      if (!printWindow) {
        throw new Error("Nie udało się otworzyć okna drukowania");
      }

      const documentHtml = `<!DOCTYPE html>
<html>
  <head>
    <meta charSet="utf-8" />
    <title>Drukuj skład</title>
    <style>
      @page {
        size: A4 portrait;
        margin: 0;
      }
      html, body {
        margin: 0;
        padding: 0;
        height: 100%;
        background: #10131a;
      }
      body {
        display: flex;
        align-items: center;
        justify-content: center;
      }
      img {
        width: 100%;
        height: auto;
        display: block;
      }
      .wrapper {
        width: 100vw;
        height: 100vh;
        display: flex;
        align-items: center;
        justify-content: center;
        background: #10131a;
      }
      .page {
        width: min(100%, 210mm);
        height: auto;
        background: #fff;
        display: flex;
        align-items: center;
        justify-content: center;
      }
    </style>
  </head>
  <body>
    <div class="wrapper">
      <div class="page">
        <img id="print-image" src="${dataUrl}" alt="Podgląd prawej strony" />
      </div>
    </div>
    <script>
      (function() {
        const img = document.getElementById('print-image');

        function triggerPrint() {
          setTimeout(function() {
            window.focus();
            window.print();
          }, 100);
        }

        if (img.complete) {
          triggerPrint();
        } else {
          img.addEventListener('load', triggerPrint);
          img.addEventListener('error', triggerPrint);
        }

        window.addEventListener('afterprint', function() {
          window.close();
        });
      })();
    </scr` + `ipt>
  </body>
</html>`;

      printWindow.document.open();
      printWindow.document.write(documentHtml);
      printWindow.document.close();
    } catch (error) {
      console.error("[PrintModule] Nie udało się przygotować wydruku:", error);
    }
  }, [loadHtml2Canvas]);

  return (
    <div
      style={{
        minHeight: "100vh",
        width: "100vw",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "stretch",
        overflow: "visible",
        boxSizing: "border-box"
      }}
    >
        <div
          style={{
            flex: "1 1 auto",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            minHeight: 0,
            width: "100%",
            overflow: "visible",
            position: "relative",
          }}
        >
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            gap: 88 * scale,
            justifyContent: "center",
            alignItems: "center",
            width: "100%",
            minHeight: pageH
          }}
        >
          {/* Kartka A4 LEWA */}
          <div
            style={{
              background: "none",
              border: "none",
              borderRadius: 0,
              width: pageW,
              height: pageH,
              boxShadow: "0 6px 48px #0003",
              position: "relative",
              overflow: "visible",
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-end",
              justifyContent: "flex-start",
              paddingTop: 200 * scale,
              paddingRight: 270 * scale
            }}
          >
            <img
              src="/assets/korektor.png"
              alt="korektor"
              style={{
                position: "absolute",
                top: -400 * scale,
                left: 0,
                width: "100%",
                height: pageH + 800 * scale,
                objectFit: "cover",
                pointerEvents: "none",
                transform: "translateY(11.5%) scale(0.85)",
                transformOrigin: "top left",
                zIndex: 0
              }}
            />
            <img
              src="/assets/docisk.png"
              alt="docisk"
              style={{
                position: "absolute",
                left: `-${230 * scale}px`,
                top: clampTop,
                width: `calc(100% + ${300 * scale}px)`,
                height: `calc(100% * ${scale}px)`,
                transition: "top 1s ease-in-out",
                zIndex: 2
              }}
            />
            {safeLines.map((line, i) => {
              const lineHeight = getLineHeight(line);
              return (
                <div
                  key={i}
                  style={{
                    position: "relative",
                    zIndex: 1,
                    display: "flex",
                    flexDirection: "row",
                    alignItems: "flex-start",
                    justifyContent: "flex-end",
                    margin: `${0 * scale}px 0 ${12 * scale}px 0`,
                    minHeight: lineHeight * scale,
                    maxWidth: "100%"
                  }}
                >
                  {line.map((letter, j) => (
                    <img
                      key={j}
                      src={letter.img}
                      alt={letter.char}
                      width={letter.width * LETTER_SCALE * scale}
                      height={
                        (letter.height
                          ? letter.height * LETTER_SCALE
                          : BASE_LETTER_HEIGHT) * scale
                      }
                      style={{ marginLeft: 0 * scale }}
                      draggable={false}
                    />
                  ))}
                </div>
              );
            })}
          </div>
          {/* Kartka A4 PRAWA (Lustrzane odbicie) */}
          <div
            style={{
              background: "#fff",
              width: pageW,
              height: pageH,
              boxShadow: "none",
              border: "none",
              borderRadius: 0,
              position: "relative",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-start",
              justifyContent: "flex-start",
              transform: animReady
                ? "translateX(0) rotateX(0deg)"
                : `translateX(-${pageW + 48 * scale}px) rotateX(180deg)`,
              "--dx": `${pageW + 48 * scale}px`,
              animation: animReady
                ? "right-page-flip 1s ease forwards"
                : "none",
              transformStyle: "preserve-3d",
              backfaceVisibility: "hidden"
            }}
            ref={rightPageRef}
          >
            <div
              style={{
                width: "100%",
                height: "100%",
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-start",
                justifyContent: "flex-start",
                paddingTop: 80 * scale,
                paddingLeft: 60 * scale
              }}
            >
              {printLines.map((line, i) => {
                const lineHeight = getLineHeight(line);
                return (
                  <div
                    key={i}
                    style={{
                      transform: "scaleX(-1)",
                      display: "flex",
                      flexDirection: "row",
                      alignItems: "flex-start",
                      justifyContent: "flex-start",
                      margin: `${0 * scale}px 0 ${12 * scale}px 0`,
                      minHeight: lineHeight * scale,
                      maxWidth: "100%"
                    }}
                  >
                    {[...line].map((letter, j) => (
                      <img
                        key={j}
                        src={letter.printImg}
                        alt={letter.char}
                        width={letter.width * LETTER_SCALE * scale}
                        height={
                          (letter.height
                            ? letter.height * LETTER_SCALE
                            : BASE_LETTER_HEIGHT) * scale
                        }
                        draggable={false}
                      />
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        {/* Panel boczny (lewy) */}
        <div
          style={{
            position: "absolute",
            left: 10,
            bottom: 70,
            zIndex: 10,
            display: "flex",
            flexDirection: "column",
            gap: 10,
          }}
        >
          <button
            onClick={handlePrintRightPage}
            style={{
              background: "#222",
              color: "#fff",
              border: "2px solid #888",
              borderRadius: "10%",
              width: 39,
              height: 39,
              fontSize: 20,
              fontWeight: "bold",
              cursor: "pointer",
              boxShadow: "2px 2px 8px #0002",
              outline: "none",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
            title="Drukuj prawą stronę"
            aria-label="Drukuj prawą stronę"
          >
            🖨️
          </button>
          <button
            onClick={onBack}
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
            title="Powrót"
            aria-label="Powrót"
          >
            <span
              style={{
                display: "inline-block",
                transform: "rotate(180deg) translateY(2px)",
                fontFamily: "Arial, sans-serif",
              }}
            >
              &#8594;
            </span>
          </button>
        </div>
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
        <b>ZECER</b> -  {" "}
        <a
          href="https://mkalodz.pl"
          target="_blank"
          rel="noopener"
          style={{
            color: "#fafafa",
            textDecoration: "none",
            transition: "color 0.45s"
          }}
          onMouseEnter={e => (e.target.style.color = "#ff0000")}
          onMouseLeave={e => (e.target.style.color = "#969498")}
          onTouchStart={e => (e.target.style.color = "#ff0000")}
          onTouchEnd={e => (e.target.style.color = "#969498")}
        >
         &nbsp; &nbsp;  |    &nbsp; &nbsp;   &nbsp; &nbsp;   MKA Łódź
        </a>
        &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; |  &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; code:{" "}
        <a
          href="https://peterwolf.pl"
          target="_blank"
          rel="noopener"
          style={{
            color: "#fafafa",
            textDecoration: "none",
            transition: "color 0.45s"
          }}
          onMouseEnter={e => (e.target.style.color = "#ff0000")}
          onMouseLeave={e => (e.target.style.color = "#969498")}
          onTouchStart={e => (e.target.style.color = "#ff0000")}
          onTouchEnd={e => (e.target.style.color = "#969498")}
        >
          peterwolf.pl
        </a>
      </p>
      {activeEgg && (
        <div
          style={{
            position: "fixed",
            right: 32,
            bottom: 32,
            maxWidth: 360,
            background: "#111d",
            backdropFilter: "blur(6px)",
            color: "#fff",
            borderRadius: 16,
            boxShadow: "0 12px 48px #0009",
            padding: 20,
            zIndex: 1000,
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
            }}
          >
            <strong style={{ fontSize: 16 }}>
              Easter egg: {activeEgg.word || activeEgg.rawWord}
            </strong>
            <button
              onClick={() => setActiveEgg(null)}
              style={{
                background: "transparent",
                color: "#fff",
                border: "none",
                cursor: "pointer",
                fontSize: 20,
                lineHeight: 1,
                padding: 4,
              }}
              aria-label="Zamknij easter egga"
            >
              ×
            </button>
          </div>
          {activeEgg.description && (
            <p style={{ margin: 0, fontSize: 14, lineHeight: 1.4 }}>
              {activeEgg.description}
            </p>
          )}
          <div
            style={{
              width: "100%",
              borderRadius: 12,
              overflow: "hidden",
              background: "#000",
            }}
          >
            {activeEgg.type === "image" && (
              <img
                src={activeEgg.src}
                alt={activeEgg.description || activeEgg.word}
                style={{
                  width: "100%",
                  height: "auto",
                  display: "block",
                }}
              />
            )}
            {activeEgg.type === "audio" && (
              <audio
                src={activeEgg.src}
                controls
                autoPlay
                style={{ width: "100%" }}
              />
            )}
            {activeEgg.type === "video" && (
              <video
                src={activeEgg.src}
                controls
                autoPlay
                style={{ width: "100%" }}
              />
            )}
            {activeEgg.type === "youtube" && (
              <iframe
                src={getYoutubeEmbedUrl(activeEgg.src) || activeEgg.src}
                title={activeEgg.description || activeEgg.word}
                width="100%"
                height="200"
                style={{ border: "none", width: "100%" }}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}