import React, { useEffect, useRef, useState } from "react";

const A4_WIDTH = 796;
const A4_HEIGHT = 1123;
const SHEET_OFFSET_RIGHT = 120;
const SHEET_OFFSET_TOP = 170;
const LETTER_BASE_HEIGHT = 96;
const LETTER_SCALE = 0.5;

const getLineHeight = (line) => {
  if (!line || line.length === 0) return LETTER_BASE_HEIGHT;
  return Math.max(
    ...line.map((l) => (l.height ? l.height * LETTER_SCALE : LETTER_BASE_HEIGHT))
  );
};






export default function PageComposer({
  lines,
  onLinesChange,
  onBack,
  onClearLines,
  onGoToPrint,
}) {
  const [pageW, setPageW] = useState(A4_WIDTH);
  const wrapperRef = useRef();
  const [sheetDims, setSheetDims] = useState({ width: A4_WIDTH, height: A4_HEIGHT });

  useEffect(() => {
    const img = new Image();
    img.src = "/assets/blacha.png";
    img.onload = () => {
      setSheetDims({ width: img.width, height: img.height });
    };
  }, []);

  useEffect(() => {
    function handleResize() {
      const maxW = window.innerWidth * 0.95;
      const stopkaH = 40 + 18;
      const maxH = window.innerHeight - stopkaH - 32;
      const byHeight = maxH * (sheetDims.width / sheetDims.height);
      setPageW(Math.min(sheetDims.width, maxW, byHeight));
    }
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [sheetDims]);

  const scale = pageW / sheetDims.width;
  const pageH = pageW * (sheetDims.height / sheetDims.width);
  const sheetOffsetRight = SHEET_OFFSET_RIGHT * scale;
  const sheetOffsetTop = SHEET_OFFSET_TOP * scale;

  // DRAG
  const [dragIndex, setDragIndex] = useState(null);
  const [dropPosition, setDropPosition] = useState(null);
  const [dragY, setDragY] = useState(null);
  const [dragOffsetY, setDragOffsetY] = useState(0);

  const dragIndexRef = useRef(dragIndex);
  const dropPositionRef = useRef(dropPosition);
  const linesRef = useRef(lines);

  useEffect(() => { dragIndexRef.current = dragIndex; }, [dragIndex]);
  useEffect(() => { dropPositionRef.current = dropPosition; }, [dropPosition]);
  useEffect(() => { linesRef.current = lines; }, [lines]);

  const handleDragStart = (idx, e) => {
    e.preventDefault();
    setDragIndex(idx);
    dragIndexRef.current = idx;
    const clientY = e.touches?.[0]?.clientY ?? e.clientY;
    const rect = document.getElementById(`line-${idx}`)?.getBoundingClientRect();
    setDragOffsetY(clientY - (rect?.top ?? 0));
    setDragY(clientY);

    window.addEventListener("mousemove", handleDragMove);
    window.addEventListener("mouseup", handleDragEnd);
    window.addEventListener("touchmove", handleDragMove, { passive: false });
    window.addEventListener("touchend", handleDragEnd, { passive: false });
  };

  const handleDragMove = (e) => {
    const clientY = e.touches?.[0]?.clientY ?? e.clientY;
    setDragY(clientY);

    const wrapper = wrapperRef.current;
    if (!wrapper) return;
    const children = Array.from(wrapper.querySelectorAll(".line-draggable"));
    let found = null;

    for (let i = 0; i < children.length; i++) {
      const rect = children[i].getBoundingClientRect();
      if (clientY >= rect.top && clientY <= rect.bottom) {
        const relY = clientY - rect.top;
        if (relY < rect.height * 0.3) {
          found = { targetIdx: i, pos: "above" };
        } else if (relY > rect.height * 0.7) {
          found = { targetIdx: i, pos: "below" };
        } else {
          found = { targetIdx: i, pos: "merge" };
        }
        break;
      }
    }
    // Poza liniami
    if (!found) {
      if (children.length > 0) {
        const last = children[children.length - 1].getBoundingClientRect();
        if (clientY > last.bottom) {
          found = { targetIdx: children.length - 1, pos: "below" };
        } else {
          found = { targetIdx: 0, pos: "above" };
        }
      } else {
        found = { targetIdx: 0, pos: "above" };
      }
    }
    setDropPosition(found);
    dropPositionRef.current = found;
  };

  const handleDragEnd = (e) => {
    const dragIdx = dragIndexRef.current;
    const dropPos = dropPositionRef.current;
    if (dragIdx === null || !dropPos) {
      resetDrag();
      return;
    }
    let newLines = [...linesRef.current];
    if (
      dropPos.pos === "merge" &&
      dropPos.targetIdx !== dragIdx
    ) {
      // MERGE lines
      const merged = [
        ...newLines[dropPos.targetIdx],
        ...newLines[dragIdx],
      ];
      newLines = newLines.filter(
        (_, idx) => idx !== dragIdx && idx !== dropPos.targetIdx
      );
      const insertAt =
        dropPos.targetIdx > dragIdx
          ? dropPos.targetIdx - 1
          : dropPos.targetIdx;
      newLines.splice(insertAt, 0, merged);
      onLinesChange(newLines);
    } else if (
      (dropPos.pos === "above" || dropPos.pos === "below") &&
      dropPos.targetIdx !== dragIdx
    ) {
      // Przesuwanie
      const line = newLines[dragIdx];
      newLines.splice(dragIdx, 1);
      let insertAt = dropPos.targetIdx;
      if (dropPos.pos === "below") insertAt++;
      if (
        dragIdx < dropPos.targetIdx &&
        dropPos.pos === "above"
      )
        insertAt--;
      newLines.splice(insertAt, 0, line);
      onLinesChange(newLines);
    }
    resetDrag();
  };

  function resetDrag() {
    setDragIndex(null);
    setDropPosition(null);
    dragIndexRef.current = null;
    dropPositionRef.current = null;
    setDragY(null);
    setDragOffsetY(0);
    window.removeEventListener("mousemove", handleDragMove);
    window.removeEventListener("mouseup", handleDragEnd);
    window.removeEventListener("touchmove", handleDragMove);
    window.removeEventListener("touchend", handleDragEnd);
  }

  const getLineStyle = (i) => {
    if (
      dropPosition &&
      dropPosition.targetIdx === i &&
      dropPosition.pos === "merge" &&
      dragIndex !== null &&
      dragIndex !== i
    ) {
      return {
        background: "#e3f2ff",
        borderRadius: 4 * scale,
        minHeight: getLineHeight(lines[i]) * scale,
        outline: "2px dashed #28b0ef",
        transition: "background 0.12s",
      };
    }
    if (
      dropPosition &&
      dropPosition.targetIdx === i &&
      (dropPosition.pos === "above" || dropPosition.pos === "below") &&
      dragIndex !== null &&
      dragIndex !== i
    ) {
      return {
        borderTop:
          dropPosition.pos === "above"
            ? `3px solid #28b0ef`
            : undefined,
        borderBottom:
          dropPosition.pos === "below"
            ? `3px solid #28b0ef`
            : undefined,
        transition: "border 0.12s",
      };
    }
    return {};
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        width: "100vw",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "stretch",
        overflow: "hidden",
        boxSizing: "border-box",
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
          overflow: "hidden",
        }}
      >
        {/* Kartka A4 */}
        <div
          ref={wrapperRef}
          style={{
            backgroundImage: "url(/assets/blacha.png)",
            backgroundRepeat: "no-repeat",
            backgroundPosition: "center",
            backgroundSize: "100% 100%",
            borderRadius: 6 * scale,
            width: pageW,
            height: pageH,
            margin: "4px 0",
            boxShadow: "0 6px 48px #0003",
            position: "relative",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-end",
            justifyContent: "flex-start",
            paddingRight: sheetOffsetRight,
            paddingTop: sheetOffsetTop,
            boxSizing: "border-box",
          }}
        >
          {lines.map((line, i) => {
            const isHidden = dragIndex === i;
            const lineHeight = getLineHeight(line);
            return (
              <div
                className="line-draggable"
                key={i}
                id={`line-${i}`}
                style={{
                  display: isHidden ? "none" : "flex",
                  flexDirection: "row",
                  alignItems: "flex-end",
                  justifyContent: "flex-end",
                  margin: `0 0 ${8 * scale}px 0`,
                  minHeight: lineHeight * scale,
                  maxWidth: `calc(100% - ${sheetOffsetRight}px)`,
                  cursor: dragIndex === null ? "grab" : "default",
                  userSelect: "none",
                  touchAction: "none",
                  ...getLineStyle(i),
                }}
                onMouseDown={(e) => handleDragStart(i, e)}
                onTouchStart={(e) => handleDragStart(i, e)}
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
                        : LETTER_BASE_HEIGHT) * scale
                    }
                    style={{ marginLeft: 0, pointerEvents: "none" }}
                    draggable={false}
                  />
                ))}
              </div>
            );
          })}
          {/* Ghost linii przy drag&drop */}
          {dragIndex !== null && dragY !== null && (
            <div
              style={{
                position: "absolute",
                width: `calc(100% - ${sheetOffsetRight}px)`,
                left: 0,
                top:
                  dragY -
                  dragOffsetY -
                  wrapperRef.current.getBoundingClientRect().top,
                zIndex: 11,
                pointerEvents: "none",
                opacity: 0.92,
                boxShadow: "0 8px 24px #0005",
                transform: "scale(1.03)",
                background: "#e4ecf4",
                borderRadius: 4 * scale,
                minHeight: getLineHeight(lines[dragIndex]) * scale,
              }}
            >
              {lines[dragIndex].map((letter, j) => (
                <img
                  key={j}
                  src={letter.img}
                  alt={letter.char}
                  width={letter.width * LETTER_SCALE * scale}
                  height={
                    (letter.height
                      ? letter.height * LETTER_SCALE
                      : LETTER_BASE_HEIGHT) * scale
                  }
                  style={{ marginLeft: 0, pointerEvents: "none" }}
                  draggable={false}
                />
              ))}
            </div>
          )}
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
            onClick={onGoToPrint}
            style={{
              background: "#222",
              color: "#fff",
              border: "2px solid #888",
              borderRadius: "10%",
              width: 39,
              height: 39,
              fontSize: 18,
              cursor: "pointer",
              boxShadow: "2px 2px 8px #0002",
              outline: "none",
            }}
            title="Przejdź do druku"
            aria-label="Przejdź do druku"
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
            onClick={onClearLines}
            style={{
              background: "#fff",
              color: "#fff",
              border: "2px  solid #ff0000",
              borderRadius: "10%",
              width: 39,
              height: 39,
              fontSize: 18,
              cursor: "pointer",
              boxShadow: "2px 2px 8px #0002",
              outline: "none",
            }}
            title="Wyczyść całą stronę"
            aria-label="Wyczyść całą stronę"
          >
            <span
              style={{
                display: "inline-block",
                transform: "rotate(20deg) translateX(-5px) ",
                fontFamily: "Arial, sans-serif",
              }}
            >
              &#128465;
            </span>
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
              fontSize: 18,
              cursor: "pointer",
              boxShadow: "2px 2px 8px #0002",
              outline: "none",
            }}
            title="Powrót do składu zecerskiego"
            aria-label="Powrót do składu zecerskiego"
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
          userSelect: "none",
        }}
      >
        <b>ZECER</b> - gra edukacyjna{" "}
        <a
          href="https://mkalodz.pl"
          target="_blank"
          rel="noopener"
          style={{
            color: "#fafafa",
            textDecoration: "none",
            transition: "color 0.45s",
          }}
          onMouseEnter={(e) => (e.target.style.color = "#ff0000")}
          onMouseLeave={(e) => (e.target.style.color = "#969498")}
          onTouchStart={(e) => (e.target.style.color = "#ff0000")}
          onTouchEnd={(e) => (e.target.style.color = "#969498")}
        >
          Muzeum Książki Artystycznej w Łodzi
        </a>
        &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; produkcja:{" "}
        <a
          href="https://peterwolf.pl"
          target="_blank"
          rel="noopener"
          style={{
            color: "#fafafa",
            textDecoration: "none",
            transition: "color 0.45s",
          }}
          onMouseEnter={(e) => (e.target.style.color = "#ff0000")}
          onMouseLeave={(e) => (e.target.style.color = "#969498")}
          onTouchStart={(e) => (e.target.style.color = "#ff0000")}
          onTouchEnd={(e) => (e.target.style.color = "#969498")}
        >
          peterwolf.pl
        </a>
      </p>
    </div>
  );
}