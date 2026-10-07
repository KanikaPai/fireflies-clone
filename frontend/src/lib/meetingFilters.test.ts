import { describe, expect, it } from "vitest";

import { activeFilterCount, parseFilters, toApiParams } from "./meetingFilters";

describe("tag filters", () => {
  it("reads repeated tag_id params, dropping invalid and duplicate values", () => {
    const filters = parseFilters(new URLSearchParams("tag_id=2&tag_id=5&tag_id=2&tag_id=abc&tag_id=-1"));
    expect(filters.tagIds).toEqual([2, 5]);
    expect(activeFilterCount(filters)).toBe(1);
  });

  it("sends them to the API as a list", () => {
    expect(toApiParams(parseFilters(new URLSearchParams("tag_id=3&tag_id=4"))).tag_id).toEqual([3, 4]);
    expect(toApiParams(parseFilters(new URLSearchParams(""))).tag_id).toBeUndefined();
  });
});
