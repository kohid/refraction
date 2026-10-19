import InlineLink from 'refraction-app/ui/molecules/inline-link';
import InfoModal from './info-modal';
import { appsEventTrackingDispatch } from 'refraction-app/event-track/apps-event-tracking';

export default function ImportInfoModal( props ) {
	const eventTracking = ( element ) => appsEventTrackingDispatch(
		'kit-library/seek-more-info',
		{
			page_source: 'import',
			modal_type: 'info',
			event_type: 'click',
			element,
		},
	);
	return (
		<InfoModal { ...props } title={ __( 'Import a Website Template', 'refraction' ) }>
			<InfoModal.Section>
				<InfoModal.Heading>{ __( 'What’s a Website Template?', 'refraction' ) }</InfoModal.Heading>
				<InfoModal.Text>
					<>
						{ __( 'A Website Template is a .zip file that contains all the parts of a complete site. It’s an easy way to get a site up and running quickly.', 'refraction' ) }
						<br /><br />
						<InlineLink
							url="https://github.com/kohid/refraction#readme"
							onClick={ () => eventTracking( 'Learn more about website templates' ) }
						>
							{							// eslint-disable-next-line @wordpress/i18n-no-flanking-whitespace
							}							{ __( ' Learn more about Website Templates', 'refraction' ) }
						</InlineLink>
					</>
				</InfoModal.Text>
			</InfoModal.Section>

			<InfoModal.Section>
				<InfoModal.Heading>{ __( 'How does importing work?', 'refraction' ) }</InfoModal.Heading>
				<InfoModal.Text>
					<>
						{ __( 'Start by uploading the file and selecting the parts and plugins you want to apply. If there are any overlaps between the kit and your current design, you’ll be able to choose which imported parts you want to apply or ignore. Once the file is ready, the kit will be applied to your site and you’ll be able to see it live.', 'refraction' ) }
						<br /><br />
						<InlineLink
							url="https://github.com/kohid/refraction#readme"
							onClick={ () => eventTracking( 'learn more' ) }
						>
							{ __( 'Learn More', 'refraction' ) }
						</InlineLink>
					</>
				</InfoModal.Text>
			</InfoModal.Section>
		</InfoModal>
	);
}
