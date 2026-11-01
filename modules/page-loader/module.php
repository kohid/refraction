<?php
namespace Refraction\Modules\PageLoader;

use Refraction\Controls_Manager;
use Refraction\Core\Base\Module as BaseModule;
use Refraction\Modules\PageLoader\Classes\Pure_Loader_Settings;
use Refraction\Plugin;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Page Settings > Loading screen: a full-screen loader shown while the page loads (logo with a progress bar, a
 * spinner or a counter), which then fades, slides up or splits open. Everything is printed inline (a few hundred
 * bytes of CSS and JS), so it paints before any stylesheet or script of the page. It never blocks the page: it only
 * shows when JavaScript runs (the class rf-loading is set by an inline script), and it leaves after the page has
 * loaded or after a time limit, whichever comes first. Reduced motion gets a plain fade. Not shown in the editor.
 */
class Module extends BaseModule {

	/** @var array|null The current page's config, once read. */
	private $config = null;

	public function get_name() {
		return 'page-loader';
	}

	public function __construct() {
		parent::__construct();

		add_action( 'refraction/documents/register_controls', [ $this, 'register_controls' ] );
		add_action( 'wp_head', [ $this, 'print_head' ], 1 );
		add_action( 'wp_body_open', [ $this, 'print_loader' ], 1 );
	}

	public function register_controls( $document ) {
		if ( ! in_array( $document->get_name(), [ 'wp-page', 'wp-post', 'landing-page' ], true ) ) {
			return;
		}

		$on = [ 'rf_loader' => 'yes' ];

		$document->start_controls_section( 'section_rf_loader', [
			'label' => esc_html__( 'Loading screen', 'refraction' ),
			'tab' => Controls_Manager::TAB_SETTINGS,
		] );

		$document->add_control( 'rf_loader', [
			'label' => esc_html__( 'Loading screen', 'refraction' ),
			'type' => Controls_Manager::SWITCHER,
			'description' => esc_html__( 'Covers the page while it loads, then reveals it. Shown on the site only, not in the editor.', 'refraction' ),
		] );

		$document->add_control( 'rf_loader_style', [
			'label' => esc_html__( 'Style', 'refraction' ),
			'type' => Controls_Manager::SELECT,
			'default' => 'bar',
			'options' => [
				'bar' => esc_html__( 'Logo and progress line', 'refraction' ),
				'spinner' => esc_html__( 'Logo and spinning ring', 'refraction' ),
				'counter' => esc_html__( 'Large percentage', 'refraction' ),
			],
			'condition' => $on,
		] );

		$document->add_control( 'rf_loader_logo', [
			'label' => esc_html__( 'Logo', 'refraction' ),
			'type' => Controls_Manager::SELECT,
			'default' => 'site',
			'options' => [
				'site' => esc_html__( 'Site logo (or the site title)', 'refraction' ),
				'text' => esc_html__( 'Text', 'refraction' ),
				'image' => esc_html__( 'Image', 'refraction' ),
			],
			'condition' => $on,
		] );

		$document->add_control( 'rf_loader_text', [
			'label' => esc_html__( 'Text', 'refraction' ),
			'type' => Controls_Manager::TEXT,
			'placeholder' => get_bloginfo( 'name' ),
			'condition' => $on + [ 'rf_loader_logo' => 'text' ],
		] );

		$document->add_control( 'rf_loader_image', [
			'label' => esc_html__( 'Image', 'refraction' ),
			'type' => Controls_Manager::MEDIA,
			'condition' => $on + [ 'rf_loader_logo' => 'image' ],
		] );

		$document->add_control( 'rf_loader_caption', [
			'label' => esc_html__( 'Caption', 'refraction' ),
			'type' => Controls_Manager::TEXT,
			'placeholder' => esc_html__( 'Loading', 'refraction' ),
			'condition' => $on,
		] );

		$document->add_control( 'rf_loader_percent', [
			'label' => esc_html__( 'Show the percentage', 'refraction' ),
			'type' => Controls_Manager::SWITCHER,
			'default' => 'yes',
			'condition' => $on + [ 'rf_loader_style!' => 'counter' ],
		] );

		$document->add_control( 'rf_loader_exit', [
			'label' => esc_html__( 'Reveal', 'refraction' ),
			'type' => Controls_Manager::SELECT,
			'default' => 'fade',
			'options' => [
				'fade' => esc_html__( 'Fade', 'refraction' ),
				'slide' => esc_html__( 'Slide up', 'refraction' ),
				'split' => esc_html__( 'Split open', 'refraction' ),
			],
			'condition' => $on,
		] );

		foreach ( [
			'rf_loader_bg' => [ esc_html__( 'Background', 'refraction' ), 'bg' ],
			'rf_loader_color' => [ esc_html__( 'Text', 'refraction' ), 'color' ],
			'rf_loader_accent' => [ esc_html__( 'Accent', 'refraction' ), 'accent' ],
			'rf_loader_accent_2' => [ esc_html__( 'Second accent', 'refraction' ), 'accent_2' ],
		] as $key => [ $label, $default ] ) {
			$document->add_control( $key, [
				'label' => $label,
				'type' => Controls_Manager::COLOR,
				'default' => Pure_Loader_Settings::DEFAULTS[ $default ],
				'condition' => $on,
			] );
		}

		$document->add_control( 'rf_loader_min', [
			'label' => esc_html__( 'Show at least (ms)', 'refraction' ),
			'type' => Controls_Manager::NUMBER,
			'min' => 0,
			'max' => 5000,
			'placeholder' => '600',
			'condition' => $on,
		] );

		$document->add_control( 'rf_loader_max', [
			'label' => esc_html__( 'Reveal anyway after (ms)', 'refraction' ),
			'type' => Controls_Manager::NUMBER,
			'min' => 1500,
			'max' => 20000,
			'placeholder' => '8000',
			'description' => esc_html__( 'The page is revealed after this time even when something is still loading.', 'refraction' ),
			'condition' => $on,
		] );

		$document->add_control( 'rf_loader_once', [
			'label' => esc_html__( 'Only on the first page view of a visit', 'refraction' ),
			'type' => Controls_Manager::SWITCHER,
			'condition' => $on,
		] );

		$document->end_controls_section();
	}

	/** The current page's loader config, or [] (not a Refraction page, the editor, or switched off). */
	private function config(): array {
		if ( null !== $this->config ) {
			return $this->config;
		}

		$this->config = [];

		if ( ! is_singular() || is_customize_preview() || ( Plugin::$instance->preview && Plugin::$instance->preview->is_preview_mode() ) ) {
			return $this->config;
		}

		$document = Plugin::$instance->documents->get( get_queried_object_id() );

		if ( ! $document || ! $document->is_built_with_refraction() ) {
			return $this->config;
		}

		$config = Pure_Loader_Settings::normalize( (array) $document->get_settings() );

		if ( $config ) {
			$config['id'] = (int) $document->get_main_id();
		}

		$this->config = $config;

		return $this->config;
	}

	/** In the head: the loader's styles and the class that shows it (only when JavaScript runs). */
	public function print_head() {
		$c = $this->config();

		if ( ! $c ) {
			return;
		}

		$vars = sprintf( '--rf-ld-bg:%s;--rf-ld-fg:%s;--rf-ld-a1:%s;--rf-ld-a2:%s', $c['bg'], $c['color'], $c['accent'], $c['accent_2'] );
		$css = '#rf-loader{' . $vars . ';position:fixed;inset:0;z-index:2147483000;display:none;align-items:center;justify-content:center;color:var(--rf-ld-fg);text-align:center}'
			. '.rf-loading #rf-loader{display:flex}.rf-loading,.rf-loading body{overflow:hidden}'
			. '.rf-loader__panel{position:absolute;left:0;right:0;height:50.5%;background:var(--rf-ld-bg);transition:transform .9s cubic-bezier(.77,0,.18,1),opacity .6s ease .1s}'
			. '.rf-loader__panel--a{top:0}.rf-loader__panel--b{bottom:0}'
			. '.rf-loader__inner{position:relative;display:flex;flex-direction:column;align-items:center;gap:22px;padding:24px;transition:opacity .45s ease,transform .6s ease}'
			. '.rf-loader__logo{font-size:20px;font-weight:500;letter-spacing:.32em;text-transform:uppercase;animation:rf-ld-glow 2.4s ease-in-out infinite}'
			. '.rf-loader__logo img{display:block;max-width:200px;max-height:90px;width:auto;height:auto}'
			. '.rf-loader__bar{width:min(280px,64vw);height:2px;border-radius:2px;background:rgba(127,127,127,.25);overflow:hidden}'
			. '.rf-loader__bar i{display:block;height:100%;transform:scaleX(0);transform-origin:left;background:linear-gradient(90deg,var(--rf-ld-a1),var(--rf-ld-a2))}'
			. '.rf-loader__meta{display:flex;gap:18px;font-size:11px;letter-spacing:.24em;text-transform:uppercase;opacity:.62}'
			. '.rf-loader__ring{width:64px;height:64px;border-radius:50%;border:2px solid rgba(127,127,127,.25);border-top-color:var(--rf-ld-a1);border-right-color:var(--rf-ld-a2);animation:rf-ld-spin 1s linear infinite}'
			. '.rf-loader__count{font-size:clamp(64px,13vw,150px);font-weight:300;line-height:1;letter-spacing:-.02em;background:linear-gradient(90deg,var(--rf-ld-a1),var(--rf-ld-a2));-webkit-background-clip:text;background-clip:text;color:transparent}'
			. '#rf-loader.is-done{pointer-events:none}#rf-loader.is-done .rf-loader__inner{opacity:0;transform:translateY(-14px)}'
			. '.rf-loader--exit-fade.is-done .rf-loader__panel{opacity:0}'
			. '.rf-loader--exit-slide.is-done .rf-loader__panel{transform:translateY(-100vh)}'
			. '.rf-loader--exit-split.is-done .rf-loader__panel--a{transform:translateY(-100%)}.rf-loader--exit-split.is-done .rf-loader__panel--b{transform:translateY(100%)}'
			. '@keyframes rf-ld-spin{to{transform:rotate(360deg)}}@keyframes rf-ld-glow{50%{opacity:.55}}'
			. '@media (prefers-reduced-motion:reduce){#rf-loader *{animation:none!important;transition:opacity .25s ease!important}#rf-loader.is-done .rf-loader__panel{transform:none!important;opacity:0}}';

		// Shown only when this runs; "first view only" pages skip it when this visit has seen it; and it lifts by
		// itself after the time limit even if the loader script never runs.
		$js = '(function(){var r=document.documentElement,k="rf-loader-' . (int) $c['id'] . '";'
			. ( $c['once'] ? 'try{if(sessionStorage.getItem(k))return;sessionStorage.setItem(k,"1")}catch(e){}' : '' )
			. 'r.classList.add("rf-loading");setTimeout(function(){r.classList.remove("rf-loading")},' . ( (int) $c['max'] + 1500 ) . ')})();';

		echo '<style id="refraction-loader-css">' . $css . '</style>' . "\n"; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Colors are validated.
		echo '<script id="refraction-loader-js">' . $js . '</script>' . "\n"; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Built from numbers.
	}

	private function logo( array $c ): string {
		if ( 'image' === $c['logo'] && $c['image'] ) {
			return (string) wp_get_attachment_image( $c['image'], 'medium', false, [ 'alt' => get_bloginfo( 'name' ), 'loading' => 'eager' ] );
		}

		if ( 'site' === $c['logo'] && has_custom_logo() ) {
			return (string) wp_get_attachment_image( (int) get_theme_mod( 'custom_logo' ), 'medium', false, [ 'alt' => get_bloginfo( 'name' ), 'loading' => 'eager' ] );
		}

		return esc_html( 'text' === $c['logo'] && '' !== $c['text'] ? $c['text'] : get_bloginfo( 'name' ) );
	}

	/** Right after <body>: the loader, and the script that follows the page's loading and then reveals it. */
	public function print_loader() {
		$c = $this->config();

		if ( ! $c ) {
			return;
		}

		$caption = '' !== $c['caption'] ? $c['caption'] : __( 'Loading', 'refraction' );
		$inner = 'spinner' === $c['style'] ? '<span class="rf-loader__ring" aria-hidden="true"></span>' : '';

		if ( 'counter' === $c['style'] ) {
			$inner .= '<div class="rf-loader__count" aria-hidden="true">0%</div><div class="rf-loader__logo">' . $this->logo( $c ) . '</div>';
		} else {
			$inner .= '<div class="rf-loader__logo">' . $this->logo( $c ) . '</div>';
			$inner .= 'bar' === $c['style'] ? '<div class="rf-loader__bar" aria-hidden="true"><i></i></div>' : '';
			$inner .= '<div class="rf-loader__meta"><span>' . esc_html( $caption ) . '</span>' . ( $c['percent'] ? '<span class="rf-loader__pct" aria-hidden="true">0%</span>' : '' ) . '</div>';
		}

		printf(
			'<div id="rf-loader" class="rf-loader rf-loader--%1$s rf-loader--exit-%2$s" role="status" aria-label="%3$s"><div class="rf-loader__panel rf-loader__panel--a"></div><div class="rf-loader__panel rf-loader__panel--b"></div><div class="rf-loader__inner">%4$s</div></div>',
			esc_attr( $c['style'] ),
			esc_attr( $c['exit'] ),
			esc_attr( $caption ),
			$inner // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Escaped above.
		);

		// Progress: the share of the page's images that have loaded (the document itself counts too), eased so it
		// never jumps; the page is revealed on window load (after the minimum time), or at the time limit.
		$js = '(function(){var r=document.documentElement,el=document.getElementById("rf-loader");if(!el)return;'
			. 'if(!r.classList.contains("rf-loading")){el.remove();return}'
			. 'var min=' . (int) $c['min'] . ',max=' . (int) $c['max'] . ',t0=Date.now(),p=0,done=false,'
			. 'bar=el.querySelector(".rf-loader__bar i"),pc=el.querySelectorAll(".rf-loader__pct,.rf-loader__count");'
			. 'function goal(){if(document.readyState==="complete")return 1;var im=document.images,n=im.length,k=0;for(var i=0;i<n;i++)if(im[i].complete)k++;return n?.2+.7*k/n:.5}'
			. 'function draw(){if(bar)bar.style.transform="scaleX("+p+")";for(var i=0;i<pc.length;i++)pc[i].textContent=Math.round(p*100)+"%"}'
			. 'function tick(){if(done)return;p+=(Math.min(goal(),.96)-p)*.07;draw();requestAnimationFrame(tick)}'
			. 'function finish(){if(done)return;setTimeout(function(){done=true;p=1;draw();el.classList.add("is-done");r.classList.remove("rf-loading");setTimeout(function(){el.remove()},1100)},Math.max(0,min-(Date.now()-t0)))}'
			. 'if(document.readyState==="complete")finish();else window.addEventListener("load",finish);setTimeout(finish,max);tick()})();';

		echo '<script>' . $js . '</script>' . "\n"; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Built from numbers.
	}
}
