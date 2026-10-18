type Props = {
	prompt: string;
	panelZIndex: number;
	variant?: 'icon' | 'button';
};

/**
 * Upstream rendered a "Fix with Angie" action here that sent the prompt to Elementor's AI assistant.
 * Refraction has no AI integration, so the action is not rendered.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export default function FixViolationWithAngie( _props: Props ) {
	return null;
}
