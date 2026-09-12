import { ArrowDown, Check, Package, Wrench } from "lucide-react";
import type { Equipment } from "../../domain/rentals/types.js";
import { EquipmentArt } from "./equipment-art.js";
import { formatPeriod } from "./date-time.js";

export function EquipmentCatalogue({
  equipment,
  selectedId,
  onSelect,
}: {
  equipment: Equipment[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  return (
    <section aria-labelledby="equipment-title">
      <div className="section-heading">
        <h2 id="equipment-title">機材を選択</h2>
        <span>{equipment.length}種類</span>
      </div>
      <div className="equipment-grid">
        {equipment.map((item) => (
          <article className={"equipment-card" + (selectedId === item.id ? " selected" : "")} key={item.id}>
            <div className="equipment-visual">
              <EquipmentArt category={item.category} />
              {selectedId === item.id && (
                <span className="selected-marker" aria-label="選択中">
                  <Check size={15} />
                </span>
              )}
            </div>
            <div className="equipment-card-body">
              <h3>{item.name}</h3>
              <p className="equipment-description">{item.description}</p>
              <div className="equipment-meta">
                <span>
                  <Package size={14} />
                  保有 {item.totalQuantity}台
                </span>
                <span>返却後の準備 {item.turnaroundMinutes}分</span>
              </div>
              {item.maintenance.length > 0 && (
                <details className="maintenance-details">
                  <summary>
                    <Wrench size={12} />
                    点検予定あり
                  </summary>
                  {item.maintenance.map((period) => (
                    <p key={period.startAt}>{formatPeriod(period.startAt, period.endAt)}</p>
                  ))}
                </details>
              )}
              <button
                type="button"
                className={"choose-equipment" + (selectedId === item.id ? " chosen" : "")}
                aria-pressed={selectedId === item.id}
                onClick={() => onSelect(item.id)}
              >
                <span>{selectedId === item.id ? "選択中・予約内容へ" : "この機材を予約する"}</span>
                <ArrowDown size={16} />
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
