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
        <TableSignal label="Gender gap" before={table.beforeGenderBalance} after={table.afterGenderBalance} />
        <TableSignal label="Repeat pairs" before={table.beforeRepeatMeetings} after={table.afterRepeatMeetings} />
        <TableSignal label="Popularity load" before={table.beforePopularityLoad} after={table.afterPopularityLoad} />
        <TableSignal label="Vibe" before={table.beforeVibeScore} after={table.afterVibeScore} />
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
          eyebrow="ROTATION"
          title="Preview before apply"
          description="Gender balance, repeat avoidance, popularity spread, and table vibe are scored in one preview."
          actions={
            preview ? (
              <Button onClick={() => void onApply()} data-testid="admin-apply-rotation">
                Apply preview
              </Button>
            ) : (
              <Button onClick={() => void onGenerate()} data-testid="admin-generate-rotation">
                Generate preview
              </Button>
            )
          }
        />

        {preview ? (
          <>
            <div className="stats-row">
              <div className="stat-chip">
                <strong>Quality</strong>
                <span>
                  {preview.overallBeforeQuality} {"->"} {preview.overallAfterQuality}
                </span>
              </div>
              <div className="stat-chip">
                <strong>Heat</strong>
                <span>
                  {preview.overallBeforeHeat} {"->"} {preview.overallAfterHeat}
                </span>
              </div>
              <div className="stat-chip">
                <strong>Fairness</strong>
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
            title="No preview yet"
            description="Generate the next round assignment before applying rotation."
          />
        )}
      </Surface>
    </div>
  );
}
