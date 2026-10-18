import { type PregeneratedLinkItem } from '@refraction/editor-styles-repository';
import { getCanvasIframeDocument } from '@refraction/editor-v1-adapters';

const removedProviderKeys = new Set< string >();

export function removeProviderPregeneratedLinks(
	providerKey: string,
	removePregeneratedLink: ( pregeneratedLinkItem: PregeneratedLinkItem ) => boolean
): void {
	if ( removedProviderKeys.has( providerKey ) ) {
		return;
	}

	const iframeDocument = getCanvasIframeDocument();

	if ( ! iframeDocument ) {
		return;
	}

	const links = iframeDocument.head.querySelectorAll< HTMLLinkElement >( 'link[rel="stylesheet"]' );

	links.forEach( ( link ) => {
		const { id, href, media } = link;

		if ( removePregeneratedLink( { id, href, media } ) ) {
			link.remove();
		}
	} );

	removedProviderKeys.add( providerKey );
}

export function resetRemovedProviders(): void {
	removedProviderKeys.clear();
}
