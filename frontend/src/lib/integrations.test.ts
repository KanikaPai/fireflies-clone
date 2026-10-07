import { describe, expect, it } from "vitest";

import { CATEGORIES, INTEGRATIONS, filterIntegrations } from "./integrations";

describe("integrations", () => {
  it("lists the ten required integrations", () => {
    expect(INTEGRATIONS.map((i) => i.name).sort()).toEqual(
      ["Asana", "Google Calendar", "Google Meet", "HubSpot", "Microsoft Teams", "Notion", "Salesforce", "Slack", "Zapier", "Zoom"],
    );
  });
  it("has at least one integration in every category", () => {
    for (const category of CATEGORIES) expect(filterIntegrations(category).length).toBeGreaterThan(0);
  });
  it("filters by category and returns all for All", () => {
    expect(filterIntegrations("All")).toHaveLength(10);
    expect(filterIntegrations("CRM").map((i) => i.name)).toEqual(["HubSpot", "Salesforce"]);
  });
});
