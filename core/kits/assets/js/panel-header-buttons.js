const arrowIconClass = 'rficon-chevron-' + ( refractionCommon.config.isRTL ? 'right' : 'left' );

const buttonBack = `
<button id="refraction-panel-header-kit-back" class="refraction-header-button" aria-label="{{ Back }}">
	<i class="refraction-icon ${ arrowIconClass } tooltip-target" aria-hidden="true" data-tooltip="{{ Back }}"></i>
</button>
`;

const buttonClose = `
<button id="refraction-panel-header-kit-close" class="refraction-header-button" aria-label="{{ Close }}">
	<i class="refraction-icon rficon-close tooltip-target" aria-hidden="true" data-tooltip="{{ Close }}"></i>
</button>
`;

export { buttonBack, buttonClose };
