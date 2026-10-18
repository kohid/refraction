import { useEffect, useState } from 'react';
import * as React from 'react';
import { trackUpgradePromotionClick, trackViewPromotion } from '@refraction/editor-controls';
import {
	PopoverHeader,
	PopoverMenuList,
	SearchField,
	SectionPopoverBody,
	type VirtualizedItem,
} from '@refraction/editor-ui';
import { PromotionAlert } from '@refraction/editor-ui';
import { ColorFilterIcon, PlusIcon, SettingsIcon } from '@elementor/icons';
import { Divider, IconButton, Tooltip } from '@elementor/ui';
import { __, sprintf } from '@wordpress/i18n';

import { useVariableType } from '../context/variable-type-context';
import { useFilteredVariables } from '../hooks/use-prop-variables';
import { useVariableBoundProp } from '../hooks/use-variable-bound-prop';
import { type ExtendedVirtualizedItem } from '../types';
import { trackVariableEvent, trackVariablesManagerEvent } from '../utils/tracking';
import { EmptyState } from './ui/empty-state';
import { MenuItemContent } from './ui/menu-item-content';
import { NoSearchResults } from './ui/no-search-results';
import { VariablesStyledMenuList } from './ui/styled-menu-list';

const SIZE = 'tiny';
const CREATE_LABEL = __( 'Create variable', 'refraction' );
const MANAGER_LABEL = __( 'Variables Manager', 'refraction' );

const getProUpgradeUrl = ( variableType: string ) =>
	`https://go.elementor.com/renew-license-panel-${ variableType }-variable`;

type Props = {
	closePopover: () => void;
	onAdd?: () => void;
	onEdit?: ( key: string ) => void;
	onSettings?: () => void;
	disabled?: boolean;
};

export const VariablesSelection = ( { closePopover, onAdd, onEdit, onSettings, disabled = false }: Props ) => {
	const { icon: VariableIcon, startIcon, variableType, propTypeUtil, emptyState } = useVariableType();

	const { value: variable, setValue: setVariable, path } = useVariableBoundProp();
	const [ searchValue, setSearchValue ] = useState( '' );

	const {
		list: variables,
		hasMatches: hasSearchResults,
		isSourceNotEmpty: hasVariables,
		hasNoCompatibleVariables,
	} = useFilteredVariables( searchValue, propTypeUtil.key );

	const handleSetVariable = ( key: string ) => {
		setVariable( key );
		trackVariableEvent( {
			varType: variableType,
			controlPath: path.join( '.' ),
			action: 'connect',
		} );
		closePopover();
	};

	const onAddAndTrack = () => {
		onAdd?.();
		trackVariableEvent( {
			varType: variableType,
			controlPath: path.join( '.' ),
			action: 'add',
		} );
	};

	const actions = [];

	if ( onAdd ) {
		actions.push(
			<Tooltip key="add" placement="top" title={ CREATE_LABEL }>
				<span>
					<IconButton
						id="add-variable-button"
						size={ SIZE }
						onClick={ onAddAndTrack }
						aria-label={ CREATE_LABEL }
						disabled={ disabled }
					>
						<PlusIcon fontSize={ SIZE } />
					</IconButton>
				</span>
			</Tooltip>
		);
	}

	if ( onSettings ) {
		const handleOpenManager = () => {
			onSettings();
			trackVariablesManagerEvent( {
				action: 'openManager',
				source: 'vars-popover',
				varType: variableType,
				controlPath: path.join( '.' ),
			} );
		};

		actions.push(
			<Tooltip key="settings" placement="top" title={ MANAGER_LABEL }>
				<IconButton
					id="variables-manager-button"
					size={ SIZE }
					onClick={ handleOpenManager }
					aria-label={ MANAGER_LABEL }
				>
					<SettingsIcon fontSize={ SIZE } />
				</IconButton>
			</Tooltip>
		);
	}

	const StartIcon = startIcon || ( () => <VariableIcon fontSize={ SIZE } /> );

	const items: ExtendedVirtualizedItem[] = variables.map( ( { value, label, key } ) => ( {
		type: 'item' as const,
		value: key,
		label,
		icon: <StartIcon value={ value } />,
		secondaryText: value,
		onEdit: onEdit ? () => onEdit?.( key ) : undefined,
	} ) );

	const handleSearch = ( search: string ) => {
		setSearchValue( search );
	};

	const handleClearSearch = () => {
		setSearchValue( '' );
	};

	useEffect( () => {
		if ( disabled ) {
			trackViewPromotion( {
				target_name: 'variables_popover',
				target_location: 'widget_panel',
				location_l1: 'variables_list',
			} );
		}
	}, [ disabled ] );

	return (
		<SectionPopoverBody>
			<PopoverHeader
				title={ __( 'Variables', 'refraction' ) }
				icon={ <ColorFilterIcon fontSize={ SIZE } /> }
				onClose={ closePopover }
				actions={ actions }
			/>

			{ hasVariables && (
				<SearchField
					value={ searchValue }
					onSearch={ handleSearch }
					placeholder={ __( 'Search', 'refraction' ) }
				/>
			) }

			<Divider />

			{ hasVariables && hasSearchResults && (
				<>
					<PopoverMenuList
						items={ items }
						onSelect={ disabled ? () => {} : handleSetVariable }
						onClose={ () => {} }
						selectedValue={ variable }
						data-testid={ `${ variableType }-variables-list` }
						menuListTemplate={ ( props ) => <VariablesStyledMenuList { ...props } disabled={ disabled } /> }
						menuItemContentTemplate={ ( item: VirtualizedItem< 'item', string > ) => (
							<MenuItemContent item={ item } disabled={ disabled } />
						) }
					/>
					{ disabled && (
						<PromotionAlert
							message={ sprintf(
								/* translators: %s: Variable Type. */
								__( 'Upgrade to continue creating and editing %s variables.', 'refraction' ),
								variableType
							) }
							upgradeUrl={ getProUpgradeUrl( variableType ) }
							onCtaClick={ () =>
								trackUpgradePromotionClick( {
									target_name: 'variables_popover',
									location_l1: 'variables_list',
								} )
							}
						/>
					) }
				</>
			) }

			{ ! hasSearchResults && hasVariables && (
				<NoSearchResults
					searchValue={ searchValue }
					onClear={ handleClearSearch }
					icon={ <VariableIcon fontSize="large" /> }
				/>
			) }

			{ disabled && ! hasVariables && (
				<EmptyState
					title={ sprintf(
						/* translators: %s: Variable Type. */
						__( 'No %s variables yet', 'refraction' ),
						variableType
					) }
					message={ sprintf(
						/* translators: %s: Variable Type. */
						__( 'Upgrade to create %s variables and maintain consistent element sizing.', 'refraction' ),
						variableType
					) }
					icon={ <VariableIcon fontSize="large" /> }
				>
					{ emptyState }
				</EmptyState>
			) }

			{ ! hasVariables && ! hasNoCompatibleVariables && ! disabled && (
				<EmptyState
					title={ sprintf(
						/* translators: %s: Variable Type. */
						__( 'Create your first %s variable', 'refraction' ),
						variableType
					) }
					message={ __(
						'Variables are saved attributes that you can apply anywhere on your site.',
						'refraction'
					) }
					icon={ <VariableIcon fontSize="large" /> }
					onAdd={ onAdd }
				/>
			) }

			{ hasNoCompatibleVariables && ! disabled && (
				<EmptyState
					title={ __( 'No compatible variables', 'refraction' ) }
					message={ __(
						'Looks like none of your variables work with this control. Create a new variable to use it here.',
						'refraction'
					) }
					icon={ <VariableIcon fontSize="large" /> }
					onAdd={ onAdd }
				/>
			) }
		</SectionPopoverBody>
	);
};
