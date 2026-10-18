import Page from 'refraction-app/layout/page';

export default function NotFound() {
	const config = {
		title: __( 'Not Found', 'refraction' ),
		className: 'eps-app__not-found',
		content: <h1> { __( 'Not Found', 'refraction' ) } </h1>,
		sidebar: <></>,
	};

	return (
		<Page { ...config } />
	);
}
