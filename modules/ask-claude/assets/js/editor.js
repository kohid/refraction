import * as React from 'react';
import * as ReactDOM from 'react-dom';
import * as EditorAppBar from '@refraction/editor-app-bar';
import { __ } from '@wordpress/i18n';
import { PencilSparklesIcon } from '@elementor/icons';
import { Panel } from './panel';

/**
 * Ask Claude in the editor: a top-bar action that opens the panel, and "Ask Claude" in an element's right-click menu,
 * which opens it on "Change selected".
 */
let root = null;
let state = { open: false, mode: null };

function render() {
	if ( ! root ) {
		const host = document.createElement( 'div' );
		host.id = 'refraction-ask-claude';
		document.body.appendChild( host );
		root = ReactDOM.createRoot( host );
	}

	root.render( <Panel open={ state.open } initialMode={ state.mode } onClose={ () => {
		state = { open: false, mode: null };
		render();
	} } /> );
}

export function open( mode = null ) {
	state = { open: true, mode };
	render();
}

function toggle() {
	state = { open: ! state.open, mode: null };
	render();
}

EditorAppBar.toolsMenu.registerAction( {
	id: 'ask-claude',
	priority: 1,
	useProps: () => ( {
		title: __( 'Ask Claude', 'refraction' ),
		icon: PencilSparklesIcon,
		onClick: toggle,
	} ),
} );

const addMenuItem = ( groups, view ) => [
	...groups,
	{
		name: 'ask-claude',
		actions: [
			{
				name: 'ask-claude',
				title: __( 'Ask Claude to change this', 'refraction' ),
				icon: 'rficon-ai',
				callback: () => {
					window.$e.run( 'document/elements/select', { container: view.getContainer() } );
					open( 'selected' );
				},
			},
		],
	},
];

window.addEventListener( 'refraction/init', () => {
	[ 'widget', 'container' ].forEach( ( type ) => window.refraction.hooks.addFilter( `elements/${ type }/contextMenuGroups`, addMenuItem ) );
} );

window.refractionAskClaudeOpen = open;
