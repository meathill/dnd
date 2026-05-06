/* eslint-disable */
/// <reference path="./cloudflare-env.generated.d.ts" />

declare namespace Cloudflare {
  interface Env {
    INTERNAL_SERVICE_TOKEN?: string;
    DM_SYSTEM_PROMPT?: string;
  }
}

declare namespace NodeJS {
  interface ProcessEnv {
    INTERNAL_SERVICE_TOKEN?: string;
    DM_SYSTEM_PROMPT?: string;
  }
}
