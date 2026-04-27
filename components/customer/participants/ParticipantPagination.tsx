"use client";

import { Button } from "@/components/shared/ui";

export function ParticipantPagination({
  page,
  totalPages,
  onPrev,
  onNext
}: {
  page: number;
  totalPages: number;
  onPrev: () => void;
  onNext: () => void;
}) {
  return (
    <div className="compact-row">
      <Button variant="secondary" disabled={page <= 1} onClick={onPrev}>
        이전
      </Button>
      <span>
        {page} / {totalPages}
      </span>
      <Button variant="secondary" disabled={page >= totalPages} onClick={onNext}>
        다음
      </Button>
    </div>
  );
}
