interface OnboardingRestConfig {
	restUrl: string;
	nonce: string;
	isHelloThemeActive?: boolean;
}

export function getConfig(): OnboardingRestConfig | null {
	return window.refractionAppConfig?.onboarding ?? null;
}
