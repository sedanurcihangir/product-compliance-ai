"use client";

import styles from "../dashboard.module.css";

export type TimelineItem = {
  id: number;
  title: string;
  dateLabel: string;
  description?: string | null;
};

type Props = {
  items: TimelineItem[];
};

export default function RegulationTimeline({ items }: Props) {
  if (items.length === 0) {
    return (
      <p className={styles.stateMessage}>
        Tarihli mevzuat kaydı bulunamadı. Timeline yalnızca effective_date
        dolu gerçek Regulation kayıtlarından oluşur.
      </p>
    );
  }

  return (
    <ol className={styles.timeline} aria-label="Mevzuat zaman çizgisi">
      {items.map((item) => (
        <li key={item.id} className={styles.timelineItem}>
          <div className={styles.timelineRail} aria-hidden>
            <span className={styles.timelineDot} />
          </div>
          <div className={styles.timelineCard}>
            <time className={styles.timelineDate}>{item.dateLabel}</time>
            <h3 className={styles.timelineTitle}>{item.title}</h3>
            {item.description ? (
              <p className={styles.timelineDesc}>{item.description}</p>
            ) : null}
          </div>
        </li>
      ))}
    </ol>
  );
}
