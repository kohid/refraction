import {
	Box,
	Switch,
	Typography,
	Table,
	TableHead,
	TableBody,
	TableRow,
	TableCell,
	TableSortLabel,
	TableContainer,
	Paper,
	styled,
} from '@elementor/ui';
import { __ } from '@wordpress/i18n';
import PropTypes from 'prop-types';

import { UsageTimesColumn } from './UsageTimesColumn';

const StyledSwitch = styled( Switch )( {
	'& .MuiSwitch-track': {
		backgroundColor: 'rgba(0, 0, 0, 0.12);',
	},
	'& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
		backgroundColor: '#000',
	},
	'& .MuiSwitch-switchBase:not(.Mui-checked) .MuiSwitch-thumb': {
		backgroundColor: '#D5D8DC',
	},
	'& .MuiSwitch-switchBase.Mui-checked .MuiSwitch-thumb': {
		backgroundColor: '#fff',
	},
} );

export const WidgetsTable = ( {
	widgets,
	widgetsDisabled,
	widgetsRoleRestrictions,
	setWidgetsRoleRestrictions,
	roles,
	promotionWidgets,
	promotionData,
	usageWidgets,
	getWidgetUsage,
	onScanUsage,
	onToggleWidget,
	getSortingIndicatorClasses,
	onSortingClicked,
} ) => {
	const sortingClasses = getSortingIndicatorClasses( 'widget' );
	const isWidgetSorted = sortingClasses.includes( 'sorted' );
	const widgetSortDirection = sortingClasses.includes( 'asc' ) ? 'asc' : 'desc';

	const usageSortingClasses = getSortingIndicatorClasses( 'usage' );
	const isUsageSorted = usageSortingClasses.includes( 'sorted' );
	const usageSortDirection = usageSortingClasses.includes( 'asc' ) ? 'asc' : 'desc';

	if ( ! widgets.length ) {
		return (
			<Typography color="text.secondary">
				{ __( 'No elements found.', 'refraction' ) }
			</Typography>
		);
	}

	return (
		<TableContainer component={ Paper } variant="outlined">
			<Table size="small">
				<TableHead>
					<TableRow>
						<TableCell sx={ ( theme ) => ( { width: theme.spacing( 25 ) } ) }>
							<TableSortLabel
								active={ isWidgetSorted }
								direction={ isWidgetSorted ? widgetSortDirection : 'asc' }
								onClick={ () => onSortingClicked( 'widget' ) }
								data-id="e-id-refraction-element-manager-button-sort-by-element"
							>
								{ __( 'Element', 'refraction' ) }
							</TableSortLabel>
						</TableCell>
						<TableCell sx={ ( theme ) => ( { width: theme.spacing( 10 ) } ) }>
							{ __( 'Status', 'refraction' ) }
						</TableCell>
						<TableCell>
							<TableSortLabel
								active={ isUsageSorted }
								direction={ isUsageSorted ? usageSortDirection : 'asc' }
								onClick={ () => onSortingClicked( 'usage' ) }
								data-id="e-id-refraction-element-manager-button-sort-by-usage"
							>
								{ __( 'Usage', 'refraction' ) }
							</TableSortLabel>
						</TableCell>
						<TableCell>
							{ __( 'Plugin', 'refraction' ) }
						</TableCell>
					</TableRow>
				</TableHead>
				<TableBody>
					{ widgets.map( ( widget ) => (
						<TableRow key={ widget.name } data-key-id={ widget.name } hover>
							<TableCell>
								<Box sx={ { display: 'flex', alignItems: 'center' } }>
									<i
										style={ {
											marginInlineEnd: 8,
											marginInlineStart: 0,
											display: 'inline-block',
										} }
										className={ widget.icon }
									></i>
									{ widget.title }
								</Box>
							</TableCell>
							<TableCell>
								<StyledSwitch
									color="secondary"
									checked={ ! widgetsDisabled.includes( widget.name ) }
									onChange={ ( event, checked ) => onToggleWidget( widget.name, checked ) }
									size="small"
									data-id={ `e-id-refraction-element-manager-toggle-${ widget.name }` }
								/>
							</TableCell>
							<TableCell>
								<UsageTimesColumn
									widgetName={ widget.name }
									usageData={ usageWidgets.data }
									isLoading={ usageWidgets.isLoading }
									getWidgetUsage={ getWidgetUsage }
									onScanClick={ onScanUsage }
								/>
							</TableCell>
							<TableCell>{ widget.plugin }</TableCell>
						</TableRow>
					) ) }
				</TableBody>
			</Table>
		</TableContainer>
	);
};

const widgetShape = PropTypes.shape( {
	name: PropTypes.string.isRequired,
	title: PropTypes.string.isRequired,
	icon: PropTypes.string,
	plugin: PropTypes.string,
} );

WidgetsTable.propTypes = {
	widgets: PropTypes.arrayOf( widgetShape ).isRequired,
	widgetsDisabled: PropTypes.arrayOf( PropTypes.string ).isRequired,
	widgetsRoleRestrictions: PropTypes.oneOfType( [ PropTypes.object, PropTypes.array ] ),
	setWidgetsRoleRestrictions: PropTypes.func.isRequired,
	roles: PropTypes.array.isRequired,
	promotionWidgets: PropTypes.arrayOf( widgetShape ).isRequired,
	promotionData: PropTypes.shape( {
		manager_permissions: PropTypes.shape( {
			pro: PropTypes.shape( {
				url: PropTypes.string,
				text: PropTypes.string,
			} ),
			advanced: PropTypes.shape( {
				url: PropTypes.string,
				text: PropTypes.string,
			} ),
		} ),
	} ).isRequired,
	usageWidgets: PropTypes.shape( {
		isLoading: PropTypes.bool,
		data: PropTypes.object,
	} ).isRequired,
	getWidgetUsage: PropTypes.func.isRequired,
	onScanUsage: PropTypes.func.isRequired,
	onToggleWidget: PropTypes.func.isRequired,
	getSortingIndicatorClasses: PropTypes.func.isRequired,
	onSortingClicked: PropTypes.func.isRequired,
};
