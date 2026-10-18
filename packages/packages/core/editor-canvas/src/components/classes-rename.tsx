import { useEffect } from 'react';
import { getV1DocumentsManager, type V1Document } from '@refraction/editor-documents';
import { type V1Element } from '@refraction/editor-elements';
import { stylesRepository } from '@refraction/editor-styles-repository';
import { hash } from '@refraction/utils';

export const ClassesRename = () => {
	useEffect( () => {
		const unsubscribe = subscribeToStylesRepository();

		return () => {
			unsubscribe();
		};
	}, [] );

	return null;
};

const subscribeToStylesRepository = () => {
	return stylesRepository.subscribe( ( previous, current ) => {
		if ( ! previous || ! current ) {
			return;
		}
		const currentIds = Object.keys( current );

		currentIds.forEach( ( id ) => {
			const isStyleChanged = previous[ id ] && hash( previous[ id ] ) !== hash( current[ id ] );

			if ( ! isStyleChanged ) {
				return;
			}

			const previousStyle = previous[ id ];
			const currentStyle = current[ id ];

			if ( previousStyle.label !== currentStyle.label ) {
				renameClass( previousStyle.label, currentStyle.label );
			}
		} );
	} );
};

const renameClass = ( oldClassName: string, newClassName: string ) => {
	Object.values< V1Document >( getV1DocumentsManager().documents ).forEach( ( document ) => {
		const container = document.container as V1Element;

		container.view?.el?.querySelectorAll( `.refraction .${ oldClassName }` ).forEach( ( element ) => {
			element.classList.replace( oldClassName, newClassName );
		} );
	} );
};
