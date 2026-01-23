declare namespace NodeJS {
	interface ProcessEnv {
		OPENAI_API_KEY?: string;
		OPENAI_MODEL?: string;
		GEMINI_API_KEY?: string;
		GEMINI_MODEL?: string;
	}
}

export {};
