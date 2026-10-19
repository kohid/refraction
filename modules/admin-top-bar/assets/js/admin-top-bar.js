import BarButton from './components/bar-button/bar-button';
import BarHeading from './components/bar-heading/bar-heading';
import ConnectionButton from './components/connection-button/connection-button';
import { useEffect, useRef } from 'react';
import { usePageTitle } from './hooks/use-page-title/use-page-title';
import environment from 'refraction-common/utils/environment';

export default function AdminTopBar() {
	const actionButtonsRef = useRef(),
		promotion = window.refractionAdminTopBarConfig.promotion;

	// Handle Top Bar visibility on initiation: Indicate that the admin top bar is visible and the page content needs to push down below the admin top bar for visibility.
	useEffect( () => {
		const adminTopBarElement = document.querySelector( '#e-admin-top-bar-root' );
		adminTopBarElement?.classList.add( 'e-admin-top-bar--active' );
		adminTopBarElement?.classList.add( 'e-admin-top-bar--editor-one' );
	}, [] );

	// Handle the page title visibility in admin top bar.
	const pageTitleText = usePageTitle();

	const finderAction = () => {
		$e.route( 'finder' );
	};

	const controlSign = environment.mac ? '\u2318' : '^';
	const finderTooltipText = __( 'Search or do anything in Refraction', 'refraction' ) + ` ${ controlSign }+E`;

	const BarButtonNotification = window?.refractionNotificationCenter?.BarButtonNotification;

	return (
		<div className="e-admin-top-bar">
			<div className="e-admin-top-bar__main-area">
				<BarHeading>{ pageTitleText }</BarHeading>
				<div className="e-admin-top-bar__main-area-buttons" ref={ actionButtonsRef } />
			</div>

			<div className="e-admin-top-bar__secondary-area">
				<div className="e-admin-top-bar__secondary-area-buttons">
					{ ! refractionAppConfig.hasPro && <BarButton additionalClasses="accent" href={ promotion.url } target="__blank" icon="rficon-upgrade-crown" iconAdditionalClasses="crown-icon">{ promotion.text }</BarButton> }
					<BarButton href={ window.refractionAdminTopBarConfig.apps_url } icon="rficon-integration">{ __( 'Add-ons', 'refraction' ) }</BarButton>
					{ window.refractionAdminTopBarConfig.is_administrator ? <BarButton onClick={ finderAction } dataInfo={ finderTooltipText } icon="rficon-search-bold">{ __( 'Finder', 'refraction' ) }</BarButton> : '' }
					{ window.refractionCloudAdmin ? window.refractionCloudAdmin() : '' }
					{ BarButtonNotification
						? <BarButtonNotification>{ __( 'What\'s New', 'refraction' ) }</BarButtonNotification>
						: ''
					}
				</div>
				<ConnectionButton />
			</div>
		</div>
	);
}
