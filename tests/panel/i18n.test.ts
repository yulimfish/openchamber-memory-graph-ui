import { expect, test } from "bun:test";
import { resolveLocale } from "../../panel/i18n";

test("selects Chinese for zh locales and English otherwise", () => {
  expect(resolveLocale("zh-CN")).toBe("zh");
  expect(resolveLocale("zh-TW")).toBe("zh");
  expect(resolveLocale("en-US")).toBe("en");
  expect(resolveLocale("fr-FR")).toBe("en");
});
