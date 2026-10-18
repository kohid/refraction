import Notice from 'refraction-app/ui/molecules/notice';
import Button from 'refraction-app/ui/molecules/button';

import './connect-pro-notice.scss';

export default function ConnectProNotice() {
	const getButton = () => (
		<Button
			text={ __( 'Let’s do it', 'refraction' ) }
			variant="outlined"
			color="secondary"
			size="sm"
			target="_blank"
			url={ refractionAppConfig.admin_url + 'admin.php?page=refraction-license' }
		/>
	);

	return (
		<Notice className="e-app-import-connect-pro-notice" label={ __( 'Tip:', 'refraction' ) } color="info" button={ getButton() }>
			{ __( 'Make sure your Refraction Pro account is connected', 'refraction' ) }
		</Notice>
	);
}
