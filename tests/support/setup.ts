import { afterEach } from "vitest";

// Remove every page mounted by the test that just finished.
afterEach(() => {
  for (const iframe of document.querySelectorAll("iframe[data-test-mount]")) {
    iframe.remove();
  }
});
