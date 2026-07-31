import { useState } from "react";
import AnalyticsWidgetBoard from "./AnalyticsWidgetBoard.jsx";
import {
  ANALYTICS_SECTIONS,
  ANALYTICS_WIDGETS_STORAGE_KEY,
  DEFAULT_VISIBLE_WIDGET_IDS,
} from "./analyticsWidgets.js";

export default function AnalyticsPage({ layouts, token, toast }) {
  const [section, setSection] = useState("all");

  return (
    <section className="fade module-page analytics-page">
      <div className="module-header analytics-header">
        <div>
          <h2 className="page-title">
            <span className="module-emoji">📈</span> Analytics
          </h2>
          <p className="muted analytics-subtitle">
            Store layout reports — M9 calculation logic with section filters
          </p>
        </div>
      </div>

      <div className="analytics-section-filters" role="tablist" aria-label="Report sections">
        {ANALYTICS_SECTIONS.map((s) => (
          <button
            key={s.id}
            type="button"
            role="tab"
            aria-selected={section === s.id}
            className={`analytics-section-chip${section === s.id ? " analytics-section-chip--active" : ""}`}
            onClick={() => setSection(s.id)}
          >
            {s.label}
          </button>
        ))}
      </div>

      <AnalyticsWidgetBoard
        layouts={layouts}
        token={token}
        toast={toast}
        storageKey={ANALYTICS_WIDGETS_STORAGE_KEY}
        defaultVisibleIds={DEFAULT_VISIBLE_WIDGET_IDS}
        sectionFilter={section}
        showLayoutPicker
        showCustomize
        customizeTitle="Customize analytics dashboard"
        emptyMessage="Select a layout to view reports."
        pinFeaturedWidgets
      />
    </section>
  );
}
