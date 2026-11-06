<?php
// Pure-logic tests for the converter of the other builder's pages: php scripts/test-migration.php
define( 'ABSPATH', __DIR__ . '/' );
$root = dirname( __DIR__ );

require $root . '/modules/migration/classes/upstream.php';
require $root . '/modules/migration/classes/converter.php';

use Refraction\Modules\Migration\Classes\Converter;
use Refraction\Modules\Migration\Classes\Upstream;

$pass = 0;
$fail = 0;
function t( $name, $ok, $got = null ) {
	global $pass, $fail;
	if ( $ok ) {
		$pass++;
	} else {
		$fail++;
		echo "FAIL $name" . ( null !== $got ? ' -- ' . json_encode( $got ) : '' ) . "\n";
	}
}

$up = Upstream::name(); // assembled, like in the module, so the rename script leaves it alone
$icon = Upstream::icon_prefix();
$known = [ 'heading', 'button', 'html', 'icon', 'refraction-form', 'refraction-nav-menu', 'refraction-animated-headline', 'theme-site-logo', 'theme-search-form', 'woo-product-price', 'woo-add-to-cart', 'woo-products', 'refraction-template', 'nested-tabs', 'refraction-slides', 'shortcode' ];
$shots = [];
$c = new Converter( $known, function ( $el ) use ( &$shots ) {
	$shots[] = $el['widgetType'] ?? $el['elType'];

	return '<div class="snap">' . ( $el['widgetType'] ?? $el['elType'] ) . '</div>';
}, [ 101 => 501, 102 => 502 ] );

// Widget names.
t( 'core widget keeps its name', 'heading' === $c->widget_name( 'heading' ) );
t( 'Pro widget gets the refraction- name', 'refraction-animated-headline' === $c->widget_name( 'animated-headline' ) );
t( 'nav menu', 'refraction-nav-menu' === $c->widget_name( 'nav-menu' ) );
t( 'form', 'refraction-form' === $c->widget_name( 'form' ) );
t( 'theme widget', 'theme-site-logo' === $c->widget_name( 'theme-site-logo' ) );
t( 'search form', 'theme-search-form' === $c->widget_name( 'search-form' ) );
t( 'shop price', 'woo-product-price' === $c->widget_name( 'woocommerce-product-price' ) );
t( 'shop add to cart', 'woo-add-to-cart' === $c->widget_name( 'woocommerce-product-add-to-cart' ) );
t( 'shop products', 'woo-products' === $c->widget_name( 'woocommerce-products' ) );
t( 'add-on widget has none', '' === $c->widget_name( 'eael-creative-button' ) );

// A page.
$page = [
	[
		'id' => 'sec1', 'elType' => 'section', 'settings' => [ 'background_color' => '#000' ], 'elements' => [
			[
				'id' => 'col1', 'elType' => 'column', 'settings' => [ '_column_size' => 100 ], 'elements' => [
					[ 'id' => 'h1', 'elType' => 'widget', 'widgetType' => 'heading', 'settings' => [
						'title' => 'Hi',
						'__dynamic__' => [ 'title' => '[' . $up . '-tag id="abc1234" name="post-title" settings="%7B%7D"]' ],
						'__globals__' => [ 'title_color' => 'globals/colors?id=primary' ],
						'custom_css' => 'selector .' . $up . '-heading-title { color: red; } selector { background: url(/wp-content/uploads/' . $up . '/x.png); }',
					], 'elements' => [] ],
					[ 'id' => 'b1', 'elType' => 'widget', 'widgetType' => 'button', 'settings' => [
						'link' => [ 'url' => '#' . $up . '-action%3Aaction%3Dpopup%3Aopen%26settings%3D' . rawurlencode( base64_encode( '{"id":"102","toggle":false}' ) ) ],
						'selected_icon' => [ 'value' => $icon . '-star', 'library' => $icon . 's' ],
					], 'elements' => [] ],
					[ 'id' => 'x1', 'elType' => 'widget', 'widgetType' => 'eael-creative-button', 'settings' => [ 'eael_text' => 'Book', '_margin' => [ 'top' => '10' ], '_css_classes' => 'cta' ], 'elements' => [] ],
					[ 'id' => 'g1', 'elType' => 'widget', 'widgetType' => 'global', 'templateID' => 101, 'settings' => [], 'elements' => [] ],
					[ 'id' => 't1', 'elType' => 'widget', 'widgetType' => 'template', 'settings' => [ 'template_id' => '102' ], 'elements' => [] ],
					[ 'id' => 's1', 'elType' => 'widget', 'widgetType' => 'shortcode', 'settings' => [ 'shortcode' => '[' . $up . '-template id="101"]' ], 'elements' => [] ],
				],
			],
		],
	],
	[ 'id' => 'atom', 'elType' => 'e-div-block', 'settings' => [], 'elements' => [] ],
];
$out = $c->elements( $page );
$col = $out[0]['elements'][0]['elements'];
$json = json_encode( $out );

t( 'sections and columns stay', 'section' === $out[0]['elType'] && 'column' === $out[0]['elements'][0]['elType'] && '#000' === $out[0]['settings']['background_color'] );
t( 'dynamic tag renamed', '[refraction-tag id="abc1234" name="post-title" settings="%7B%7D"]' === $col[0]['settings']['__dynamic__']['title'], $col[0]['settings']['__dynamic__'] );
t( 'global colors kept', 'globals/colors?id=primary' === $col[0]['settings']['__globals__']['title_color'] );
t( 'custom CSS class names renamed, file paths kept', false !== strpos( $col[0]['settings']['custom_css'], '.refraction-heading-title' ) && false !== strpos( $col[0]['settings']['custom_css'], '/uploads/' . $up . '/x.png' ), $col[0]['settings']['custom_css'] );
t( 'popup link points at the converted popup', '#refraction-popup%3Aopen%3A502' === $col[1]['settings']['link']['url'], $col[1]['settings']['link'] );
t( 'icon font', 'rficon-star' === $col[1]['settings']['selected_icon']['value'] && 'rficons' === $col[1]['settings']['selected_icon']['library'], $col[1]['settings']['selected_icon'] );
t( 'add-on widget kept as HTML with its spacing and classes', 'html' === $col[2]['widgetType'] && '<div class="snap">eael-creative-button</div>' === $col[2]['settings']['html'] && [ 'top' => '10' ] === $col[2]['settings']['_margin'] && false !== strpos( $col[2]['settings']['_css_classes'], 'rf-imported-widget' ) && false !== strpos( $col[2]['settings']['_css_classes'], 'cta' ) && ! isset( $col[2]['settings']['eael_text'] ), $col[2] );
t( 'global widget becomes the Template widget', 'refraction-template' === $col[3]['widgetType'] && '501' === $col[3]['settings']['template_id'] && ! isset( $col[3]['templateID'] ), $col[3] );
t( 'Template widget points at the converted template', 'refraction-template' === $col[4]['widgetType'] && '502' === $col[4]['settings']['template_id'], $col[4] );
t( 'template shortcode', '[refraction-template id="501"]' === $col[5]['settings']['shortcode'], $col[5]['settings'] );
t( 'unknown top-level element: kept as HTML inside a container', 'container' === $out[1]['elType'] && 'html' === $out[1]['elements'][0]['widgetType'], $out[1] );
t( 'report lists what was kept as HTML', [ 'eael-creative-button' => 1, 'e-div-block' => 1 ] === $c->replaced, $c->replaced );
t( 'no other builder names left in tags, links or icons', ! preg_match( '/' . $up . '-(tag|action|template)|' . $icon . '-/', $json ), $json );

// Page settings and types.
$s = $c->page_settings( [ 'template' => $up . '_canvas', 'custom_css' => '.' . $up . '-kit-5 { }', 'hide_title' => 'yes' ] );
t( 'page template', 'refraction_canvas' === $s['template'] && 'refraction_header_footer' === Converter::page_template( $up . '_header_footer' ) && 'default' === Converter::page_template( $up . '_theme' ) && 'yes' === $s['hide_title'] );
t( 'page custom CSS', '.refraction-kit-5 { }' === $s['custom_css'], $s );
t( 'template types', 'single' === Converter::template_type( 'single-post' ) && 'header' === Converter::template_type( 'header' ) && 'section' === Converter::template_type( 'widget' ) );
t( 'plain text with the name is left alone', 'Built with ' . Upstream::label() . ' before' === $c->text( 'Built with ' . Upstream::label() . ' before' ) );

echo "$pass passed, $fail failed\n";
exit( $fail ? 1 : 0 );
