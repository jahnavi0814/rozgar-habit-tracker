import assert from "node:assert/strict";
import test from "node:test";
import {
  isValidDateKey,
  isValidTimeZone,
  localDateForTimeZone,
  previousSevenDateKeys,
  weekdayIndexForDateKey,
  weekdayLabelForDateKey,
} from "./date-utils";

test("converts instants to the requested local calendar date", () => {
  assert.equal(
    localDateForTimeZone(new Date("2026-10-19T20:30:00.000Z"), "Asia/Kolkata"),
    "2026-10-20",
  );
  assert.equal(isValidTimeZone("Asia/Kolkata"), true);
  assert.equal(isValidTimeZone("Not/A_Time_Zone"), false);
});

test("validates real date keys and produces seven consecutive local dates", () => {
  assert.equal(isValidDateKey("2024-02-29"), true);
  assert.equal(isValidDateKey("2026-02-29"), false);
  assert.equal(isValidDateKey("2026-2-09"), false);

  assert.deepEqual(previousSevenDateKeys("2026-10-19"), [
    "2026-10-13",
    "2026-10-14",
    "2026-10-15",
    "2026-10-16",
    "2026-10-17",
    "2026-10-18",
    "2026-10-19",
  ]);
  assert.equal(weekdayIndexForDateKey("2026-10-19"), 0);
  assert.equal(weekdayLabelForDateKey("2026-10-19"), "Mon");
});
