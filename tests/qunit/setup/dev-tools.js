// eslint-disable-next-line no-unused-vars
const refractionDevToolsConfig = {
	isDebug: true,
	urls: { assets: 'http://elementor.localhost/wp-content/plugins/elementor/assets/' },
	deprecation: {
		// Enabling passing Refraction version from `package.json`.
		current_version: __karma__.config.qunit.refractionVersion,
		soft_notices: {},
	},
};
