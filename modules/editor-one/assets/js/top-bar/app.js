import ReactUtils from 'refraction-utils/react';
import { useAdminMenuOffset } from '../sidebar-navigation/components/hooks/use-admin-menu-offset';

/**
 * Local-only admin header. It replaces the cloud-hosted header component that the upstream code
 * loaded from an external npm package; nothing here talks to a remote service.
 */
const App = () => {
	const { refractionOneTopBarConfig: { title, logoUrl } } = window;

	useAdminMenuOffset();

	return (
		<header className="e-admin-top-bar">
			{ logoUrl && <img className="e-admin-top-bar__logo" src={ logoUrl } alt="" width="26" height="26" /> }
			<span className="e-admin-top-bar__name">Refraction</span>
			<span className="e-admin-top-bar__title">{ title }</span>
		</header>
	);
};

const rootElement = document.getElementById( 'editor-one-top-bar' );

if ( rootElement ) {
	ReactUtils.render(
		<App />,
		rootElement,
	);
}
