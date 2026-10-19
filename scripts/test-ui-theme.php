<?php
// Standalone test for Refraction\Core\Ui_Theme\Registry (no WordPress needed): php scripts/test-ui-theme.php
define( 'ABSPATH', __DIR__ . '/' );
function esc_html__( $t ) { return $t; }
function __( $t ) { return $t; }
require dirname( __DIR__ ) . '/core/ui-theme/registry.php';

use Refraction\Core\Ui_Theme\Registry;

$pass = 0; $fail = 0;
function t( $name, $ok ) { global $pass, $fail; if ( $ok ) { $pass++; } else { $fail++; echo "FAIL $name\n"; } }

$ids = array_keys( Registry::themes() );
t( 'registry lists the five Framify themes', [ 'daylight', 'graphite', 'ember', 'blueprint', 'contrast' ] === $ids );
t( 'auto is not a theme entry but is a valid choice', ! in_array( 'auto', $ids, true ) && Registry::is_valid_choice( 'auto' ) );
t( 'choices are auto then the themes', array_merge( [ 'auto' ], $ids ) === array_keys( Registry::choices() ) );
foreach ( Registry::themes() as $id => $theme ) {
	t( "$id has label, blurb, scheme and icon", ! empty( $theme['label'] ) && ! empty( $theme['blurb'] ) && in_array( $theme['scheme'], [ 'light', 'dark' ], true ) && ! empty( $theme['icon'] ) );
}
t( 'sanitize keeps a known theme', 'ember' === Registry::sanitize( 'ember' ) );
t( 'sanitize keeps auto', 'auto' === Registry::sanitize( 'auto' ) );
t( 'sanitize lowercases and trims', 'graphite' === Registry::sanitize( "  Graphite\n" ) );
t( 'sanitize rejects unknown names to empty', '' === Registry::sanitize( 'neon' ) );
t( 'sanitize rejects markup', '' === Registry::sanitize( '"><script>alert(1)</script>' ) );
t( 'sanitize rejects arrays and null', '' === Registry::sanitize( [ 'ember' ] ) && '' === Registry::sanitize( null ) );
t( 'sanitize rejects a traversal name', '' === Registry::sanitize( '../ember' ) );

t( 'resolve: a user choice wins over the site default', 'ember' === Registry::resolve( 'ember', 'blueprint' ) );
t( 'resolve: explicit auto beats the site default', 'auto' === Registry::resolve( 'auto', 'blueprint' ) );
t( 'resolve: no user choice uses the site default', 'blueprint' === Registry::resolve( '', 'blueprint' ) );
t( 'resolve: a garbage user value falls through to the site default', 'blueprint' === Registry::resolve( 'neon', 'blueprint' ) );
t( 'resolve: nothing valid means auto', 'auto' === Registry::resolve( '', '' ) && 'auto' === Registry::resolve( false, 'neon' ) );

t( 'html_attribute is empty for auto (today\'s look)', '' === Registry::html_attribute( 'auto' ) );
t( 'html_attribute prints the data attribute', ' data-refraction-theme="ember"' === Registry::html_attribute( 'ember' ) );
t( 'html_attribute refuses unknown names', '' === Registry::html_attribute( 'x" onload="y' ) );

echo "ui-theme: $pass passed, $fail failed\n";
exit( $fail ? 1 : 0 );
