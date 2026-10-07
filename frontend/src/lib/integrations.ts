export type IntegrationCategory = "Meetings" | "Calendar" | "Communication" | "Productivity" | "CRM" | "Automation";

export interface Integration {
  name: string;
  description: string;
  category: IntegrationCategory;
  /** Tile colour: a data value (generic, not a brand logo). */
  color: string;
}

export const INTEGRATIONS: readonly Integration[] = [
  { name: "Zoom", description: "Record and transcribe Zoom calls automatically.", category: "Meetings", color: "#3b82f6" },
  { name: "Google Meet", description: "Bring the notetaker into every Meet call.", category: "Meetings", color: "#10b981" },
  { name: "Microsoft Teams", description: "Capture Teams meetings with notes and action items.", category: "Meetings", color: "#6366f1" },
  { name: "Google Calendar", description: "Auto-join the meetings on your calendar.", category: "Calendar", color: "#0ea5e9" },
  { name: "Slack", description: "Post meeting summaries to your channels.", category: "Communication", color: "#d946ef" },
  { name: "Notion", description: "Send notes and tasks to a Notion workspace.", category: "Productivity", color: "#64748b" },
  { name: "Asana", description: "Turn action items into Asana tasks.", category: "Productivity", color: "#f97316" },
  { name: "HubSpot", description: "Log call notes against contacts and deals.", category: "CRM", color: "#ef4444" },
  { name: "Salesforce", description: "Sync meeting summaries to Salesforce records.", category: "CRM", color: "#06b6d4" },
  { name: "Zapier", description: "Connect Fireflies to thousands of other apps.", category: "Automation", color: "#f59e0b" },
];

export const CATEGORIES: readonly IntegrationCategory[] = ["Meetings", "Calendar", "Communication", "Productivity", "CRM", "Automation"];

export const filterIntegrations = (category: IntegrationCategory | "All"): readonly Integration[] =>
  category === "All" ? INTEGRATIONS : INTEGRATIONS.filter((integration) => integration.category === category);
