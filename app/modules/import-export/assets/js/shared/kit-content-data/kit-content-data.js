const kitContentData = [
	{
		type: 'templates',
		data: {
			title: __( 'Templates', 'refraction' ),
			features: {
				open: [
					__( 'Saved Templates', 'refraction' ),
				],
				locked: [
					__( 'Headers', 'refraction' ),
					__( 'Footers', 'refraction' ),
					__( 'Archives', 'refraction' ),
					__( 'Single Posts', 'refraction' ),
					__( 'Single Pages', 'refraction' ),
					__( 'Search Results', 'refraction' ),
					__( '404 Error Page', 'refraction' ),
					__( 'Popups', 'refraction' ),
					__( 'Global widgets', 'refraction' ),
				],
				tooltip: __( 'To import or export these components, you’ll need Refraction Pro.', 'refraction' ),
			},
		},
	},
	{
		type: 'content',
		data: {
			title: __( 'Content', 'refraction' ),
			features: {
				open: [
					__( 'Refraction Pages', 'refraction' ),
					__( 'Landing Pages', 'refraction' ),
					__( 'Refraction Posts', 'refraction' ),
					__( 'WP Pages', 'refraction' ),
					__( 'WP Posts', 'refraction' ),
					__( 'WP Menus', 'refraction' ),
					__( 'Custom Post Types', 'refraction' ),
				],
			},
		},
	},
	{
		type: 'settings',
		data: {
			title: __( 'Site Settings', 'refraction' ),
			features: {
				open: [
					__( 'Global Colors', 'refraction' ),
					__( 'Global Fonts', 'refraction' ),
					__( 'Theme Style settings', 'refraction' ),
					__( 'Layout Settings', 'refraction' ),
					__( 'Lightbox Settings', 'refraction' ),
					__( 'Background Settings', 'refraction' ),
				],
			},
		},
	},
];

export default kitContentData;
