import { DirectionProvider, ThemeProvider } from '@elementor/ui';
import { App } from './App';

export const AppModern = () => {
	const isRTL = typeof refractionCommon !== 'undefined' && refractionCommon.config?.isRTL
		? refractionCommon.config.isRTL
		: 'rtl' === document.documentElement.dir || document.body.classList.contains( 'rtl' );

	return (
		<DirectionProvider rtl={ isRTL }>
			<ThemeProvider colorScheme="light">
				<App />
			</ThemeProvider>
		</DirectionProvider>
	);
};

