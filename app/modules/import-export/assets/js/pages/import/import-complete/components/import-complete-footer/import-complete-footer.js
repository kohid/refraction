import ActionsFooter from '../../../../../shared/actions-footer/actions-footer';
import Button from 'refraction-app/ui/molecules/button';
import useAction from 'refraction-app/hooks/use-action';
import { appsEventTrackingDispatch } from 'refraction-app/event-track/apps-event-tracking';

export default function ImportCompleteFooter( { seeItLiveUrl, referrer } ) {
	const action = useAction(),
		eventTracking = ( command, eventType = 'click' ) => {
			if ( 'kit-library' === referrer ) {
				appsEventTrackingDispatch(
					command,
					{
						page_source: 'kit is live',
						element_location: 'app_wizard_footer',
						event_type: eventType,
					},
				);
			}
		};

	return (
		<ActionsFooter>
			{
				seeItLiveUrl &&
				<Button
					text={ __( 'See It Live', 'refraction' ) }
					variant="contained"
					onClick={ () => {
						eventTracking( 'kit-library/see-it-live' );
						window.open( seeItLiveUrl, '_blank' );
					} }
				/>
			}

			<Button
				text={ __( 'Got It', 'refraction' ) }
				variant="contained"
				color="primary"
				onClick={ () => {
					eventTracking( 'kit-library/close' );
					action.backToDashboard();
				} }
			/>
		</ActionsFooter>
	);
}

ImportCompleteFooter.propTypes = {
	seeItLiveUrl: PropTypes.string,
	referrer: PropTypes.string,
};
