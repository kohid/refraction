import React, { useContext, useEffect } from 'react';
import KitContent from '../../../../../shared/kit-content/kit-content';
import { SharedContext } from '../../../../../context/shared-context/shared-context-provider';
import kitContentData from '../../../../../shared/kit-content-data/kit-content-data';
import Notice from 'refraction-app/ui/molecules/notice';
import InlineLink from 'refraction-app/ui/molecules/inline-link';
import { cptObjectToOptionsArray } from '../../../../../shared/cpt-select-box/cpt-object-to-options-array';

export default function ImportContentDisplay( {
	manifest,
	hasPro,
	hasPlugins,
	isAllRequiredPluginsSelected,
	onResetProcess,
} ) {
	const sharedContext = useContext( SharedContext );
	// Getting the kit data from the manifest.
	const kitData = kitContentData.filter( ( { type } ) => {
		const contentType = 'settings' === type ? 'site-settings' : type,
			data = manifest?.[ contentType ];

		return ! ! ( Array.isArray( data ) ? data.length : data );
	} );

	useEffect( () => {
		sharedContext.dispatch( { type: 'SET_CPT', payload: cptObjectToOptionsArray( manifest?.[ 'custom-post-type-title' ], 'label' ) } );
	}, [] );

	if ( ! kitData.length && hasPlugins ) {
		return (
			<Notice color="info" label={ __( 'Note:', 'refraction' ) }>
				{ __( 'The Website Kit you’re using contains plugins for functionality, but no content or pages, etc.', 'refraction' ) }
			</Notice>
		);
	}

	if ( ! kitData.length ) {
		return (
			<Notice color="danger">
				{ __( 'You can’t use this Website Kit because it doesn’t contain any content, pages, etc. Try again with a different file.', 'refraction' ) } <InlineLink onClick={ onResetProcess }>{ __( 'Go Back', 'refraction' ) }</InlineLink>
			</Notice>
		);
	}

	return (
		<>
			{
				! isAllRequiredPluginsSelected &&
				<Notice color="warning" label={ __( 'Required plugins are still missing.', 'refraction' ) } className="e-app-import-content__plugins-notice">
					{ __( "If you don't include them, this kit may not work properly.", 'refraction' ) } <InlineLink url="/import/plugins">{ __( 'Go Back', 'refraction' ) }</InlineLink>
				</Notice>
			}

			<KitContent contentData={ kitData } hasPro={ hasPro } />
		</>
	);
}

ImportContentDisplay.propTypes = {
	manifest: PropTypes.object,
	hasPro: PropTypes.bool,
	hasPlugins: PropTypes.bool,
	isAllRequiredPluginsSelected: PropTypes.bool,
	onResetProcess: PropTypes.func,
};
