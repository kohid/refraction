<?php
/**
 * Just Refraction: a plain theme for Refraction.
 *
 * It prints the page skeleton and nothing that competes with Refraction: no styles on pages built with Refraction, no
 * scripts, no fonts. Refraction's Theme Builder supplies the header and footer when it has one for the page (the theme
 * declares `refraction-theme-builder` support and calls refraction_theme_builder_header() / _footer() itself).
 *
 * @package Just_Refraction
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

define( 'JUST_REFRACTION_VERSION', '1.0.0' );

/** Theme features. */
function just_refraction_setup() {
	load_theme_textdomain( 'just-refraction', get_template_directory() . '/languages' );

	add_theme_support( 'title-tag' );
	add_theme_support( 'automatic-feed-links' );
	add_theme_support( 'post-thumbnails' );
	add_theme_support( 'responsive-embeds' );
	add_theme_support( 'align-wide' );
	add_theme_support( 'custom-logo', [ 'height' => 80, 'width' => 240, 'flex-height' => true, 'flex-width' => true ] );
	add_theme_support( 'html5', [ 'search-form', 'comment-form', 'comment-list', 'gallery', 'caption', 'script', 'style', 'navigation-widgets' ] );
	add_theme_support( 'woocommerce' );
	// Refraction's Theme Builder: this theme prints its header and footer locations itself.
	add_theme_support( 'refraction-theme-builder' );

	register_nav_menus( [
		'primary' => esc_html__( 'Header menu', 'just-refraction' ),
		'footer' => esc_html__( 'Footer menu', 'just-refraction' ),
	] );
}
add_action( 'after_setup_theme', 'just_refraction_setup' );

/** Content width for embeds on pages not built with Refraction. */
function just_refraction_content_width() {
	$GLOBALS['content_width'] = 800; // phpcs:ignore WordPress.WP.GlobalVariablesOverride.Prohibited
}
add_action( 'after_setup_theme', 'just_refraction_content_width', 0 );

/** Whether the current singular page is built with Refraction (those never get theme styles). */
function just_refraction_is_refraction_page() {
	if ( ! is_singular() || ! class_exists( '\Refraction\Plugin' ) || empty( \Refraction\Plugin::$instance->documents ) ) {
		return false;
	}

	$document = \Refraction\Plugin::$instance->documents->get( get_queried_object_id() );

	return $document && $document->is_built_with_refraction();
}

/** The Customizer switches (both on by default). */
function just_refraction_option( $name ) {
	return (bool) get_theme_mod( 'just_refraction_' . $name, true );
}

/** Whether the theme's own header and footer show where Refraction has none for the page. */
function just_refraction_shows_header_footer() {
	return just_refraction_option( 'header_footer' );
}

/**
 * The styles: an always-on accessibility rule (screen-reader text, skip link) and a minimal reading style for posts and
 * pages not built with Refraction, never loaded on Refraction pages and not at all when switched off.
 */
function just_refraction_styles() {
	// Always: text only screen readers see, and the skip link, visible when it gets keyboard focus. Nothing else.
	wp_register_style( 'just-refraction-a11y', false, [], JUST_REFRACTION_VERSION );
	wp_enqueue_style( 'just-refraction-a11y' );
	wp_add_inline_style( 'just-refraction-a11y', '.screen-reader-text{position:absolute!important;width:1px;height:1px;overflow:hidden;clip:rect(1px,1px,1px,1px);clip-path:inset(50%);white-space:nowrap}.skip-link.screen-reader-text:focus{z-index:100000;top:8px;left:8px;width:auto;height:auto;padding:12px 16px;clip:auto!important;clip-path:none;background:#fff;color:#111;font-size:15px;text-decoration:none}' );

	if ( just_refraction_option( 'basic_styles' ) && ! just_refraction_is_refraction_page() ) {
		wp_enqueue_style( 'just-refraction-basic', get_template_directory_uri() . '/assets/basic.css', [], JUST_REFRACTION_VERSION );
	}

	if ( is_singular() && comments_open() && get_option( 'thread_comments' ) ) {
		wp_enqueue_script( 'comment-reply' );
	}
}
add_action( 'wp_enqueue_scripts', 'just_refraction_styles' );

/** A body class for the basic style to hang on, so its rules can never reach Refraction content. */
function just_refraction_body_class( $classes ) {
	if ( just_refraction_option( 'basic_styles' ) && ! just_refraction_is_refraction_page() ) {
		$classes[] = 'jr-basic';
	}

	return $classes;
}
add_filter( 'body_class', 'just_refraction_body_class' );

/** Appearance > Customize > Just Refraction. */
function just_refraction_customize( $wp_customize ) {
	$wp_customize->add_section( 'just_refraction', [
		'title' => esc_html__( 'Just Refraction', 'just-refraction' ),
		'priority' => 30,
		'description' => esc_html__( 'Refraction pages are never styled by the theme. These switches are for everything else.', 'just-refraction' ),
	] );

	$switches = [
		'header_footer' => [ esc_html__( 'Show the theme header and footer', 'just-refraction' ), esc_html__( 'Shown only where Refraction has no header or footer template for the page.', 'just-refraction' ) ],
		'basic_styles' => [ esc_html__( 'Basic styles for pages not built with Refraction', 'just-refraction' ), esc_html__( 'A readable width and spacing for blog posts, archives and plain pages.', 'just-refraction' ) ],
	];

	foreach ( $switches as $key => list( $label, $description ) ) {
		$wp_customize->add_setting( 'just_refraction_' . $key, [ 'default' => true, 'sanitize_callback' => 'wp_validate_boolean' ] );
		$wp_customize->add_control( 'just_refraction_' . $key, [ 'type' => 'checkbox', 'section' => 'just_refraction', 'label' => $label, 'description' => $description ] );
	}
}
add_action( 'customize_register', 'just_refraction_customize' );

/** When Refraction is not active, say so once in the admin (the theme still works as a plain theme). */
function just_refraction_notice() {
	if ( class_exists( '\Refraction\Plugin' ) || ! current_user_can( 'activate_plugins' ) || 'themes' !== get_current_screen()->id ) {
		return;
	}

	echo '<div class="notice notice-info"><p>' . esc_html__( 'Just Refraction is made for the Refraction page builder. Install and activate Refraction to design your pages, header and footer.', 'just-refraction' ) . '</p></div>';
}
add_action( 'admin_notices', 'just_refraction_notice' );
