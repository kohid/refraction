import { useEffect, useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { useDispatch, useSelect } from '@wordpress/data';
import { useEntityId } from '@wordpress/core-data';
import { Button } from '@wordpress/components';
import { registerPlugin } from '@wordpress/plugins';
import { WooHeaderItem } from '@woocommerce/admin-layout';

function EditWithRefractionButton() {
	const [ isRedirecting, setIsRedirecting ] = useState( false );
	const productId = useEntityId( 'postType', 'product' );
	const { saveEntityRecord } = useDispatch( 'core' );

	const postStatus = useSelect( ( select ) => {
		return select( 'core' ).getEditedEntityRecord( 'postType', 'product', productId )?.status;
	}, [ productId ] );

	const isSaving = wp.data.select( 'core/editor' ).isSavingPost();

	useEffect( () => {
		if ( isRedirecting && ! isSaving ) {
			redirectToRefraction();
		}
	}, [ isRedirecting, isSaving ] );

	const handleClick = () => {
		if ( 'auto-draft' === postStatus ) {
			saveEntityRecord( 'postType', 'product', {
				id: productId,
				name: `Refraction #${ productId }`,
				status: 'draft',
			} ).then( () => {
				setIsRedirecting( true );
			} ).catch( () => {} );
		} else {
			setIsRedirecting( true );
		}
	};

	const redirectToRefraction = () => {
		window.location.href = getEditUrl();
	};

	const getEditUrl = () => {
		const url = new URL( RefractionWCProductEditorSettings.editLink );

		url.searchParams.set( 'post', productId );
		url.searchParams.set( 'action', 'refraction' );

		return url.toString();
	};

	return (
		<WooHeaderItem name="product">
			<Button variant="primary" onClick={ handleClick } style={ { display: 'flex', alignItems: 'center' } }>
				<i className="rficon-refraction-square" aria-hidden="true" style={ { paddingInlineEnd: '8px' } }></i>
				{ __( 'Edit with Refraction', 'refraction' ) }
			</Button>
		</WooHeaderItem>
	);
}

registerPlugin( 'refraction-header-item', {
	render: EditWithRefractionButton,
	scope: 'woocommerce-product-block-editor',
} );
