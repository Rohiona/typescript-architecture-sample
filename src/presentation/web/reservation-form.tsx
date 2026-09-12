import { useId, useState } from "react";
import { ArrowRight, Clock3 } from "lucide-react";
import type { Customer, Equipment } from "../../domain/rentals/types.js";
import type { CreateReservationInput } from "../../application/ports/reservation-command-port.js";
import { defaultReservationPeriod, fromDateTimeInput, toDateTimeInput } from "./date-time.js";

interface ReservationFormProps {
  equipment: Equipment;
  actor: Customer;
  now: number;
  pending: boolean;
  error?: string;
  onSubmit: (input: CreateReservationInput) => void;
}

export function ReservationForm({ equipment, actor, now, pending, error, onSubmit }: ReservationFormProps) {
  const id = useId();
  const [customPeriod, setCustomPeriod] = useState<{ start: string; end: string } | null>(null);
  const period = customPeriod ?? defaultReservationPeriod(now);
  const [quantity, setQuantity] = useState("1");
  const [inputError, setInputError] = useState("");

  return (
    <section className="booking-panel" id="reservation-form" aria-labelledby="booking-title">
      <div className="panel-heading">
        <h2 id="booking-title">予約内容</h2>
        <span className="small-tag">日本時間</span>
      </div>
      <div className="selected-equipment-label">
        <span>選択中の機材</span>
        <strong>{equipment.name}</strong>
      </div>
      {actor.role === "staff" ? (
        <div className="staff-booking-note">
          <p>予約するには画面上部で利用者を選択してください。スタッフは「貸出管理」で貸出・返却を操作します。</p>
        </div>
      ) : (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            const startAt = fromDateTimeInput(period.start);
            const endAt = fromDateTimeInput(period.end);
            if (!Number.isFinite(startAt) || !Number.isFinite(endAt)) {
              setInputError("開始と終了の日時を正しく入力してください。");
              return;
            }
            setInputError("");
            onSubmit({ actorId: actor.id, equipmentId: equipment.id, quantity: Number(quantity), startAt, endAt });
          }}
        >
          <div className="date-fields">
            <label htmlFor={id + "-start"}>
              利用開始<span>JST</span>
              <input
                id={id + "-start"}
                type="datetime-local"
                required
                value={period.start}
                min={toDateTimeInput(now)}
                disabled={pending}
                onChange={(event) => {
                  setCustomPeriod({ ...period, start: event.target.value });
                }}
              />
            </label>
            <label htmlFor={id + "-end"}>
              利用終了<span>JST</span>
              <input
                id={id + "-end"}
                type="datetime-local"
                required
                value={period.end}
                disabled={pending}
                onChange={(event) => {
                  setCustomPeriod({ ...period, end: event.target.value });
                }}
              />
            </label>
          </div>
          <div className="quantity-field">
            <label htmlFor={id + "-quantity"}>数量</label>
            <div>
              <input
                id={id + "-quantity"}
                type="number"
                min="1"
                max={equipment.totalQuantity}
                step="1"
                required
                value={quantity}
                disabled={pending}
                onChange={(event) => setQuantity(event.target.value)}
              />
              <span>台</span>
            </div>
            <p>保有 {equipment.totalQuantity}台・空き状況は仮予約時に確認します</p>
          </div>
          <div className="hold-note">
            <Clock3 size={17} />
            <p>
              仮予約は<strong>15分間</strong>有効です。
              <br />
              内容を確認して、予約を確定してください。
            </p>
          </div>
          {(error || inputError) && (
            <p className="inline-error" role="alert">
              {error || inputError}
            </p>
          )}
          <button type="submit" className="button primary reserve-button" disabled={pending}>
            {pending ? "空き状況を確認中…" : "この内容で仮予約する"}
            <ArrowRight size={18} />
          </button>
        </form>
      )}
    </section>
  );
}
