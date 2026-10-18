import ReactUtils from 'refraction-utils/react';
import { RefractionOneHeader, RefractionOneAssetsProvider } from '@elementor/elementor-one-assets';
import { useAdminMenuOffset } from '../sidebar-navigation/components/hooks/use-admin-menu-offset';
import isRTL from '../shared/is-rtl';
import mapWordPressLocaleToRefractionOneLanguage from '../shared/map-wordpress-locale-to-refraction-one-language';

const App = () => {
	const { refractionOneTopBarConfig: { version, title, environment, locale } } = window;

	const isRtlLanguage = isRTL();

	useAdminMenuOffset();

	return (
		<RefractionOneAssetsProvider
			env={ environment }
			isRTL={ isRtlLanguage }
			language={ mapWordPressLocaleToRefractionOneLanguage( locale ) }
		>
			<RefractionOneHeader
				appSettings={ { slug: 'refraction', version } }
				isWithinWpAdmin
				title={ title }
			/>
		</RefractionOneAssetsProvider>
	);
};

const rootElement = document.getElementById( 'editor-one-top-bar' );

if ( rootElement ) {
	ReactUtils.render(
		<App />,
		rootElement,
	);
}
