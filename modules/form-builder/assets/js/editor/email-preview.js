/**
 * The form's settings > Notifications > "Preview the visitor's email" / "Preview the office email" (0.147.0): the
 * email as it would be sent with the settings in the panel right now (saved or not), shown in a window over the editor.
 */
const close = () => document.querySelector( '.rfb-email-modal' )?.remove();

const open = ( html, title ) => {
	close();

	const modal = document.createElement( 'div' );
	modal.className = 'rfb-email-modal';
	modal.setAttribute( 'role', 'dialog' );
	modal.setAttribute( 'aria-label', title );
	modal.style.cssText = 'position:fixed;inset:0;z-index:100000;display:flex;align-items:center;justify-content:center;background:rgba(16,24,40,.55);';
	modal.innerHTML = '<div style="display:flex;flex-direction:column;width:min(720px,94vw);height:min(86vh,900px);background:#fff;border-radius:10px;overflow:hidden;box-shadow:0 20px 50px rgba(0,0,0,.35);">'
		+ '<div style="display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 16px;border-bottom:1px solid #eaecf0;font:600 14px/1.3 system-ui,sans-serif;color:#101828;"><span class="rfb-email-modal__title"></span><button type="button" class="rfb-email-modal__close" style="border:0;background:none;font-size:22px;line-height:1;cursor:pointer;color:#475467;" aria-label="Close">&times;</button></div>'
		+ '<iframe class="rfb-email-modal__frame" title="" style="flex:1;width:100%;border:0;background:#f2f4f7;"></iframe></div>';
	modal.querySelector( '.rfb-email-modal__title' ).textContent = title;
	modal.querySelector( 'iframe' ).title = title;
	modal.querySelector( 'iframe' ).srcdoc = html;
	modal.addEventListener( 'click', ( event ) => {
		if ( event.target === modal || event.target.closest( '.rfb-email-modal__close' ) ) {
			close();
		}
	} );
	document.addEventListener( 'keydown', function onKey( event ) {
		if ( 'Escape' === event.key ) {
			close();
			document.removeEventListener( 'keydown', onKey );
		}
	} );
	document.body.appendChild( modal );
};

document.addEventListener( 'click', ( event ) => {
	const button = event.target.closest && event.target.closest( '.rfb-email-preview' );

	if ( ! button || ! window.refraction ) {
		return;
	}

	event.preventDefault();

	const editor = window.refraction;
	const doc = editor.documents && editor.documents.getCurrent();
	const body = new window.FormData();

	body.append( 'action', 'refraction_rfb_email_preview' );
	body.append( 'post', String( doc ? doc.id : editor.config.document.id ) );
	body.append( 'nonce', ( doc && doc.config && doc.config.rfbEmailNonce ) || '' );
	body.append( 'who', button.dataset.who || 'visitor' );
	body.append( 'settings', JSON.stringify( editor.settings.page.model.toJSON() ) );
	button.disabled = true;

	window.fetch( window.ajaxurl || '/wp-admin/admin-ajax.php', { method: 'POST', body, credentials: 'same-origin' } )
		.then( ( response ) => response.json() )
		.then( ( json ) => {
			if ( json && json.success ) {
				open( json.data.html, button.textContent.trim() );
			}
		} )
		.finally( () => {
			button.disabled = false;
		} );
} );
