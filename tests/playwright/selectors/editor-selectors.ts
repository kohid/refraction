const V4_DIV_BLOCK = 'e-div-block';
const V4_FLEXBOX = 'e-flexbox';
const V4_TABS = 'e-tabs';
const V4_HEADING = 'e-heading';
const V4_PARAGRAPH = 'e-paragraph';
const V4_IMAGE = 'e-image';
const V4_SVG = 'e-svg';
const V4_BUTTON = 'e-button';
const V4_DIVIDER = 'e-divider';
const V4_YOUTUBE = 'e-youtube';

const V4_ATOM_SLUGS = {
	divBlock: V4_DIV_BLOCK,
	flexbox: V4_FLEXBOX,
	tabs: V4_TABS,
	heading: V4_HEADING,
	paragraph: V4_PARAGRAPH,
	image: V4_IMAGE,
	svg: V4_SVG,
	button: V4_BUTTON,
	divider: V4_DIVIDER,
	youtube: V4_YOUTUBE,
} as const;

const V4_ATOM_SELECTORS = {
	divBlock: getElementSelectorBySlug( V4_DIV_BLOCK ),
	flexbox: getElementSelectorBySlug( V4_FLEXBOX ),
	tabs: getElementSelectorBySlug( V4_TABS ),
	heading: getElementSelectorBySlug( V4_HEADING ),
	paragraph: getElementSelectorBySlug( V4_PARAGRAPH ),
	image: getElementSelectorBySlug( V4_IMAGE ),
	svg: getElementSelectorBySlug( V4_SVG ),
	button: getElementSelectorBySlug( V4_BUTTON ),
	divider: getElementSelectorBySlug( V4_DIVIDER ),
};

const EditorSelectors = {
	getWidgetByName: ( title: string ) => `[data-widget_type="${ title }.default"]`,
	canvas: '#refraction-preview-iframe',
	widget: '[data-element_type="widget"]',
	container: '[data-element_type="container"]',
	item: '.refraction-repeater-row-item-title',
	plusIcon: '.rficon-plus-circle',
	siteTitle: '.site-title >> nth=0',
	pageTitle: '.entry-title >> nth=0',
	pageContent: '.page-content',
	pageHeader: '.page-header',
	toast: '#refraction-toast',
	addNewSection: '#refraction-add-new-section',
	addSectionInner: '.refraction-add-section-inner',
	removeContainer: '.refraction-editor-element-setting.refraction-editor-element-remove',
	v4: {
		atoms: V4_ATOM_SLUGS,
		atomSelectors: V4_ATOM_SELECTORS,
	},
	panels: {
		topBar: {
			wrapper: '#refraction-editor-wrapper-v2',
		},
		elements: {
			wrapper: '#refraction-panel-page-elements',
			v4elements: '#refraction-panel-category-v4-elements',
			footerButton: '#refraction-panel-header-add-button i',
			refractionPanel: '#refraction-panel',
		},
		pageSettings: {
			wrapper: '#refraction-panel-page-settings',
			footerButton: '#refraction-editor-wrapper-v2 button[aria-label="Page Settings"]',
		},
		siteSettings: {
			wrapper: '#refraction-panel-page-menu',
			saveButton: '//button[text()="Save Changes"]',
			layout: {
				breakpoints: {
					removeBreakpointButton: '#refraction-kit-panel-content .select2-selection__choice__remove',
				},
			},
		},
		userPreferences: {
			wrapper: '#refraction-panel-editorPreferences-settings-controls',
		},
		navigator: {
			wrapper: '#refraction-navigator',
			footer: '#refraction-navigator__footer',
			closeButton: '#refraction-navigator__close',
			footerButton: '#refraction-editor-wrapper-v2 button[value="Structure"]',
			getElement: ( elementId: string ) => `#refraction-navigator .refraction-navigator__element[data-id="${ elementId }"]`,
			getElementItem: ( elementId: string ) => `${ EditorSelectors.panels.navigator.getElement( elementId ) } .refraction-navigator__item`,
		},
		promotionCard: '[data-testid="e-promotion-card"]',
		popoverCard: '[data-testid="e-popover-card"]',
	},
	refreshPopup: {
		reloadButton: '#refraction-save-kit-refresh-page .dialog-button.dialog-ok.dialog-alert-ok',
	},

	media: {
		preview: '.refraction-control-media__preview',
		imageByTitle: ( imageTitle: string ) => `[aria-label="${ imageTitle }"]`,
		selectBtn: '.button.media-button',
		imageInp: 'input[type="file"]',
		addGalleryButton: 'button.media-button-gallery',
		images: '.attachments-wrapper li',
		imgCaption: '#attachment-details-caption',
		imgDescription: '#attachment-details-description',
	},
	button: {
		getByName: ( name: string ) => `.refraction-button:has-text("${ name }")`,
		id: '[data-setting="button_css_id"]',
		url: 'input[data-setting="url"]',
		linkOptions: 'button[data-tooltip="Link Options"]',
		targetBlankChbox: 'input[data-setting="is_external"]',
		noFollowChbox: 'input[data-setting="nofollow"]',
		customAttributesInp: 'input[data-setting="custom_attributes"]',
	},
	heading: {
		h2: 'h2.refraction-heading-title',
		get link() {
			return `${ this.h2 } a`;
		},
	},
	image: {
		widget: '[data-widget_type="image.default"]',
		linkSelect: 'link_to',
		imageSizeSelect: 'image_size',
		widthInp: 'input[data-setting="width"]',
		heightInp: 'input[data-setting="height"]',
		get image() {
			return `${ this.widget } img`;
		},
		get link() {
			return `${ this.widget } a`;
		},
		lightBox: '.swiper-zoom-container',
	},
	icon: {
		widget: '[data-widget_type="icon.default"]',
		get link() {
			return `${ this.widget } a`;
		},
	},
	imageBox: {
		widget: '[data-widget_type="image-box.default"]',
		imageSizeSelect: 'thumbnail_size',
		get link() {
			return `${ this.widget } a`;
		},
		get image() {
			return `${ this.widget } img`;
		},
	},
	galleryControl: {
		addGalleryBtn: 'button.refraction-control-gallery-add',
	},
	imageCarousel: {
		widget: '[data-widget_type="image-carousel.default"]',
		get link() {
			return `${ this.widget } a`;
		},
		navigationSelect: '.refraction-control-navigation select',
		autoplaySelect: 'input[data-setting="autoplay"]',
		autoplaySpeedLabel: 'Autoplay Speed',
		autoplaySpeedInp: '[data-setting="autoplay_speed"]',
		autoplayToggle: '.refraction-switch-handle',
		captionSelect: 'select[data-setting="caption_type"]',
		imgCaption: 'figcaption.refraction-image-carousel-caption',
		prevSliderBtn: '.refraction-swiper-button-prev',
		nextSliderBtn: '.refraction-swiper-button-next',
		activeSlide: ( id: string ) => `.swiper-pagination-bullet-active[aria-label="Go to slide ${ id }"]`,
		activeSlideImg: ( name: string ) => `.swiper-slide-active img[alt="${ name }"]`,
	},
	textPath: {
		widget: '[data-widget_type="text-path.default"]',
		get link() {
			return `${ this.widget } a`;
		},
		get svgIcon() {
			return `${ this.widget } svg path.st0`;
		},
	},
	video: {
		widget: '[data-widget_type="video.default"]',
		get image() {
			return `${ this.widget } .refraction-custom-embed-image-overlay`;
		},
		lightBoxControlInp: '[data-setting="lightbox"]',
		lightBoxSetting: 'div[data-refraction-open-lightbox="yes"]',
		lightBoxDialog: '.refraction-lightbox',
		iframe: 'iframe[class*="refraction-video"]',
		playIcon: '[aria-label="Play"]',
		videoWrapper: '.refraction-video-wrapper',
	},
	socialIcons: {
		widget: '[data-widget_type="social-icons.default"]',
		get link() {
			return `${ this.widget } a`;
		},
		get svgIcon() {
			return `${ this.widget } svg path.st0`;
		},
	},
	tabs: {
		textEditorIframe: 'iframe[id*="refractionwpeditorview"]',
		body: '#tinymce',
	},
	googleMaps: {
		iframe: 'iframe[src*="https://maps.google.com/maps"]',
		showSatelliteViewBtn: 'button[title="Show satellite imagery"]',
	},
	soundCloud: {
		iframe: 'iframe[src*="https://w.soundcloud.com/"]',
		waveForm: 'div.waveform.loaded',
	},
	ai: {
		aiButton: '.e-ai-button',
		aiDialogCloseButton: '.MuiDialog-container button[aria-label="close"]',
		promptInput: 'input[name="prompt"]',
		resultTextarea: 'textarea.MuiInputBase-inputMultiline',
		image: {
			promptTextarea: '[data-testid="e-image-prompt"] textarea',
			typeInput: '#image-type + input',
			styleInput: '#style + input',
			aspectRationInput: '#aspect-ratio + input',
			generatedImage: '[data-testid="e-gallery-image"] img',
		},
		promptHistory: {
			button: 'button[aria-label="Show prompt history"]',
			modal: '#prompt-history-modal',
			closeButton: 'button[aria-label="Hide prompt history"]',
			upgradeMessageFullTestId: 'e-ph-upgrade-full',
			upgradeMessageSmallTestId: 'e-ph-upgrade-small',
			noDataMessageTestId: 'e-ph-empty',
			periodTestId: 'e-ph-p',
			itemTestId: 'e-ph-i',
			fallbackIconTestId: 'e-ph-fi',
			removeButton: 'button[aria-label="Remove item"]',
			reuseButton: 'button[aria-label="Reuse prompt"]',
			restoreButton: 'button[aria-label="Restore"]',
			editButton: 'button[aria-label="Edit result"]',
		},
	},
	floatingElements: {
		floatingButtons: {
			controls: {
				advanced: {
					sections: [
						'.refraction-control-advanced_layout_section',
						'.refraction-control-advanced_responsive_section',
						'.refraction-control-advanced_custom_controls_section',
						'.refraction-control-section_custom_css_pro',
						'.refraction-control-section_custom_attributes_pro',
					],
				},
			},
		},
		v4: {
			floatingActionsBar: '#floating-action-bar',
		},
	},
	contextMenu: {
		menu: '.refraction-context-menu',
		saveAsGlobal: '.refraction-context-menu-list__item.refraction-context-menu-list__item-save.refraction-context-menu-list__item--disabled',
		notes: '.refraction-context-menu-list__item.refraction-context-menu-list__item-open_notes.refraction-context-menu-list__item--disabled',
	},
	components: {
		createComponentForm: '[data-testid="create-component-form"]',
		overridablePropForm: '[data-testid="overridable-prop-form"]',
		nameInput: '#component-name',
		componentsTab: '[data-tab="components"]',
		componentsList: '#refraction-panel-elements-wrapper',
		instanceWidget: '[data-widget_type="e-component.default"]',
		editModeHeader: '[data-testid="component-panel-header"]',
		exitEditModeButton: '[data-testid="component-panel-header"] [aria-label="Back"]',
		overridableIndicator: '[aria-label="Make prop overridable"]',
		overridableIndicatorActive: '[aria-label="Overridable property"]',
		instanceEditingPanel: '[data-testid="instance-editing-panel"]',
	},
	dialog: {
		lightBox: '.refraction-lightbox',
	},
	variables: {
		manager: {
			managerButton: '#variables-manager-button',
			addButton: '#add-variable-button',
			createButton: '#create-variable-button',
			valueInputWrapper: '#variable-value-wrapper',
			valueInput: 'input[data-setting="value"]',
		},
	},
};

function getElementSelectorBySlug( slug: string ) {
	return {
		wrapper: `[data-widget_type="${ slug }.default"]`,
		base: `.${ slug }-base`,
	};
}

export default EditorSelectors;
