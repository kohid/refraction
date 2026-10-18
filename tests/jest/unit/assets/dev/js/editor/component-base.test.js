jest.mock( 'refraction/assets/dev/js/modules/imports/module.js', () => {
	return class Module {};
} );

jest.mock( 'refraction-panel/pages/editor', () => {
	return class Module {};
} );

jest.mock( 'refraction-controls/base-data', () => {
	return class Module {};
} );

import ComponentBase from 'refraction-editor/component-base';

describe( 'ComponentBase', () => {
	window.document.body.innerHTML = `
		<div class="refraction-control refraction-control-system_colors">
			<div class="refraction-repeater-row-controls">
				<div class="refraction refraction-control refraction-control-_id">
					<div class="refraction-control-content">
						<input type="hidden" data-setting="_id" value="primary">
					</div>
				</div>
				<div class="refraction refraction-control refraction-control-_id">
					<div class="refraction-control-content">
						<input type="hidden" data-setting="_id" value="secondary">
					</div>
				</div>
				<div class="pickr">
					<button class="pcr-button"></button>
				</div>
			</div>
		</div>
	`;
	const mockCallBack = jest.fn();
	document.querySelector( 'div.pickr button.pcr-button' ).addEventListener( 'click', mockCallBack );

	beforeAll( async () => {
		global.refraction = {
			getPanelView: () => ( {
				getCurrentPageView: () => ( {
					content: {
						currentView: {
							getControlViewByName: ( name ) => {
								if ( ! document.querySelector( `div.refraction-control-${ name }` ) ) {
									throw new TypeError( 'Document does not have control' );
								}

								return {
									getChildControlView: () => ( {
										getChildControlView: () => ( {
											activate: () => {
												document.querySelector( 'div.pickr button.pcr-button' ).click();
											},
										} ),
									} ),
								};
							},
						},
					},
				} ),
			} ),
		};
	} );

	afterAll( () => {
		delete global.refraction;

		jest.resetAllMocks();
	} );

	test( 'activateControl - should call mock onclick (activate) for picker button when controlPath is correct and throw error if not', () => {
		const component = new ComponentBase();
		let controlPath = 'custom_colors/primary/color';

		// Act & Assert document does not have custom colors.
		expect( () => component.activateControl( controlPath ) ).toThrow( TypeError );

		// Act.
		controlPath = 'system_colors/primary/color'; // Document has system colors.
		component.activateControl( controlPath );

		// Assert.
		expect( mockCallBack ).toHaveBeenCalledTimes( 1 );

		// Act.
		controlPath = 'system_colors/secondary/color'; // Document has system colors.
		component.activateControl( controlPath );

		// Assert.
		expect( mockCallBack ).toHaveBeenCalledTimes( 2 );
	} );
} );
