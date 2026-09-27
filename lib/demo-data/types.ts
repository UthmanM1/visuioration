export type RegionName = "North" | "South" | "East" | "West";
export type CategoryName = "Electronics" | "Home" | "Apparel" | "Outdoor" | "Accessories";
export type Status = "active" | "draft" | "archived" | "processing" | "error";

export interface MonthlyPoint {
  key: string;
  label: string;
  revenue: number;
  orders: number;
  sessions: number;
  newCustomers: number;
  marketingSpend: number;
}

export interface User {
  id: string;
  name: string;
  initials: string;
  email: string;
  role: "Owner" | "Admin" | "Member" | "Analyst" | "Marketing" | "Executive" | "Viewer";
  title: string;
  lastActive: string;
  permissions: "Full access" | "Can edit" | "Can comment" | "Can view";
  color: string;
}

export interface Project {
  slug: string;
  name: string;
  description: string;
  ownerId: string;
  collaboratorIds: string[];
  datasetSlug: string;
  status: "Active" | "In review" | "Draft" | "Archived";
  updated: string;
  reportSlugs: string[];
  visualizationIds: string[];
  /** Set for records loaded from the database. */
  id?: string;
  owner?: User;
  collaborators?: User[];
  datasetName?: string;
}

export interface Dataset {
  slug: string;
  name: string;
  description: string;
  rows: number;
  columns: number;
  source: "CSV upload" | "Excel" | "Google Sheets" | "REST API";
  updated: string;
  status: "Ready" | "Refreshing" | "Uploading" | "Processing" | "Needs review" | "Failed";
  sizeLabel: string;
  owner: string;
  /** Set for records loaded from the database. */
  id?: string;
  ownerName?: string;
  fileName?: string | null;
  errorMessage?: string | null;
  issues?: Array<{ code: string; message: string; column?: string }>;
  /** Live datasets: every row is loaded into the database and can be charted. */
  chartReady?: boolean;
}

export type ChartKind = "line" | "bar" | "area" | "donut" | "scatter" | "table" | "kpi" | "heatmap";

export interface Visualization {
  id: string;
  name: string;
  description: string;
  kind: ChartKind;
  datasetSlug: string;
  ownerId: string;
  updated: string;
  onDashboard: boolean;
}

export interface Insight {
  id: string;
  title: string;
  summary: string;
  tone: "risk" | "opportunity" | "neutral";
  category: "Revenue" | "Region" | "Product" | "Conversion" | "Acquisition";
  period: string;
  impact: string;
  primaryDriver: string;
  secondaryDriver: string;
  created: string;
}

export interface Report {
  slug: string;
  name: string;
  description: string;
  period: string;
  ownerId: string;
  status: "Published" | "Draft" | "Scheduled";
  updated: string;
  pages: number;
  shareSlug?: string;
}

export interface Notification {
  id: string;
  message: string;
  detail: string;
  time: string;
  href: string;
  unread: boolean;
  kind: "report" | "insight" | "share" | "dataset";
}

export interface Activity {
  id: string;
  actorId: string | "ai";
  action: string;
  target: string;
  time: string;
}
