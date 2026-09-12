import { ArrowUpRight, Clock3 } from "lucide-react";
import type { Activity } from "../../contracts/dashboard.js";
import { formatTime } from "./date-time.js";

export function ActivityFeed({ activities }: { activities: Activity[] }) {
  return (
    <section className="activity-panel" aria-labelledby="activity-title">
      <div className="section-heading">
        <h2 id="activity-title">最近の動き</h2>
        <ArrowUpRight size={17} />
      </div>
      {activities.length === 0 ? (
        <p className="subtle-note">予約や貸出を操作すると、ここに履歴が表示されます。</p>
      ) : (
        <ol className="activity-list">
          {activities.slice(0, 5).map((activity) => (
            <li key={activity.id}>
              <span className="activity-dot" />
              <p>{activity.message}</p>
              <time>{formatTime(activity.at)}</time>
            </li>
          ))}
        </ol>
      )}
      <div className="demo-tip">
        <Clock3 size={19} />
        <div>
          <strong>待ち時間も、さっと体験。</strong>
          <p>画面上部で時刻を進めると、予約の期限切れや貸出開始を試せます。</p>
        </div>
      </div>
    </section>
  );
}
