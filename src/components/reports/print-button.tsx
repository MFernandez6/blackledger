"use client";

export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="border border-brand-gold/40 px-4 py-2 font-sans text-[10px] font-bold uppercase tracking-[0.2em] text-brand-gold"
    >
      Print / Save PDF
    </button>
  );
}
