"use client";

import { Badge, Button, EmptyState, SectionHeader, Surface } from "@/components/shared/ui";
import { formatTableName } from "@/lib/mingle";
import type { RotationPreview, RotationTablePreview } from "@/types/mingle";

function TableSignal({ label, before, after }: { label: string; before: number; after: number }) {
  const improved = after < before ? "success" : after > before ? "warning" : "neutral";
  const delta = Number((after - before).toFixed(1));

  return (
    <div className="compact-row">
      <strong>{label}</strong>
      <span>
        {before} {"->"} {after}
      </span>
      <Badge tone={improved === "success" ? "success" : improved === "warning" ? "warning" : "neutral"}>
        {delta > 0 ? `+${delta}` : `${delta}`}
      </Badge>
    </div>
  );
}

function TableCard({ table }: { table: RotationTablePreview }) {
  return (
    <article className="preview-card">
      <SectionHeader
        eyebrow={formatTableName(table.tableId)}
        title={`${table.beforeParticipants.length} -> ${table.afterParticipants.length} seats`}
        description={`quality ${table.beforeQuality} -> ${table.afterQuality}, heat ${table.beforeHeat} -> ${table.afterHeat}`}
      />

      <div className="compact-stack">
        <TableSignal label="성비 편차" before={table.beforeGenderBalance} after={table.afterGenderBalance} />
        <TableSignal label="이전 테이블 중복" before={table.beforeRepeatMeetings} after={table.afterRepeatMeetings} />
        <TableSignal label="상위 반응 집중" before={table.beforePopularityLoad} after={table.afterPopularityLoad} />
        <TableSignal label="테이블 분위기" before={table.beforeVibeScore} after={table.afterVibeScore} />
      </div>

      <div className="badge-row">
        {table.notes.map((note) => (
          <Badge key={note} tone="success">
            {note}
          </Badge>
        ))}
        {table.warnings.map((warning) => (
          <Badge key={warning} tone="warning">
            {warning}
          </Badge>
        ))}
      </div>

      {(table.explanations ?? []).length ? (
        <div className="compact-stack">
          {(table.explanations ?? []).map((line: string) => (
            <p key={`${table.tableId}-${line}`} className="field-help">
              {line}
            </p>
          ))}
        </div>
      ) : null}

      {table.moves.length ? (
        <div className="rotation-move-list">
          {table.moves.map((move) => (
            <div key={move.participantId} className="rotation-move-row">
              <div>
                <strong>{move.nickname}</strong>
                <span>
                  {formatTableName(move.fromTableId)} {"->"} {formatTableName(move.toTableId)}
                </span>
              </div>
              <div className="badge-row">
                {move.reasonTags.map((tag) => (
                  <Badge key={`${move.participantId}-${tag}`} tone="accent">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </article>
  );
}

export function RotationPanel({
  preview,
  onGenerate,
  onApply
}: {
  preview: RotationPreview | null;
  onGenerate: () => Promise<void>;
  onApply: () => Promise<void>;
}) {
  return (
    <div className="admin-main-column">
      <Surface className="inner-surface-highlight">
        <SectionHeader
          eyebrow="좌석 추천"
          title="ROUND_2 추천안 미리보기"
          description="자동 적용되지 않습니다. 추천 생성 -> 다시 섞기 -> 적용 순서로 운영자가 직접 결정합니다."
          actions={
            preview ? (
              <div className="button-row">
                <Button variant="secondary" onClick={() => void onGenerate()} data-testid="admin-reshuffle-rotation">
                  다시 섞기
                </Button>
                <Button onClick={() => void onApply()} data-testid="admin-apply-rotation">
                  적용
                </Button>
              </div>
            ) : (
              <Button onClick={() => void onGenerate()} data-testid="admin-generate-rotation">
                추천 생성
              </Button>
            )
          }
        />

        {preview ? (
          <>
            <div className="stats-row">
              <div className="stat-chip">
                <strong>추천 점수</strong>
                <span>
                  {preview.overallBeforeQuality} {"->"} {preview.overallAfterQuality}
                </span>
              </div>
              <div className="stat-chip">
                <strong>분산 지표</strong>
                <span>
                  {preview.overallBeforeHeat} {"->"} {preview.overallAfterHeat}
                </span>
              </div>
              <div className="stat-chip">
                <strong>총점</strong>
                <span>{preview.fairnessDelta}</span>
              </div>
            </div>

            <div className="rotation-move-list rotation-summary-list">
              {preview.moves.map((move) => (
                <div key={move.participantId} className="rotation-move-row">
                  <div>
                    <strong>{move.nickname}</strong>
                    <span>
                      {formatTableName(move.fromTableId)} {"->"} {formatTableName(move.toTableId)}
                    </span>
                  </div>
                  <div className="badge-row">
                    {move.reasonTags.map((tag) => (
                      <Badge key={`${move.participantId}-summary-${tag}`} tone="accent">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="rotation-stack">
              {preview.tablePreviews.map((table) => (
                <TableCard key={table.tableId} table={table} />
              ))}
            </div>
          </>
        ) : (
          <EmptyState
            title="추천안이 아직 없습니다."
            description="추천 생성 버튼을 눌러 ROUND_2 좌석 추천안을 확인해주세요."
          />
        )}
      </Surface>
    </div>
  );
}
