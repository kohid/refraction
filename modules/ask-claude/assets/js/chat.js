import * as React from 'react';
import PropTypes from 'prop-types';
import { __ } from '@wordpress/i18n';
import apiFetch from '@wordpress/api-fetch';
import { Alert, Button, Link, Stack, TextField, Typography } from '@elementor/ui';
import { context, insert, pageIsEmpty, selected } from './insert';

const cfg = () => window.refractionAskClaude || {};

/**
 * Copies text; on sites without a secure context (no clipboard access) it is downloaded as a file instead, which
 * can be attached to the chat just the same.
 *
 * @param {string} text The prompt.
 * @return {Promise<string>} 'copied' or 'downloaded'.
 */
async function copyOrDownload( text ) {
	try {
		await window.navigator.clipboard.writeText( text );

		return 'copied';
	} catch ( e ) {
		const url = URL.createObjectURL( new Blob( [ text ], { type: 'text/plain' } ) );
		const a = document.createElement( 'a' );
		a.href = url;
		a.download = 'refraction-prompt.txt';
		a.click();
		setTimeout( () => URL.revokeObjectURL( url ), 1000 );

		return 'downloaded';
	}
}

/**
 * The Claude.ai chat mode: copy one complete prompt into the person's own Claude.ai chat (their Pro or Max plan pays
 * for it), then paste the answer back. The site checks the answer like any other; it never calls Claude itself.
 *
 * @param {Object}  props
 * @param {string}  props.mode      page, section or selected.
 * @param {string}  props.prompt    The description.
 * @param {boolean} props.useStyles Use the site's colors and fonts.
 */
export function ChatFlow( { mode, prompt, useStyles } ) {
	const [ copied, setCopied ] = React.useState( null );
	const [ answer, setAnswer ] = React.useState( '' );
	const [ busy, setBusy ] = React.useState( false );
	const [ error, setError ] = React.useState( '' );
	const [ result, setResult ] = React.useState( null );
	const [ confirmReplace, setConfirmReplace ] = React.useState( false );
	const postId = () => window.refraction.config.document.id;

	const needsSelection = () => {
		if ( 'selected' === mode && ! selected() ) {
			setError( __( 'Select an element in the page first.', 'refraction' ) );

			return true;
		}

		return false;
	};

	const copy = async () => {
		if ( needsSelection() ) {
			return;
		}

		setBusy( true );
		setError( '' );

		try {
			const data = await apiFetch( { path: `/${ cfg().route }/chat-prompt`, method: 'POST', data: { post_id: postId(), prompt, mode, use_styles: useStyles, context: context( mode ) } } );
			setCopied( { how: await copyOrDownload( data.text ), tokens: data.tokens } );
		} catch ( e ) {
			setError( e.message || __( 'Something went wrong. Try again.', 'refraction' ) );
		} finally {
			setBusy( false );
		}
	};

	const add = async () => {
		if ( needsSelection() ) {
			return;
		}

		if ( 'page' === mode && ! pageIsEmpty() && ! confirmReplace ) {
			setConfirmReplace( true );

			return;
		}

		setConfirmReplace( false );
		setBusy( true );
		setError( '' );
		setResult( null );

		try {
			const data = await apiFetch( { path: `/${ cfg().route }/chat-import`, method: 'POST', data: { post_id: postId(), mode, answer } } );
			insert( mode, data.elements );
			setResult( data );
			setAnswer( '' );
		} catch ( e ) {
			setError( e.message || __( 'Something went wrong. Try again.', 'refraction' ) );
		} finally {
			setBusy( false );
		}
	};

	return (
		<Stack gap={ 1.5 } data-ask-claude="chat">
			<Typography variant="subtitle2">{ __( '1. Copy the prompt', 'refraction' ) }</Typography>
			<Typography variant="body2" className="rf-ac-muted">
				{ __( 'It holds your description and everything Claude needs to know about Refraction. Reference images: attach them in the chat.', 'refraction' ) }
			</Typography>
			<Button variant="contained" disabled={ busy || ! prompt.trim() } onClick={ copy } data-ask-claude="chat-copy">{ __( 'Copy prompt for Claude.ai', 'refraction' ) }</Button>
			{ copied && (
				<Alert severity="info" data-ask-claude="chat-copied">
					<Typography variant="body2">
						{ 'copied' === copied.how ? __( 'Copied.', 'refraction' ) : __( 'Saved as refraction-prompt.txt: attach that file in the chat.', 'refraction' ) }
						{ ' ' }
						{ __( 'Open a new chat, paste it and send. Opus 5.5 or Sonnet 5.5 give the best results.', 'refraction' ) }
						{ ' ' }
						{ __( 'Size:', 'refraction' ) } ~{ copied.tokens.toLocaleString() } { __( 'tokens', 'refraction' ) }
					</Typography>
					<Link href="https://claude.ai/new" target="_blank" rel="noopener noreferrer" variant="body2">{ __( 'Open Claude.ai', 'refraction' ) }</Link>
				</Alert>
			) }
			<Typography variant="subtitle2" sx={ { mt: 1 } }>{ __( "2. Paste Claude's answer", 'refraction' ) }</Typography>
			<TextField
				multiline
				minRows={ 4 }
				maxRows={ 12 }
				label={ __( "Claude's answer (the whole code block)", 'refraction' ) }
				value={ answer }
				onChange={ ( e ) => setAnswer( e.target.value ) }
				inputProps={ { 'data-ask-claude': 'chat-answer', spellCheck: false } }
			/>
			{ confirmReplace && <Alert severity="warning" data-ask-claude="confirm">{ __( 'This replaces everything on the page. Undo brings it back. Press Insert again to continue.', 'refraction' ) }</Alert> }
			<Button variant="contained" disabled={ busy || ! answer.trim() } onClick={ add } data-ask-claude="chat-insert">{ __( 'Insert into the page', 'refraction' ) }</Button>
			{ error && <Alert severity="error" data-ask-claude="error">{ error }</Alert> }
			{ result && (
				<Alert severity="success" data-ask-claude="done">
					<Typography variant="body2">{ result.summary || __( 'Done.', 'refraction' ) }</Typography>
					{ result.dropped && result.dropped.length > 0 && <Typography variant="caption" display="block">{ __( 'Left out (not available here):', 'refraction' ) } { result.dropped.join( ', ' ) }</Typography> }
				</Alert>
			) }
		</Stack>
	);
}

ChatFlow.propTypes = {
	mode: PropTypes.string.isRequired,
	prompt: PropTypes.string.isRequired,
	useStyles: PropTypes.bool.isRequired,
};
