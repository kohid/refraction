import Notice from 'refraction-app/ui/molecules/notice';
import Button from 'refraction-app/ui/molecules/button';

import './failed-plugins-notice.scss';

export default function FailedPluginsNotice( { failedPlugins } ) {
	const getButton = () => (
		<Button
			text={ __( 'Learn more', 'refraction' ) }
			variant="outlined"
			color="secondary"
			size="sm"
			target="_blank"
			url="https://github.com/kohid/refraction/issues"
		/>
	);

	return (
		<Notice className="e-app-import-failed-plugins-notice" label={ __( 'Important:', 'refraction' ) } color="warning" button={ getButton() }>
			{
				__( "There are few plugins that we couldn't install:", 'refraction' ) + ' ' +
				failedPlugins.map( ( { name } ) => name ).join( ' | ' )
			}
		</Notice>
	);
}

FailedPluginsNotice.propTypes = {
	failedPlugins: PropTypes.array,
};
