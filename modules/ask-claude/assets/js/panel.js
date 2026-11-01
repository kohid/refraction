import * as React from 'react';
import PropTypes from 'prop-types';
import { __ } from '@wordpress/i18n';
import apiFetch from '@wordpress/api-fetch';
import {
	Alert,
	Box,
	Button,
	Checkbox,
	Chip,
	Divider,
	Drawer,
	FormControlLabel,
	IconButton,
	LinearProgress,
	MenuItem,
	Select,
	Stack,
	TextField,
	ToggleButton,
	ToggleButtonGroup,
	Typography,
} from '@elementor/ui';
import { PhotoIcon, SettingsIcon, XIcon } from '@elementor/icons';
import { context, insert, pageIsEmpty, selected } from './insert';

const cfg = () => window.refractionAskClaude || {};

// The model menus open outside the panel: they get the panel's themed look through this class.
const MENU = { PaperProps: { className: 'rf-ac-menu' } };

const MODES = {
	page: __( 'Whole page', 'refraction' ),
	section: __( 'Add a section', 'refraction' ),
	selected: __( 'Change selected', 'refraction' ),
};

/**
 * The administrator's key and default model; shown when there is no key yet, or from the settings button.
 *
 * @param {Object}   props
 * @param {Object}   props.state    hasKey, masked and model.
 * @param {Function} props.setState Updates them after a save.
 * @param {Function} props.onDone   Closes the settings.
 */
function KeySettings( { state, setState, onDone } ) {
	const [ key, setKey ] = React.useState( '' );
	const [ error, setError ] = React.useState( '' );
	const [ busy, setBusy ] = React.useState( false );

	const save = async ( data ) => {
		setBusy( true );
		setError( '' );

		try {
			const result = await apiFetch( { path: `/${ cfg().route }/settings`, method: 'POST', data } );
			setState( { ...state, ...result } );
			setKey( '' );
			onDone();
		} catch ( e ) {
			setError( e.message );
		} finally {
			setBusy( false );
		}
	};

	const remove = async () => {
		const result = await apiFetch( { path: `/${ cfg().route }/settings`, method: 'DELETE' } );
		setState( { ...state, ...result } );
	};

	return (
		<Stack gap={ 1.5 } data-ask-claude="settings">
			<Typography variant="subtitle2">{ __( 'Anthropic API key', 'refraction' ) }</Typography>
			<Typography variant="body2" className="rf-ac-muted">
				{ __( 'Requests are paid with this key. It is stored encrypted on your site and never sent to the browser. Your site calls Claude only when someone presses Generate.', 'refraction' ) }
			</Typography>
			{ state.hasKey && <Typography variant="body2">{ __( 'Current key:', 'refraction' ) } <code>{ state.masked }</code></Typography> }
			<TextField size="small" type="password" autoComplete="off" label={ state.hasKey ? __( 'Replace the key', 'refraction' ) : __( 'Paste the key (sk-ant-…)', 'refraction' ) } value={ key } onChange={ ( e ) => setKey( e.target.value ) } inputProps={ { 'data-ask-claude': 'key' } } />
			<Select size="small" value={ state.model } onChange={ ( e ) => save( { model: e.target.value } ) } inputProps={ { 'aria-label': __( 'Default model', 'refraction' ) } } MenuProps={ MENU }>
				{ Object.entries( cfg().models || {} ).map( ( [ id, label ] ) => <MenuItem key={ id } value={ id }>{ label }</MenuItem> ) }
			</Select>
			{ error && <Alert severity="error">{ error }</Alert> }
			<Stack direction="row" gap={ 1 }>
				<Button variant="contained" size="small" disabled={ busy || ! key } onClick={ () => save( { key } ) } data-ask-claude="save-key">{ __( 'Save key', 'refraction' ) }</Button>
				{ state.hasKey && <Button size="small" color="error" onClick={ remove }>{ __( 'Remove key', 'refraction' ) }</Button> }
			</Stack>
		</Stack>
	);
}

KeySettings.propTypes = {
	state: PropTypes.shape( { hasKey: PropTypes.bool, masked: PropTypes.string, model: PropTypes.string } ).isRequired,
	setState: PropTypes.func.isRequired,
	onDone: PropTypes.func.isRequired,
};

/**
 * The Ask Claude panel.
 *
 * @param {Object}   props
 * @param {boolean}  props.open        Whether it is shown.
 * @param {Function} props.onClose     Closes it.
 * @param {string}   props.initialMode The mode to open on (page, section or selected), or null.
 */
export function Panel( { open, onClose, initialMode } ) {
	const [ state, setState ] = React.useState( { hasKey: cfg().hasKey, masked: cfg().masked, model: cfg().model } );
	const [ mode, setMode ] = React.useState( initialMode || 'page' );
	const [ prompt, setPrompt ] = React.useState( '' );
	const [ model, setModel ] = React.useState( cfg().model );
	const [ useStyles, setUseStyles ] = React.useState( true );
	const [ images, setImages ] = React.useState( [] );
	const [ busy, setBusy ] = React.useState( false );
	const [ seconds, setSeconds ] = React.useState( 0 );
	const [ error, setError ] = React.useState( '' );
	const [ result, setResult ] = React.useState( null );
	const [ settings, setSettings ] = React.useState( false );
	const [ confirmReplace, setConfirmReplace ] = React.useState( false );
	const max = Number( cfg().maxPrompt ) || 60000;

	React.useEffect( () => {
		if ( initialMode ) {
			setMode( initialMode );
		}
	}, [ initialMode, open ] );

	React.useEffect( () => {
		if ( ! busy ) {
			return undefined;
		}

		const started = Date.now();
		const timer = setInterval( () => setSeconds( Math.round( ( Date.now() - started ) / 1000 ) ), 1000 );

		return () => clearInterval( timer );
	}, [ busy ] );

	const pickImages = () => {
		const frame = window.wp.media( { title: __( 'Reference images for Claude', 'refraction' ), multiple: true, library: { type: 'image' }, button: { text: __( 'Use these images', 'refraction' ) } } );
		frame.on( 'select', () => {
			const picked = frame.state().get( 'selection' ).toJSON().slice( 0, 4 ).map( ( a ) => ( { id: a.id, url: ( a.sizes && a.sizes.thumbnail ? a.sizes.thumbnail.url : a.url ), title: a.title } ) );
			setImages( picked );
		} );
		frame.open();
	};

	const run = async () => {
		if ( 'selected' === mode && ! selected() ) {
			setError( __( 'Select an element in the page first.', 'refraction' ) );
			return;
		}

		if ( 'page' === mode && ! pageIsEmpty() && ! confirmReplace ) {
			setConfirmReplace( true );
			return;
		}

		setConfirmReplace( false );
		setBusy( true );
		setSeconds( 0 );
		setError( '' );
		setResult( null );

		try {
			const data = await apiFetch( {
				path: `/${ cfg().route }/generate`,
				method: 'POST',
				data: {
					post_id: window.refraction.config.document.id,
					prompt,
					mode,
					model,
					use_styles: useStyles,
					images: images.map( ( i ) => i.id ),
					context: context( mode ),
				},
			} );
			insert( mode, data.elements );
			setResult( data );
		} catch ( e ) {
			setError( e.message || __( 'Something went wrong. Try again.', 'refraction' ) );
		} finally {
			setBusy( false );
		}
	};

	const body = () => {
		if ( ! cfg().phpOk ) {
			return <Alert severity="info">{ __( 'Ask Claude needs PHP 8.1 or newer on your server (with the sodium extension). Ask your host to update PHP; the rest of Refraction works as before.', 'refraction' ) }</Alert>;
		}

		if ( settings || ! state.hasKey ) {
			return cfg().canManage
				? <KeySettings state={ state } setState={ setState } onDone={ () => setSettings( false ) } />
				: <Alert severity="info">{ __( 'An administrator needs to add an Anthropic API key before Ask Claude can be used.', 'refraction' ) }</Alert>;
		}

		return (
			<Stack gap={ 2 }>
				<ToggleButtonGroup size="small" exclusive fullWidth value={ mode } onChange={ ( e, value ) => value && setMode( value ) } aria-label={ __( 'What to build', 'refraction' ) }>
					{ Object.entries( MODES ).map( ( [ id, label ] ) => <ToggleButton key={ id } value={ id } data-ask-claude={ `mode-${ id }` }>{ label }</ToggleButton> ) }
				</ToggleButtonGroup>
				<TextField
					multiline
					minRows={ 8 }
					maxRows={ 24 }
					helperText={ `${ prompt.length.toLocaleString() } / ${ max.toLocaleString() }` }
					FormHelperTextProps={ { className: 'rf-ac-count', 'data-ask-claude': 'count', 'aria-live': 'polite' } }
					label={ { page: __( 'Describe the page', 'refraction' ), section: __( 'Describe the section', 'refraction' ), selected: __( 'What should change?', 'refraction' ) }[ mode ] }
					placeholder={ { page: __( 'A home page for a small architecture studio in Lisbon: a calm hero with our tagline, three services, recent projects and a contact form.', 'refraction' ), section: __( 'A pricing section with three plans, the middle one highlighted.', 'refraction' ), selected: __( 'Make it two columns and the headline shorter.', 'refraction' ) }[ mode ] }
					value={ prompt }
					onChange={ ( e ) => setPrompt( e.target.value ) }
					inputProps={ { maxLength: max, 'data-ask-claude': 'prompt' } }
				/>
				<Stack direction="row" gap={ 1 } alignItems="center" flexWrap="wrap">
					<Button size="small" variant="outlined" startIcon={ <PhotoIcon /> } onClick={ pickImages }>{ __( 'Reference images', 'refraction' ) }</Button>
					{ images.map( ( image ) => <Chip key={ image.id } size="small" label={ image.title } onDelete={ () => setImages( images.filter( ( i ) => i.id !== image.id ) ) } /> ) }
				</Stack>
				<FormControlLabel control={ <Checkbox size="small" checked={ useStyles } onChange={ ( e ) => setUseStyles( e.target.checked ) } /> } label={ __( "Use the site's colors and fonts", 'refraction' ) } />
				<Select size="small" value={ model } onChange={ ( e ) => setModel( e.target.value ) } inputProps={ { 'aria-label': __( 'Model', 'refraction' ) } } MenuProps={ MENU }>
					{ Object.entries( cfg().models || {} ).map( ( [ id, label ] ) => <MenuItem key={ id } value={ id }>{ label }</MenuItem> ) }
				</Select>
				{ confirmReplace && <Alert severity="warning" data-ask-claude="confirm">{ __( 'This replaces everything on the page. Undo brings it back. Press Generate again to continue.', 'refraction' ) }</Alert> }
				<Button variant="contained" disabled={ busy || ! prompt.trim() } onClick={ run } data-ask-claude="generate">{ busy ? __( 'Building…', 'refraction' ) : __( 'Generate', 'refraction' ) }</Button>
				{ busy && (
					<Box>
						<LinearProgress />
						<Typography variant="caption" className="rf-ac-muted">{ __( 'Claude is building. A whole page can take a few minutes.', 'refraction' ) } { seconds }s</Typography>
					</Box>
				) }
				{ error && <Alert severity="error" data-ask-claude="error">{ error }</Alert> }
				{ result && (
					<Alert severity="success" data-ask-claude="done">
						<Typography variant="body2">{ result.summary || __( 'Done.', 'refraction' ) }</Typography>
						{ result.dropped && result.dropped.length > 0 && <Typography variant="caption" display="block">{ __( 'Left out (not available here):', 'refraction' ) } { result.dropped.join( ', ' ) }</Typography> }
						<Typography variant="caption" display="block" className="rf-ac-muted">{ result.usage.input + result.usage.output } { __( 'tokens', 'refraction' ) } · { result.usage.model }</Typography>
					</Alert>
				) }
			</Stack>
		);
	};

	return (
		<Drawer anchor="right" open={ open } onClose={ onClose } variant="persistent" PaperProps={ { className: 'rf-ac-panel', sx: { width: 400, maxWidth: '100vw', top: 48, height: 'calc(100% - 48px)' }, 'data-ask-claude': 'panel' } }>
			<Stack direction="row" alignItems="center" justifyContent="space-between" sx={ { px: 2, py: 1.5 } }>
				<Typography variant="subtitle1" component="h2">{ __( 'Ask Claude', 'refraction' ) }</Typography>
				<Stack direction="row">
					{ cfg().canManage && cfg().phpOk && state.hasKey && <IconButton size="small" onClick={ () => setSettings( ! settings ) } aria-label={ __( 'API key and model', 'refraction' ) }><SettingsIcon fontSize="small" /></IconButton> }
					<IconButton size="small" onClick={ onClose } aria-label={ __( 'Close', 'refraction' ) }><XIcon fontSize="small" /></IconButton>
				</Stack>
			</Stack>
			<Divider />
			<Box sx={ { p: 2, overflowY: 'auto' } }>{ body() }</Box>
		</Drawer>
	);
}

Panel.propTypes = {
	open: PropTypes.bool.isRequired,
	onClose: PropTypes.func.isRequired,
	initialMode: PropTypes.string,
};
