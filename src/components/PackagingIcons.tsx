"use client";

import { useId } from "react";

const CARGO_TOP = 8;
const CARGO_BOTTOM = 39;

/** Seramik palet ikonu — alttan yukarı sürekli dolum (0–1) */
export function PalletFillIcon({
  fill,
  className = "",
  size = 52,
}: {
  fill: number;
  className?: string;
  size?: number;
}) {
  const clipId = useId();
  const clamped = Math.max(0, Math.min(1, fill));
  const cargoH = CARGO_BOTTOM - CARGO_TOP;
  const clipY = CARGO_BOTTOM - cargoH * clamped;

  const boxes = [
    { x: 7, y: 30, w: 34, h: 9, rx: 2 },
    { x: 7, y: 19, w: 34, h: 9, rx: 2 },
    { x: 7, y: 8, w: 34, h: 9, rx: 2 },
  ];

  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 48 56"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label={`Palet doluluk ${Math.round(clamped * 100)}%`}
    >
      <defs>
        <clipPath id={clipId}>
          <rect x="0" y={clipY} width="48" height={CARGO_BOTTOM - clipY} />
        </clipPath>
      </defs>

      <g clipPath={`url(#${clipId})`}>
        {boxes.map((box) => (
          <rect
            key={`f-${box.y}`}
            x={box.x}
            y={box.y}
            width={box.w}
            height={box.h}
            rx={box.rx}
            className="product-detail-pallet-fill"
          />
        ))}
      </g>

      <g
        className="product-detail-pallet-stroke"
        stroke="currentColor"
        strokeWidth="2.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {boxes.map((box) => (
          <rect
            key={`o-${box.y}`}
            x={box.x}
            y={box.y}
            width={box.w}
            height={box.h}
            rx={box.rx}
          />
        ))}
        <path d="M5 42h38" />
        <path d="M9 42v4M17 42v4M25 42v4M33 42v4" />
        <path d="M3 46h42" />
      </g>
    </svg>
  );
}

export function TruckIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M3 7h11v8H3z" />
      <path d="M14 10h4l3 3v2h-7z" />
      <circle cx="7" cy="17" r="2" />
      <circle cx="18" cy="17" r="2" />
    </svg>
  );
}
