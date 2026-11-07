/**
 * Renders HTML in a real, laid-out document for a test.
 *
 * Each call creates a fresh 1024×768 iframe, so a test's page can't leak into
 * the next one and layout (sizes, positions) is real, not simulated.
 */
export interface MountOptions {
  /** The `<html lang>` value. `null` leaves it out. Defaults to "en-CA". */
  lang?: string | null;
}

export async function mount(
  html: string,
  options: MountOptions = {},
): Promise<Document> {
  const iframe = document.createElement("iframe");
  iframe.setAttribute("data-test-mount", "");
  iframe.style.cssText = "width: 1024px; height: 768px; border: 0";

  const loaded = new Promise<void>((resolve) => {
    iframe.addEventListener("load", () => resolve(), { once: true });
  });
  iframe.srcdoc = toDocument(html, options);
  document.body.append(iframe);
  await loaded;

  return iframe.contentDocument!;
}

function toDocument(html: string, { lang = "en-CA" }: MountOptions): string {
  if (/^<!doctype/i.test(html)) return html;
  const langAttribute = lang === null ? "" : ` lang="${lang}"`;
  return (
    `<!doctype html><html${langAttribute}>` +
    `<head><meta charset="utf-8"></head>` +
    `<body>${html}</body></html>`
  );
}
