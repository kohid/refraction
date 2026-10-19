import { KitPluginsCustomizationDialog } from './components/kit-plugins-customization-dialog';
import { KitContentCustomizationDialog } from './components/kit-content-customization-dialog';
import { KitSettingsCustomizationDialog } from './components/kit-settings-customization-dialog';

const kitContentData = [
	{
		type: 'content',
		data: {
			title: __( 'Content', 'refraction' ),
			features: {
				open: [
					__( 'Refraction Pages', 'refraction' ),
					__( 'Refraction Posts', 'refraction' ),
					__( 'WP Pages', 'refraction' ),
					__( 'WP Posts', 'refraction' ),
					__( 'WP Menus', 'refraction' ),
					__( 'Custom Post Types', 'refraction' ),
				],
			},
		},
		dialog: KitContentCustomizationDialog,
		required: false,
	},
	{
		type: 'templates',
		data: {
			title: __( 'Templates', 'refraction' ),
			features: {
				open: [
					__( 'Saved Templates', 'refraction' ),
				],
			},
		},
		dialog: null,
		required: false,
	},
	{
		type: 'settings',
		data: {
			title: __( 'Settings & configurations', 'refraction' ),
			features: {
				open: [
					__( 'Global Colors', 'refraction' ),
					__( 'Global Fonts', 'refraction' ),
					__( 'Theme Style Settings', 'refraction' ),
					__( 'Layout Settings', 'refraction' ),
					__( 'Lightbox Settings', 'refraction' ),
					__( 'Background Settings', 'refraction' ),
					__( 'Custom Fonts', 'refraction' ),
					__( 'Icons', 'refraction' ),
					__( 'Code', 'refraction' ),
				],
			},
		},
		dialog: KitSettingsCustomizationDialog,
		required: false,
	},
	{
		type: 'plugins',
		data: {
			title: __( 'Plugins', 'refraction' ),
			features: {
				open: [
					__( 'All plugins are required for this website templates to work', 'refraction' ),
				],
			},
		},
		dialog: KitPluginsCustomizationDialog,
		required: true,
	},
];

export default kitContentData;
