import InlineLink from 'refraction-app/ui/molecules/inline-link';
import InfoModal from './info-modal';

export default function ExportInfoModal( props ) {
	return (
		<InfoModal { ...props } title={ __( 'Export a Website Kit', 'refraction' ) }>
			<InfoModal.Section>
				<InfoModal.Heading>{ __( 'What’s a Website Kit?', 'refraction' ) }</InfoModal.Heading>
				<InfoModal.Text>
					<>
						{ __( 'A Website Kit is a .zip file that contains all the parts of a complete site. It’s an easy way to get a site up and running quickly.', 'refraction' ) }
						<br /><br />
						{ /* eslint-disable-next-line @wordpress/i18n-no-flanking-whitespace */ }
						<InlineLink url="https://github.com/kohid/refraction#readme">{ __( 'Learn more about Website Kits', 'refraction' ) }</InlineLink>
					</>
				</InfoModal.Text>
			</InfoModal.Section>

			<InfoModal.Section>
				<InfoModal.Heading>{ __( 'How does exporting work?', 'refraction' ) }</InfoModal.Heading>
				<InfoModal.Text>
					<>
						{ __( 'To turn your site into a Website Kit, select the templates, content, settings and plugins you want to include. Once it’s ready, you’ll get a .zip file that you can import to other sites.', 'refraction' ) }
						<br /><br />
						<InlineLink url="https://github.com/kohid/refraction#readme">{ __( 'Learn More', 'refraction' ) }</InlineLink>
					</>
				</InfoModal.Text>
			</InfoModal.Section>
		</InfoModal>
	);
}
