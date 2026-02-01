declare namespace NodeJS {
  interface ProcessEnv {
    OPENAI_API_KEY?: string;
    OPENAI_MODEL?: string;
    GEMINI_API_KEY?: string;
    GEMINI_MODEL?: string;
    ALLOW_SIGN_UP?: string;
    ROOT_PASSWORD?: string;
  }
}

declare global {
  interface CloudflareEnv {
    DB?: D1Database;
    OPENAI_API_KEY?: string;
    OPENAI_MODEL?: string;
    GEMINI_API_KEY?: string;
    GEMINI_MODEL?: string;
    ALLOW_SIGN_UP?: string;
    ROOT_PASSWORD?: string;
  }
}

export {};
