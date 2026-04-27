"use client";

export function MgScrollTopButton({
  show,
  onClick
}: {
  show: boolean;
  onClick: () => void;
}) {
  if (!show) return null;
  return (
    <button className="mg-scroll-top" onClick={onClick} aria-label="맨 위로 이동">
      ↑
    </button>
  );
}
