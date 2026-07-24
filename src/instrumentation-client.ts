// This file configures the initialization of Sentry on the client.
// The added config here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";
import { setErrorSink } from "@/lib/report-error";

Sentry.init({
  dsn: "https://396d2a80b81fdcb097b79ffaf0256e26@o4511787011080192.ingest.de.sentry.io/4511787018944592",

  // Düşük hacimli iç uygulama; ücretsiz kotayı korumak için örnekleme düşük.
  tracesSampleRate: 0.1,
  // Enable logs to be sent to Sentry
  enableLogs: true,

  dataCollection: {
    // To disable sending user data and HTTP bodies, uncomment the lines below. For more info visit:
    // https://docs.sentry.io/platforms/javascript/guides/nextjs/configuration/options/#dataCollection
    // userInfo: false,
    // httpBodies: [],
  },
});

// reportError çağrılarını (hata sınırları, sipariş rotası vb.) Sentry'ye ilet.
setErrorSink((error, context) =>
  Sentry.captureException(error, { extra: context })
);

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
