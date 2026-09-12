import type { Activity } from "../../contracts/dashboard.js";
import { formatTime } from "./date-time.js";

export function ActivityFeed({ activities }: { activities: Activity[] }) {
  return (
    <section className="activity-panel" aria-labelledby="activity-title">
      <div className="section-heading">
        <h2 id="activity-title">操作履歴</h2>
      </div>
      {activities.length === 0 ? (
        <p className="subtle-note">操作履歴はありません。</p>
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
    </section>
  );
}
