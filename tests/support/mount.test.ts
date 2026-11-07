import { expect, it } from "vitest";
import { mount } from "./mount";

it("renders real layout inside the mounted document", async () => {
  const doc = await mount(`<p style="width: 100px; margin: 0">x</p>`);
  expect(doc.querySelector("p")!.getBoundingClientRect().width).toBe(100);
  expect(doc.documentElement.getAttribute("lang")).toBe("en-CA");
});

it("can omit or replace the page language", async () => {
  const withoutLang = await mount("<p>x</p>", { lang: null });
  expect(withoutLang.documentElement.hasAttribute("lang")).toBe(false);
  const french = await mount("<p>x</p>", { lang: "fr-CA" });
  expect(french.documentElement.lang).toBe("fr-CA");
});

it("uses a full document as is", async () => {
  const doc = await mount(
    "<!DOCTYPE html><html><body><h1>Raw</h1></body></html>",
  );
  expect(doc.documentElement.hasAttribute("lang")).toBe(false);
  expect(doc.querySelector("h1")!.textContent).toBe("Raw");
});
