"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useActiveEdit } from "./ActiveEditContext";
import { useAnalysis } from "./AnalysisProvider";
import { StockSearchDropdown } from "./StockSearchDropdown";
import styles from "./EditPortfolioModal.module.css";

// Modal-relative row geometry per Figma §14-4. Wrapper top uses the change
// button's top (the smallest of the three); children are then positioned
// inside the wrapper using their offset from that anchor.
const WRAPPER_TOP_BASE = 14; // 131 - 117 (= 변경 btn top)
const ROW_GAP = 43;
const SEPARATOR_TOPS = [49, 92, 135, 178, 221, 264, 307]; // 7 lines

// Slot numbers (1–8) are rendered OUTSIDE the SortableRow at fixed modal-
// relative positions, so the number stays put while a row is being dragged
// (per user request 2026-05-26). y = 20 + i*43 matches Figma §14-4 text y.
const NUMBER_TOP_BASE = 20; // 137 - 117

// Inside-wrapper offsets (children top relative to wrapper top=0).
const NAME_TOP_IN_WRAPPER = 6;  // 20 - 14
const BTN_TOP_IN_WRAPPER = 0;
const HANDLE_TOP_IN_WRAPPER = 9; // 23 - 14

function padTo8(arr: readonly string[]): string[] {
  const out = [...arr];
  while (out.length < 8) out.push("");
  return out.slice(0, 8);
}

interface RowProps {
  id: number;
  index: number; // visible slot index 0..7
  name: string;
  anyDragging: boolean;
  onChangeClick: () => void;
}

/** A single sortable row. Listeners attach to the handle only, so the row
 *  body stays clickable. */
function SortableRow({ id, index, name, anyDragging, onChangeClick }: RowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const wrapperTop = WRAPPER_TOP_BASE + index * ROW_GAP;
  const style: React.CSSProperties = {
    top: wrapperTop,
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.9 : 1,
    boxShadow: isDragging ? "0 4px 12px rgba(0, 0, 0, 0.3)" : undefined,
    zIndex: isDragging ? 10 : undefined,
  };

  return (
    <div ref={setNodeRef} className={styles.row} style={style} {...attributes}>
      <p className={styles.stockName} style={{ top: NAME_TOP_IN_WRAPPER }}>
        {name}
      </p>
      <button
        type="button"
        className={styles.changeBtn}
        style={{ top: BTN_TOP_IN_WRAPPER }}
        onMouseDown={(e) => e.stopPropagation()}
        onClick={onChangeClick}
        disabled={anyDragging}
      >
        변경
      </button>
      <div
        className={styles.handle}
        style={{ top: HANDLE_TOP_IN_WRAPPER }}
        aria-label="드래그하여 순서 변경"
        {...listeners}
      >
        <span className={styles.handleLine} style={{ top: 0 }} />
        <span className={styles.handleLine} style={{ top: 5 }} />
        <span className={styles.handleLine} style={{ top: 10 }} />
      </div>
    </div>
  );
}

export function EditPortfolioModal() {
  const { activeVariant, autoOpenRow, closeEdit } = useActiveEdit();
  const { currentNames, spareNames, updatePortfolio } = useAnalysis();
  const modalRef = useRef<HTMLDivElement | null>(null);
  const [openRow, setOpenRow] = useState<number | null>(null);
  const [pendingNames, setPendingNames] = useState<string[]>([]);
  const [draggingId, setDraggingId] = useState<number | null>(null);

  // Pointer sensor with a 4px activation distance — prevents accidental drags
  // when the user just clicks the handle. Keyboard sensor intentionally not
  // registered (4a-7+ task).
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
  );

  // Stable sortable ids for the 8 slots. Index works because the slot count
  // is fixed and dnd-kit only swaps array positions, not the ids themselves.
  const sortableIds = useMemo(() => [0, 1, 2, 3, 4, 5, 6, 7], []);

  useEffect(() => {
    if (!activeVariant) {
      setPendingNames([]);
      setOpenRow(null);
      return;
    }
    const source = activeVariant === "current" ? currentNames : spareNames;
    setPendingNames(padTo8(source));
    setOpenRow(autoOpenRow);
  }, [activeVariant, autoOpenRow, currentNames, spareNames]);

  useEffect(() => {
    if (!activeVariant) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeEdit();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [activeVariant, closeEdit]);

  useEffect(() => {
    if (!activeVariant) return;
    const onDown = (e: MouseEvent) => {
      const node = modalRef.current;
      if (node && node.contains(e.target as Node)) return;
      closeEdit();
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [activeVariant, closeEdit]);

  const excludeNames = useMemo(
    () => pendingNames.filter((n) => n !== ""),
    [pendingNames],
  );

  const handleDragStart = (event: DragStartEvent) => {
    setDraggingId(event.active.id as number);
    // Drop any open dropdown — visually awkward to drag rows under it.
    if (openRow !== null) setOpenRow(null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setDraggingId(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const from = pendingNames.findIndex(
      (_, i) => sortableIds[i] === active.id,
    );
    const to = pendingNames.findIndex((_, i) => sortableIds[i] === over.id);
    if (from < 0 || to < 0) return;
    setPendingNames((p) => arrayMove(p, from, to));
  };

  if (!activeVariant) return null;

  const handleConfirm = () => {
    updatePortfolio(activeVariant, pendingNames);
    closeEdit();
  };

  return (
    <div
      ref={modalRef}
      className={styles.modal}
      data-variant={activeVariant}
      role="dialog"
      aria-modal="true"
      aria-label={`${activeVariant === "current" ? "현재" : "예비"} 포트폴리오 수정`}
    >
      {SEPARATOR_TOPS.map((top) => (
        <span key={`sep-${top}`} className={styles.separator} style={{ top }} />
      ))}

      {/* Slot numbers — fixed at each row's anchor so they don't move when
          the user drags a row. The number labels the SLOT, not the stock. */}
      {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
        <p
          key={`num-${i}`}
          className={styles.number}
          style={{ top: NUMBER_TOP_BASE + i * ROW_GAP }}
        >
          {i + 1}
        </p>
      ))}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={() => setDraggingId(null)}
      >
        <SortableContext items={sortableIds} strategy={verticalListSortingStrategy}>
          {pendingNames.map((name, i) => (
            <SortableRow
              key={sortableIds[i]}
              id={sortableIds[i]}
              index={i}
              name={name}
              anyDragging={draggingId !== null}
              onChangeClick={() => setOpenRow(i)}
            />
          ))}
        </SortableContext>
      </DndContext>

      <button type="button" className={styles.cancelBtn} onClick={closeEdit}>
        취소
      </button>
      <button type="button" className={styles.confirmBtn} onClick={handleConfirm}>
        완료
      </button>

      {openRow !== null && (
        <StockSearchDropdown
          excludeNames={excludeNames}
          rowIndex={
            activeVariant === "spare" && openRow >= 3 ? 2 : openRow
          }
          onSelect={(name) => {
            setPendingNames((p) => {
              const next = [...p];
              next[openRow] = name;
              return next;
            });
            setOpenRow(null);
          }}
          onClose={() => setOpenRow(null)}
        />
      )}
    </div>
  );
}
