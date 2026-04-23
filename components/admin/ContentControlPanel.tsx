"use client";

import { useMemo, useState } from "react";
import { Button, SectionHeader, Surface } from "@/components/shared/ui";
import type { ContentTemplateRecord, SessionSnapshot } from "@/types/mingle";

export function ContentControlPanel({
  snapshot,
  library,
  onActivate,
  onClear
}: {
  snapshot: SessionSnapshot;
  library: readonly ContentTemplateRecord[];
  onActivate: (templateId: string, targetTableId?: number | null, message?: string) => Promise<void>;
  onClear: () => Promise<void>;
}) {
  const [selectedTemplateId, setSelectedTemplateId] = useState(library[0]?.id ?? "");
  const [targetTableId, setTargetTableId] = useState("");
  const [message, setMessage] = useState("");

  const selectedTemplate = useMemo(
    () => library.find((item) => item.id === selectedTemplateId) ?? null,
    [library, selectedTemplateId]
  );

  return (
    <div className="admin-main-column">
      <Surface>
        <SectionHeader
          eyebrow="CONTENT"
          title="라이브 콘텐츠 제어"
          description="한 번에 하나의 라이브 카드만 고객 테이블에 노출합니다."
          actions={
            snapshot.liveContent ? (
              <Button variant="ghost" onClick={() => void onClear()}>
                현재 콘텐츠 종료
              </Button>
            ) : undefined
          }
        />

        <div className="form-grid">
          <label className="field">
            <span>템플릿</span>
            <select value={selectedTemplateId} onChange={(event) => setSelectedTemplateId(event.target.value)}>
              {library.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.title}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>대상 테이블</span>
            <select value={targetTableId} onChange={(event) => setTargetTableId(event.target.value)}>
              <option value="">전체</option>
              {Array.from({ length: snapshot.session.tableCount }, (_, index) => index + 1).map((tableId) => (
                <option key={tableId} value={String(tableId)}>
                  테이블 {tableId}
                </option>
              ))}
            </select>
          </label>

          {selectedTemplate?.allowMessage ? (
            <label className="field field-span-2">
              <span>운영 메시지</span>
              <textarea rows={3} value={message} onChange={(event) => setMessage(event.target.value)} />
            </label>
          ) : null}
        </div>

        <Button
          block
          onClick={() =>
            void onActivate(
              selectedTemplateId,
              targetTableId ? Number(targetTableId) : null,
              message || undefined
            )
          }
        >
          라이브 카드 시작
        </Button>
      </Surface>
    </div>
  );
}
