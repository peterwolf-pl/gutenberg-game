import React from "react";
import LetterFieldEditor from "./LetterFieldEditor";

export default function App() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(180deg, #e2e8f0 0%, #f8fafc 100%)",
        padding: "24px",
        boxSizing: "border-box",
      }}
    >
      <LetterFieldEditor />
    </div>
  );
}
