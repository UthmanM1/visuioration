export type AnalyticsEvent =
  | "page_view"
  | "project_created"
  | "dataset_import_started"
  | "dataset_import_completed"
  | "visualization_created"
  | "insight_opened"
  | "report_created"
  | "report_shared"
  | "ai_question_submitted";

type Properties = Record<string, string | number | boolean>;

const buffer: Array<{ event: AnalyticsEvent; properties: Properties; at: string }> = [];

/**
 * Mock analytics. Events stay in memory and are never sent anywhere.
 * Only pass non-personal properties (route, ids of demo objects, counts).
 * Production: forward to PostHog, Segment or a first-party endpoint.
 */
export function track(event: AnalyticsEvent, properties: Properties = {}) {
  buffer.push({ event, properties, at: new Date().toISOString() });
  if (buffer.length > 200) buffer.shift();
}

export function recentEvents() {
  return [...buffer];
}
