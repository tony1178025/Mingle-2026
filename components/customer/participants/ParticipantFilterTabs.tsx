"use client";

import { cn } from "@/lib/mingle";
import type { ParticipantFilter } from "@/lib/customer-ui/filterParticipants";

const OPTIONS: Array<{ id: ParticipantFilter; label: string }> = [
  { id: "OPPOSITE", label: "이성" },
  { id: "SAME", label: "동성" },
  { id: "ALL", label: "전체" }
];

export function ParticipantFilterTabs({
  value,
  onChange
}: {
  value: ParticipantFilter;
  onChange: (next: ParticipantFilter) => void;
}) {
  return (
    <div className="segmented">
      {OPTIONS.map((option) => (
        <button
          key={option.id}
          type="button"
          className={cn("segmented-item", value === option.id && "segmented-item-active")}
          onClick={() => onChange(option.id)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
