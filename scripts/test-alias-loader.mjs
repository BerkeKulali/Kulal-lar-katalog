import path from "node:path";
import { pathToFileURL } from "node:url";

/**
 * `@/` yol takma adını (tsconfig.json paths) Node'un modül çözümleyicisine
 * tanıtır. Testler Node'un yerleşik test koşucusu ve tip sıyırma özelliğiyle
 * çalıştığı için ek bir derleyici bağımlılığı gerekmiyor.
 */
const SRC_URL = pathToFileURL(path.resolve(process.cwd(), "src") + path.sep).href;
const EXTENSIONS = ["", ".ts", ".tsx", "/index.ts", "/index.tsx"];

export async function resolve(specifier, context, nextResolve) {
  if (!specifier.startsWith("@/")) {
    return nextResolve(specifier, context);
  }

  const base = new URL(specifier.slice(2), SRC_URL).href;
  let lastError;

  for (const ext of EXTENSIONS) {
    try {
      return await nextResolve(base + ext, context);
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError;
}
