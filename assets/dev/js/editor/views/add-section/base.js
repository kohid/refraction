import ContainerHelper from 'refraction-editor-utils/container-helper';
import environment from 'refraction-common/utils/environment';
import { EditorOneEventManager } from 'refraction-editor-utils/editor-one-events';

/**
 * @typedef {import('../../container/container')} Container
 */
class AddSectionBase extends Marionette.ItemView {
	static IS_CONTAINER_ACTIVE = ! ! refractionCommon.config.experimentalFeatures.container;

	// Views.
	static VIEW_CHOOSE_ACTION = 'choose-action';
	static VIEW_CONTAINER_FLEX_PRESET = 'select-container-preset';
	static VIEW_CONTAINER_GRID_PRESET = 'select-container-preset-grid';

	static getSelectType() {
		return AddSectionBase.IS_CONTAINER_ACTIVE
			? AddSectionBase.getSelectTypePreset()
			: 'select-preset';
	}

	static getSelectTypePreset() {
		return AddSectionBase.IS_CONTAINER_ACTIVE
			? 'select-type'
			: 'select-container-preset';
	}

	template() {
		return Marionette.TemplateCache.get( '#tmpl-refraction-add-section' );
	}

	attributes() {
		return {
			'aria-label': __( 'Add new layout element', 'refraction' ),
			'data-view': AddSectionBase.VIEW_CHOOSE_ACTION,
		};
	}

	ui() {
		return {
			addNewSection: '.refraction-add-new-section',
			closeButton: '.refraction-add-section-close',
			backButton: '.refraction-add-section-back',
			addSectionButton: '.refraction-add-section-button',
			addTemplateButton: '.refraction-add-template-button',
			selectPreset: '.refraction-select-preset',
			presets: '.refraction-preset',
			flexPresetButton: '.flex-preset-button',
			gridPresetButton: '.grid-preset-button',
			chooseFlexPreset: '.e-con-select-preset-flex .e-con-preset',
			chooseGridPreset: '.e-con-select-preset-grid .e-con-preset',
		};
	}

	events() {
		return {
			'click @ui.addSectionButton': 'onAddSectionButtonClick',
			'click @ui.addTemplateButton': 'onAddTemplateButtonClick',
			'click @ui.closeButton': 'onCloseButtonClick',
			'click @ui.backButton': () => this.setView( AddSectionBase.getSelectType() ),
			'click @ui.presets': 'onPresetSelected',
			'click @ui.flexPresetButton': () => this.setView( AddSectionBase.VIEW_CONTAINER_FLEX_PRESET ),
			'click @ui.gridPresetButton': () => this.setView( AddSectionBase.VIEW_CONTAINER_GRID_PRESET ),
			'click @ui.chooseFlexPreset': 'onFlexPresetSelected',
			'click @ui.chooseGridPreset': 'onGridPresetSelected',
		};
	}

	behaviors() {
		const behaviors = {
			contextMenu: {
				behaviorClass: require( 'refraction-behaviors/context-menu' ),
				groups: this.getContextMenuGroups(),
				eventTargets: [ '.refraction-add-section-inner' ],
			},
		};

		return refraction.hooks.applyFilters( 'views/add-section/behaviors', behaviors, this );
	}

	tagName() {
		return 'section';
	}

	className() {
		return 'refraction-add-section refraction-visible-desktop';
	}

	setView( view ) {
		this.$el.attr( 'data-view', view );
	}

	showSelectPresets() {
		this.setView( AddSectionBase.getSelectType() );
	}

	closeSelectPresets() {
		this.setView( AddSectionBase.VIEW_CHOOSE_ACTION );
	}

	getTemplatesModalOptions() {
		return {
			importOptions: {
				at: this.getOption( 'at' ),
			},
		};
	}

	getContextMenuGroups() {
		var hasContent = function() {
			return refraction.elements.length > 0;
		};

		const controlSign = environment.mac ? '&#8984;' : '^';

		return [
			{
				name: 'paste',
				actions: [
					{
						name: 'paste',
						title: __( 'Paste', 'refraction' ),
						shortcut: controlSign + '+V',
						isEnabled: () => $e.components.get( 'document/elements' ).utils.isPasteEnabled( refraction.getPreviewContainer() ),
						callback: () => $e.run( 'document/ui/paste', {
							container: refraction.getPreviewContainer(),
							options: {
								at: this.getOption( 'at' ),
								rebuild: true,
							},
							onAfter: () => this.onAfterPaste(),
						} ),
					}, {
						name: 'paste_area',
						icon: 'eicon-import-export',
						title: __( 'Paste from other site', 'refraction' ),
						callback: () => $e.run( 'document/elements/paste-area', {
							container: refraction.getPreviewContainer(),
							options: {
								at: this.getOption( 'at' ),
								rebuild: true,
							},
						} ),
					},
				],
			}, {
				name: 'content',
				actions: [
					{
						name: 'copy_all_content',
						title: __( 'Copy All Content', 'refraction' ),
						isEnabled: hasContent,
						callback: () => $e.run( 'document/elements/copy-all' ),
					}, {
						name: 'delete_all_content',
						title: __( 'Delete All Content', 'refraction' ),
						isEnabled: hasContent,
						callback: () => $e.run( 'document/elements/empty' ),
					},
				],
			},
		];
	}

	onAddSectionButtonClick() {
		this.showSelectPresets();
	}

	onAddTemplateButtonClick() {
		EditorOneEventManager.sendCanvasEmptyBoxAction( {
			targetName: 'e_library',
		} );
		$e.run( 'library/open', this.getTemplatesModalOptions() );
	}

	onRender() {
		this.$el.html5Droppable( {
			axis: [ 'vertical' ],
			groups: [ 'refraction-element' ],
			placeholder: false,
			currentElementClass: 'refraction-html5dnd-current-element',
			hasDraggingOnChildClass: 'refraction-dragging-on-child',
			// Merge different options if provided by child elements
			...this.getDroppableOptions(),
		} );
	}

	getDroppableOptions() {
		return {
			isDroppingAllowed: () => {
				return ! refraction.channels.editor.request( 'element:dragged' )?.el?.dataset?.id;
			},
			onDropping: ( side, event ) => {
				refraction.getPreviewView().onDrop(
					event,
					{ side, at: this.getOption( 'at' ) },
				);
			},
		};
	}

	onGridPresetSelected( event ) {
		this.closeSelectPresets();

		const selectedStructure = event.currentTarget.dataset.structure,
			isAddedAboveAnotherContainer = !! this.options.at || 0 === this.options.at;

		EditorOneEventManager.sendCanvasEmptyBoxAction( {
			targetName: 'add_container',
			metadata: {
				container_type: 'grid',
				structure_type: selectedStructure,
			},
			containerCreated: true,
		} );

		const newContainer = ContainerHelper.createContainerFromGridPreset(
			selectedStructure,
			refraction.getPreviewContainer(),
			this.options,
		);

		if ( isAddedAboveAnotherContainer ) {
			this.destroy();
		}

		return newContainer;
	}

	onPresetSelected( event ) {
		this.closeSelectPresets();

		const selectedStructure = event.currentTarget.dataset.structure,
			parsedStructure = refraction.presetsFactory.getParsedStructure( selectedStructure );

		$e.run( 'document/elements/create', {
			model: {
				elType: 'section',
			},
			container: refraction.getPreviewContainer(),
			columns: parsedStructure.columnsCount,
			structure: selectedStructure,
			options: Object.assign( {}, this.options ),
		} );
	}

	/**
	 * Create a Container preset when the user chooses a preset.
	 *
	 * @param {MouseEvent} e - Click event.
	 *
	 * @return {Container} container
	 */
	onFlexPresetSelected( e ) {
		this.closeSelectPresets();

		const preset = e.currentTarget.dataset.preset;

		EditorOneEventManager.sendCanvasEmptyBoxAction( {
			targetName: 'add_container',
			metadata: {
				container_type: 'flexbox',
				structure_type: preset,
			},
			containerCreated: true,
		} );

		return ContainerHelper.createContainerFromPreset(
			preset,
			refraction.getPreviewContainer(),
			this.options,
		);
	}

	onDropping() {
		refraction.getPreviewView().addElementFromPanel();
	}

	onAfterPaste() {}
}

export default AddSectionBase;
