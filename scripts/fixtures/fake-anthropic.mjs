/**
 * A fake Anthropic Messages API for the Ask Claude browser check: records every request and answers like Claude
 * would, without spending credits. Turn 1 looks up controls and images (with a thinking block that must be sent
 * back); turn 2 submits elements for the mode found in the prompt. "REFUSE" in a prompt gets a refusal, "NOCREDIT" the API's low-balance error.
 */
import { createServer } from 'node:http';

export function fakeAnthropic( port ) {
	const requests = [];
	let n = 0;
	const message = ( content, stop = 'tool_use' ) => ( {
		id: `msg_${ ++n }`, type: 'message', role: 'assistant', model: 'claude-opus-5-5', content, stop_reason: stop, stop_sequence: null,
		usage: { input_tokens: 1200, output_tokens: 300, cache_creation_input_tokens: 0, cache_read_input_tokens: n > 1 ? 1000 : 0 },
	} );
	const textOf = ( body ) => JSON.stringify( body.messages[ 0 ].content );

	const page = ( image ) => [
		{ elType: 'container', settings: { flex_direction: 'column', padding: { unit: 'px', top: 96, right: 24, bottom: 96, left: 24 }, background_background: 'classic', background_color: '#1d2a24', background_image: image ? { id: image } : undefined }, elements: [
			{ elType: 'widget', widgetType: 'heading', settings: { title: 'Houses that age well', header_size: 'h1', title_color: '#f4efe6', __globals__: { title_color: 'globals/colors?id=primary' } }, elements: [] },
			{ elType: 'widget', widgetType: 'text-editor', settings: { editor: '<p>Timber, stone and glass, built by one team from groundwork to keys.</p><script>steal()</script>' }, elements: [] },
			{ elType: 'widget', widgetType: 'button', settings: { text: 'Plan your home', link: { url: '#contact' } }, elements: [] },
			{ elType: 'widget', widgetType: 'html', settings: { html: '<script>bad()</script>' }, elements: [] },
		] },
		{ elType: 'container', settings: {}, elements: [ { elType: 'widget', widgetType: 'heading', settings: { title: 'How we build', header_size: 'h2' }, elements: [] } ] },
	];

	const server = createServer( ( req, res ) => {
		let raw = '';
		req.on( 'data', ( c ) => ( raw += c ) );
		req.on( 'end', () => {
			const body = JSON.parse( raw || '{}' );
			requests.push( { url: req.url, headers: req.headers, body } );
			const reply = ( obj ) => {
				res.writeHead( 200, { 'content-type': 'application/json', 'request-id': `req_${ n }` } );
				res.end( JSON.stringify( obj ) );
			};
			const prompt = textOf( body );

			if ( prompt.includes( 'NOCREDIT' ) ) {
				res.writeHead( 400, { 'content-type': 'application/json', 'request-id': 'req_nocredit' } );
				res.end( JSON.stringify( { type: 'error', error: { type: 'invalid_request_error', message: 'Your credit balance is too low to access the Anthropic API. Please go to Plans & Billing to upgrade or purchase credits.' } } ) );
				return;
			}

			if ( prompt.includes( 'REFUSE' ) ) {
				reply( { ...message( [], 'refusal' ), stop_details: { type: 'refusal', category: null, explanation: 'test' } } );
				return;
			}

			const last = body.messages[ body.messages.length - 1 ];
			const firstTurn = 1 === body.messages.length;

			if ( firstTurn ) {
				reply( message( [
					{ type: 'thinking', thinking: '', signature: 'sig-turn-1' },
					{ type: 'tool_use', id: 'toolu_1', name: 'get_widget_controls', input: { widgets: [ 'container', 'heading', 'text-editor', 'button' ] } },
					{ type: 'tool_use', id: 'toolu_2', name: 'list_images', input: {} },
				] ) );
				return;
			}

			const results = Array.isArray( last.content ) ? last.content : [];
			const images = JSON.parse( ( results.find( ( r ) => 'toolu_2' === r.tool_use_id ) || { content: '[]' } ).content );
			const image = images[ 0 ] ? images[ 0 ].id : null;
			let elements = page( image );

			if ( prompt.includes( 'one new section' ) ) {
				elements = [ { elType: 'container', settings: { flex_direction: 'row' }, elements: [ { elType: 'widget', widgetType: 'heading', settings: { title: 'Three ways to start', header_size: 'h2' }, elements: [] } ] } ];
			} else if ( prompt.includes( 'Change the selected element' ) ) {
				elements = [ { elType: 'widget', widgetType: 'heading', settings: { title: 'Homes that age well', header_size: 'h1' }, elements: [] } ];
			}

			reply( message( [ { type: 'text', text: 'Here it is.' }, { type: 'tool_use', id: 'toolu_3', name: 'submit_elements', input: { elements, summary: 'A hero for a home builder. Replace [Phone number].' } } ] ) );
		} );
	} );

	return new Promise( ( resolve ) => server.listen( port, '127.0.0.1', () => resolve( { server, requests } ) ) );
}
