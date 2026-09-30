// Pin "today" so CY-relative results are reproducible. Runs before each test file's imports.
import { vi } from "vitest";
vi.useFakeTimers({ toFake: ["Date"] });
vi.setSystemTime(new Date("2026-06-15T12:00:00Z"));
