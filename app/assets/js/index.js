import ReactUtils from 'refraction-utils/react';
import App from './app';
import ImportExport from '../../modules/import-export/assets/js/module';
import ImportExportCustomization from '../../modules/import-export-customization/assets/js/module';

import AppProvider from './app-context';

new ImportExport();

if ( refractionCommon?.config?.experimentalFeatures?.[ 'import-export-customization' ] ) {
	new ImportExportCustomization();
}

const AppWrapper = React.Fragment;

ReactUtils.render( (
	<AppWrapper>
		<AppProvider>
			<App />
		</AppProvider>
	</AppWrapper>
), document.getElementById( 'e-app' ) );
