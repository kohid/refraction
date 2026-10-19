import React, { useEffect, useContext } from 'react';

import { ExportContext } from '../../../context/export-context/export-context-provider';
import { SharedContext } from '../../../context/shared-context/shared-context-provider';

import { cptObjectToOptionsArray } from '../../../shared/cpt-select-box/cpt-object-to-options-array';
import Layout from '../../../templates/layout';
import PageHeader from '../../../ui/page-header/page-header';
import KitContent from '../../../shared/kit-content/kit-content';
import KitInformation from './components/kit-information/kit-information';
import ActionsFooter from '../../../shared/actions-footer/actions-footer';
import InlineLink from 'refraction-app/ui/molecules/inline-link';
import Button from 'refraction-app/ui/molecules/button';
import Grid from 'refraction-app/ui/grid/grid';

import kitContentData from '../../../shared/kit-content-data/kit-content-data';

import './export-kit.scss';

export default function ExportKit() {
	const exportContext = useContext( ExportContext ),
		sharedContext = useContext( SharedContext ),
		getFooter = () => (
			<ActionsFooter>
				<Button
					variant="contained"
					text={ __( 'Next', 'refraction' ) }
					color={ exportContext.data.kitInfo.title ? 'primary' : 'disabled' }
					url={ exportContext.data.kitInfo.title ? '/export/plugins' : '' }
				/>
			</ActionsFooter>
		),
		getLearnMoreLink = () => (
			<InlineLink url="https://github.com/kohid/refraction#readme" italic>
				{ __( 'Learn More', 'refraction' ) }
			</InlineLink>
		);

	useEffect( () => {
		exportContext.dispatch( { type: 'SET_IS_EXPORT_PROCESS_STARTED', payload: true } );
		sharedContext.dispatch( { type: 'SET_CPT', payload: cptObjectToOptionsArray( refractionAppConfig[ 'import-export' ].summaryTitles.content?.customPostTypes, 'plural' ) } );
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [] );

	return (
		<Layout type="export" footer={ getFooter() }>
			<section className="e-app-export-kit">
				<PageHeader
					heading={ __( 'Select which items to export', 'refraction' ) }
					description={ [
						__( 'You can export the content, site settings, and templates as a Website Template to be reused in the future.', 'refraction' ),
						<React.Fragment key="description-secondary-line">
							{ __( 'Uncheck the items you don\'t want to include.', 'refraction' ) } { getLearnMoreLink() }
						</React.Fragment>,
					] }
				/>

				<Grid container direction="column" className="e-app-export-kit__content">
					<KitInformation />

					<KitContent contentData={ kitContentData } />
				</Grid>
			</section>
		</Layout>
	);
}
