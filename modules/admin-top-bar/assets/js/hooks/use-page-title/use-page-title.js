import { useState, useEffect } from 'react';

export const usePageTitle = () => {
	const [ pageTitle, setPageTitle ] = useState( 'Refraction' );

	useEffect( () => {
		const pageTitleElement = document.querySelector( '.wp-heading-inline' );
		if ( ! pageTitleElement ) {
			return;
		}

		setPageTitle( pageTitleElement.innerText );
	}, [ ] );

	return pageTitle;
};
