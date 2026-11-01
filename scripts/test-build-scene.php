<?php
// Pure-logic tests for the 3D Build Scene module: php scripts/test-build-scene.php
define( 'ABSPATH', __DIR__ . '/' );
$root = dirname( __DIR__ );

if ( ! function_exists( 'wp_parse_url' ) ) {
	function wp_parse_url( $url, $component = -1 ) {
		return parse_url( $url, $component ); // phpcs:ignore WordPress.WP.AlternativeFunctions.parse_url_parse_url
	}
}

require $root . '/modules/build-scene/classes/glb-file.php';

use Refraction\Modules\BuildScene\Classes\Glb_File as G;

$pass = 0; $fail = 0;
function t( $name, $ok ) { global $pass, $fail; if ( $ok ) { $pass++; } else { $fail++; echo "FAIL $name\n"; } }

$head = static function ( string $magic, int $version, int $length ): string {
	return $magic . pack( 'VV', $version, $length );
};

t( 'a glTF 2 header is valid', G::is_valid_header( $head( 'glTF', 2, 2048 ) ) );
t( 'glTF 1 is refused', ! G::is_valid_header( $head( 'glTF', 1, 2048 ) ) );
t( 'a wrong magic is refused', ! G::is_valid_header( $head( 'GLTF', 2, 2048 ) ) );
t( 'a length shorter than the header is refused', ! G::is_valid_header( $head( 'glTF', 2, 4 ) ) );
t( 'a short file is refused', ! G::is_valid_header( 'glTF' ) );
t( 'a PHP file renamed .glb is refused', ! G::is_valid_header( '<?php echo 1;' ) );
t( 'model urls: .glb and .gltf', G::is_model_url( 'https://a.test/wp-content/uploads/house.glb' ) && G::is_model_url( '/x/House.GLTF?ver=2' ) );
t( 'model urls: other files are not models', ! G::is_model_url( 'https://a.test/house.glb.php' ) && ! G::is_model_url( 'https://a.test/image.png' ) && ! G::is_model_url( '' ) );

echo "build-scene: $pass passed, $fail failed\n";
exit( $fail ? 1 : 0 );
