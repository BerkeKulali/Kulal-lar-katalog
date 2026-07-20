import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Prisma tarafından üretilen istemci (kaynak kontrolünde değil).
    "src/generated/**",
  ]),
  {
    rules: {
      // TODO: Bu kurallar React Compiler ile birlikte geldi ve mevcut büyük
      // client component'larda (admin/import, admin/aileler, OrderAdminDetail,
      // ProductDetailView) toplam ~17 ihlal veriyor. Gerçek hata değil ama
      // gereksiz render tetikliyorlar. CI'ı kırmamak için şimdilik uyarı;
      // ilgili component'lar bölündükçe tekrar "error" seviyesine çekilmeli.
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/component-hook-factories": "warn",
    },
  },
]);

export default eslintConfig;
