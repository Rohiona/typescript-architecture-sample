import { useEffect, useRef, useState } from "react";
import { Clock3, RotateCcw, UserRound, X } from "lucide-react";
import type { Customer } from "../../domain/rentals/types.js";
import { formatDate, formatTime } from "./date-time.js";

interface DemoControlsProps {
  now: number;
  customers: Customer[];
  actor: Customer;
  pending: boolean;
  error?: string;
  onActorChange: (id: string) => void;
  onAdvance: (minutes: 15 | 60) => void;
  onReset: () => Promise<boolean>;
}

function ResetDialog({
  onClose,
  onReset,
  pending,
  error,
}: {
  onClose: () => void;
  onReset: () => Promise<boolean>;
  pending: boolean;
  error?: string;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = dialog.current;
    if (element && !element.open) element.showModal();
  }, []);
  return (
    <dialog
      ref={dialog}
      className="reset-dialog"
      aria-labelledby="reset-title"
      onCancel={(event) => {
        event.preventDefault();
        if (!pending) onClose();
      }}
    >
      <div className="dialog-top">
        <span className="dialog-icon">
          <RotateCcw size={23} />
        </span>
        <button className="icon-button" type="button" aria-label="閉じる" disabled={pending} onClick={onClose}>
          <X size={20} />
        </button>
      </div>
      <h2 id="reset-title">デモを初期化しますか？</h2>
      <p>追加した予約と貸出履歴を消去し、9月14日 9:00 の初期状態に戻します。</p>
      {error && (
        <p className="inline-error" role="alert">
          {error}
        </p>
      )}
      <div className="dialog-actions">
        <button type="button" className="button secondary" onClick={onClose} disabled={pending}>
          戻る
        </button>
        <button
          type="button"
          className="button primary"
          disabled={pending}
          onClick={() => {
            void onReset().then((ok) => {
              if (ok) onClose();
            });
          }}
        >
          {pending ? "初期化中…" : "デモを初期化"}
        </button>
      </div>
    </dialog>
  );
}

export function DemoControls(props: DemoControlsProps) {
  const [resetOpen, setResetOpen] = useState(false);
  return (
    <section className="demo-strip" aria-label="デモの操作">
      <div className="demo-clock">
        <span className="demo-clock-label">デモ時刻</span>
        <div className="clock-reading">
          <Clock3 size={17} />
          <span>{formatDate(props.now)}</span>
          <strong>{formatTime(props.now)}</strong>
          <span className="timezone">JST</span>
        </div>
      </div>
      <div className="demo-toolbar">
        <div className="advance-buttons" aria-label="デモ時刻を進める">
          <button type="button" disabled={props.pending} onClick={() => props.onAdvance(15)}>
            +15分
          </button>
          <button type="button" disabled={props.pending} onClick={() => props.onAdvance(60)}>
            +1時間
          </button>
        </div>
        <button type="button" className="reset-button" disabled={props.pending} onClick={() => setResetOpen(true)}>
          <RotateCcw size={14} />
          <span>初期化</span>
        </button>
        <div className="actor-control">
          <UserRound size={17} aria-hidden="true" />
          <label className="sr-only" htmlFor="actor-select">
            利用者を切り替え
          </label>
          <select
            id="actor-select"
            value={props.actor.id}
            disabled={props.pending}
            onChange={(event) => props.onActorChange(event.target.value)}
          >
            {props.customers.map((customer) => (
              <option key={customer.id} value={customer.id}>
                {customer.name}
                {customer.role === "staff" ? "（スタッフ）" : ""}
              </option>
            ))}
          </select>
        </div>
      </div>
      {props.error && !resetOpen && (
        <p className="inline-error demo-error" role="alert">
          {props.error}
        </p>
      )}
      {resetOpen && (
        <ResetDialog
          onClose={() => setResetOpen(false)}
          onReset={props.onReset}
          pending={props.pending}
          error={props.error}
        />
      )}
    </section>
  );
}
