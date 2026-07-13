// Custom TelemetryTest AI collector fixture for Trailhead.
//
// Why this isn't just `import { test } from ".../collector/playwright/fixture.js"` (the tool's
// own shipped fixture, examples/checkout-payment-retry.spec.ts): that fixture hardcodes
// `defaultConfig()` with no override, and the tool's default endpoint matchers are
// `**/v1/track` / `**/collect` (src/collector/config.ts) — Trailhead's single ingestion
// endpoint is `/api/track`. `defaultConfig()` *does* accept overrides, so this file is the
// ~30-line fixture the tool ships, parameterized for our endpoint, rather than a fork.
// See integration/FRICTION-LOG.md "Step 1" for why vendoring source was necessary at all
// (the CLI/collector aren't published to any package registry).
import { test as base } from "@playwright/test";
import { CaptureAccumulator, type CollectorAdapter } from "../../.qualiber-vendor/src/collector/adapter.js";
import { defaultConfig } from "../../.qualiber-vendor/src/collector/config.js";
import type { buildCapture } from "../../.qualiber-vendor/src/collector/pipeline.js";

export interface TelemetryTestHandle extends CollectorAdapter {
  startJourney(journeyId: string): Promise<void>;
  markStep(stepId: string): Promise<void>;
  endJourney(): Promise<void>;
  getCapture(): ReturnType<typeof buildCapture>;
}

interface Fixtures {
  telemetryTest: TelemetryTestHandle;
}

const trailheadCollectorConfig = defaultConfig({
  endpoints: [
    {
      name: "trailhead_track",
      urlPatterns: ["**/api/track"],
      methods: ["POST"],
      bodyType: "json",
      eventNamePath: "event",
      propertiesPath: "properties",
    },
  ],
});

export const test = base.extend<Fixtures>({
  telemetryTest: async ({ page }, use, testInfo) => {
    const acc = new CaptureAccumulator({
      config: trailheadCollectorConfig,
      browserContextId: `ctx_${testInfo.workerIndex}`,
      workerIndex: testInfo.workerIndex,
      testRunId: `run_${testInfo.workerIndex}_${testInfo.repeatEachIndex}`,
      testId: testInfo.titlePath.join(" > "),
      ciRunId: process.env.GITHUB_RUN_ID,
    });

    page.on("request", (request) => {
      acc.onRawRequest({
        url: request.url(),
        method: request.method(),
        postData: request.postData(),
      });
    });

    const handle: TelemetryTestHandle = {
      async startJourney(j) {
        acc.startJourney(j);
      },
      async markStep(stepId) {
        acc.markStep(stepId);
      },
      async endJourney() {
        acc.endJourney();
      },
      getCapture() {
        return acc.getCapture();
      },
    };

    await use(handle);
  },
});

export { expect } from "@playwright/test";
