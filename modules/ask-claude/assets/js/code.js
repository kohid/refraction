import * as React from 'react';
import PropTypes from 'prop-types';
import { __ } from '@wordpress/i18n';
import apiFetch from '@wordpress/api-fetch';
import { Alert, Box, Button, Chip, Link, Stack, Typography } from '@elementor/ui';
import { context, insert, pageIsEmpty, selected } from './insert';

const cfg = () => window.refractionAskClaude || {};
const path = ( suffix = '' ) => `/${ cfg().route }/jobs${ suffix }`;
const postId = () => window.refraction.config.document.id;

const STATES = {
	queued: __( 'Waiting for Claude Code', 'refraction' ),
	building: __( 'Claude is building', 'refraction' ),
	ready: __( 'Ready', 'refraction' ),
	declined: __( 'Declined', 'refraction' ),
};

const MODE_LABELS = {
	page: __( 'Whole page', 'refraction' ),
	section: __( 'Section', 'refraction' ),
	selected: __( 'Change selected', 'refraction' ),
};

/** For administrators: how to let a Claude Code session watch this site's queue. */
function Setup() {
	return (
		<Box component="details" className="rf-ac-setup" data-ask-claude="code-setup">
			<Typography component="summary" variant="body2">{ __( 'How to set up Claude Code', 'refraction' ) }</Typography>
			<Typography component="ol" variant="body2" className="rf-ac-muted" sx={ { pl: 2.5, my: 1 } }>
				<li>{ __( 'Users > Add New: create a user with the role "Claude Code builder (Refraction)". It can only read and answer this queue.', 'refraction' ) }</li>
				<li>{ __( 'Edit that user > Application Passwords: add one named "Claude Code" and copy it.', 'refraction' ) }</li>
				<li>{ __( 'In Claude Code (claude.ai/code or the desktop app, included in Claude Pro and Max), open the Refraction repository with these environment variables: REFRACTION_REST_URL (this site\'s address), REFRACTION_REST_USER and REFRACTION_REST_PASSWORD.', 'refraction' ) }</li>
				<li>{ __( 'Type /ask-claude-watch. While it runs, this panel says "Claude Code is watching" and requests are built within a few minutes.', 'refraction' ) }</li>
			</Typography>
		</Box>
	);
}

/**
 * The Claude Code mode: the request waits in a queue on the site; a Claude Code session (on the person's Claude plan,
 * no API credit) builds it and sends it back; the person inserts it here. The site never calls Claude.
 *
 * @param {Object}  props
 * @param {boolean} props.active    Whether the panel is open (polling stops when it is closed).
 * @param {string}  props.mode      page, section or selected.
 * @param {string}  props.prompt    The description.
 * @param {boolean} props.useStyles Use the site's colors and fonts.
 */
export function CodeFlow( { active, mode, prompt, useStyles } ) {
	const [ jobs, setJobs ] = React.useState( [] );
	const [ watching, setWatching ] = React.useState( !! cfg().watching );
	const [ busy, setBusy ] = React.useState( false );
	const [ error, setError ] = React.useState( '' );
	const [ done, setDone ] = React.useState( '' );
	const [ confirm, setConfirm ] = React.useState( null );

	const load = React.useCallback( async () => {
		try {
			const data = await apiFetch( { path: `${ path() }?post_id=${ postId() }` } );
			setJobs( data.jobs );
			setWatching( data.watching );
		} catch ( e ) {
			// The next poll tries again.
		}
	}, [] );

	React.useEffect( () => {
		if ( ! active ) {
			return undefined;
		}

		load();
		const timer = setInterval( load, 5000 );

		return () => clearInterval( timer );
	}, [ active, load ] );

	const send = async () => {
		const target = selected();

		if ( 'selected' === mode && ! target ) {
			setError( __( 'Select an element in the page first.', 'refraction' ) );

			return;
		}

		setBusy( true );
		setError( '' );
		setDone( '' );

		try {
			const data = await apiFetch( { path: path(), method: 'POST', data: { post_id: postId(), prompt, mode, use_styles: useStyles, context: context( mode ), target: 'selected' === mode ? target.id : '' } } );
			setJobs( [ ...jobs, data.job ] );
			setWatching( data.watching );
		} catch ( e ) {
			setError( e.message || __( 'Something went wrong. Try again.', 'refraction' ) );
		} finally {
			setBusy( false );
		}
	};

	const remove = async ( job ) => {
		await apiFetch( { path: path( `/${ job.id }` ), method: 'DELETE' } ).catch( () => null );
		setJobs( ( list ) => list.filter( ( j ) => j.id !== job.id ) );
	};

	const add = async ( job ) => {
		setError( '' );
		let target = null;

		if ( 'selected' === job.mode ) {
			target = window.refraction.getContainer ? window.refraction.getContainer( job.target ) : null;

			if ( ! target ) {
				setError( __( 'The element this change was for is no longer on the page.', 'refraction' ) );

				return;
			}
		}

		if ( 'page' === job.mode && ! pageIsEmpty() && confirm !== job.id ) {
			setConfirm( job.id );

			return;
		}

		setConfirm( null );
		insert( job.mode, job.elements, target, job.page_settings );
		setDone( job.summary || __( 'Done.', 'refraction' ) );
		await remove( job );
	};

	return (
		<Stack gap={ 1.5 } data-ask-claude="code">
			<Stack direction="row" gap={ 1 } alignItems="center" data-ask-claude="code-watching" data-watching={ watching ? 'yes' : 'no' }>
				<Box component="span" className={ `rf-ac-dot${ watching ? ' is-on' : '' }` } />
				<Typography variant="body2">{ watching ? __( 'Claude Code is watching', 'refraction' ) : __( 'Claude Code is not watching right now: requests wait until a session runs /ask-claude-watch.', 'refraction' ) }</Typography>
			</Stack>
			{ cfg().canManage && ! watching && <Setup /> }
			<Button variant="contained" disabled={ busy || ! prompt.trim() } onClick={ send } data-ask-claude="code-send">{ __( 'Send to Claude Code', 'refraction' ) }</Button>
			{ error && <Alert severity="error" data-ask-claude="error">{ error }</Alert> }
			{ done && <Alert severity="success" data-ask-claude="done"><Typography variant="body2">{ done }</Typography></Alert> }
			{ jobs.map( ( job ) => (
				<Box key={ job.id } className="rf-ac-job" data-ask-claude="job" data-state={ job.state }>
					<Stack direction="row" gap={ 1 } alignItems="center" justifyContent="space-between">
						<Typography variant="caption" className="rf-ac-muted">{ MODE_LABELS[ job.mode ] }</Typography>
						<Chip size="small" label={ STATES[ job.state ] } className={ `rf-ac-state is-${ job.state }` } />
					</Stack>
					<Typography variant="body2" className="rf-ac-job-title">{ job.title }</Typography>
					{ 'ready' === job.state && (
						<>
							{ job.summary && <Typography variant="body2" sx={ { mt: 0.5 } }>{ job.summary }</Typography> }
							{ job.dropped && job.dropped.length > 0 && <Typography variant="caption" display="block" className="rf-ac-muted">{ __( 'Left out (not available here):', 'refraction' ) } { job.dropped.join( ', ' ) }</Typography> }
							{ confirm === job.id && <Alert severity="warning" data-ask-claude="confirm" sx={ { mt: 1 } }>{ __( 'This replaces everything on the page. Undo brings it back. Press Insert again to continue.', 'refraction' ) }</Alert> }
						</>
					) }
					{ 'declined' === job.state && job.note && <Typography variant="body2" sx={ { mt: 0.5 } }>{ job.note }</Typography> }
					<Stack direction="row" gap={ 1 } sx={ { mt: 1 } }>
						{ 'ready' === job.state && <Button size="small" variant="contained" onClick={ () => add( job ) } data-ask-claude="job-insert">{ __( 'Insert into the page', 'refraction' ) }</Button> }
						<Button size="small" onClick={ () => remove( job ) } data-ask-claude="job-remove">{ 'ready' === job.state || 'declined' === job.state ? __( 'Discard', 'refraction' ) : __( 'Cancel', 'refraction' ) }</Button>
					</Stack>
				</Box>
			) ) }
			<Typography variant="caption" className="rf-ac-muted">
				{ __( 'Uses Claude Code on your Claude Pro or Max plan; this site never calls Claude.', 'refraction' ) }
				{ ' ' }
				<Link href="https://claude.ai/code" target="_blank" rel="noopener noreferrer">claude.ai/code</Link>
			</Typography>
		</Stack>
	);
}

CodeFlow.propTypes = {
	active: PropTypes.bool.isRequired,
	mode: PropTypes.string.isRequired,
	prompt: PropTypes.string.isRequired,
	useStyles: PropTypes.bool.isRequired,
};
