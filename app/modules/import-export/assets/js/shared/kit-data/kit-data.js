import { memo } from 'react';

import SiteArea from './components/site-area/site-area';
import Included from './components/included/included';
import DataTable from 'refraction-app/molecules/data-table';

import useKitData from './hooks/use-kit-data';

import './kit-data.scss';

const siteEditorPath = refractionAppConfig.hasPro ? '#/site-editor' : '#/site-editor/promotion';

function KitData( { data } ) {
	const { templates, siteSettings, content, plugins } = useKitData( data ),
		{ refractionHomePageUrl, recentlyEditedRefractionPageUrl } = data?.configData || refractionAppConfig[ 'import-export' ],
		siteSettingsUrl = refractionHomePageUrl || recentlyEditedRefractionPageUrl,
		headers = [
			__( 'Site Area', 'refraction' ),
			__( 'Included', 'refraction' ),
		],
		rowsData = [
			{
				siteArea: __( 'Refraction Templates', 'refraction' ),
				link: refractionAppConfig.base_url + siteEditorPath,
				included: templates,
			},
			{
				siteArea: __( 'Site Settings', 'refraction' ),
				link: siteSettingsUrl ? siteSettingsUrl + '#e:run:panel/global/open' : '',
				included: siteSettings,
			},
			{
				siteArea: __( 'Content', 'refraction' ),
				link: refractionAppConfig.admin_url + 'edit.php?post_type=page',
				included: content,
			},
			{
				siteArea: __( 'Plugins', 'refraction' ),
				link: refractionAppConfig.admin_url + 'plugins.php',
				included: plugins,
			},
		],
		rows = rowsData
			.map( ( { siteArea, included, link } ) => {
				if ( ! included.length ) {
					// eslint-disable-next-line array-callback-return
					return;
				}

				return [
					<SiteArea key={ siteArea } text={ siteArea } link={ link } />,
					<Included key={ included } data={ included } />,
				];
			} )
			.filter( ( row ) => row );

	if ( ! rows.length ) {
		return null;
	}

	return (
		<DataTable
			className="e-app-import-export-kit-data"
			headers={ headers }
			rows={ rows }
			layout={ [ 1, 3 ] }
		/>
	);
}

KitData.propTypes = {
	data: PropTypes.object,
};

export default memo( KitData );
