import { register } from "node:module";
import { pathToFileURL } from "node:url";

// `--loader` kullanımdan kalkıyor; önerilen register() API'si ile bağlanıyoruz.
register("./test-alias-loader.mjs", pathToFileURL(import.meta.filename));
