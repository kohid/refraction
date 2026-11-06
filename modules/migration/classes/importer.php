<?php
namespace Refraction\Modules\Migration\Classes;

use Refraction\Plugin;
use Refraction\TemplateLibrary\Source_Local;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Moves pages, templates and the site's global styles from the other builder to Refraction.
 *
 * A page is converted in place: its elements and page settings are written as Refraction's, the other builder stops
 * showing it (its edit mode is set aside, its data stays), and "Back to ..." undoes it while that data is there.
 * Templates (headers, footers, single and archive templates, popups, sections) become Refraction templates with their
 * display conditions; the global colors, fonts and layout settings go into Refraction's site settings. Templates and
 * global styles are moved before the first page, so a converted page shows with its header, footer and colors.
 */
class Importer {

	/** Their template id => the converted Refraction template. */
	const MAP_OPTION = 'refraction_migration_templates';

	/** When the global styles were moved. */
	const KIT_OPTION = 'refraction_migration_kit';

	/** On a converted page: what to put back to undo it, and the widgets kept as HTML. */
	const BACKUP_META = '_refraction_migrated';

	const THEME_TYPES = [ 'header', 'footer', 'single', 'archive', 'search-results', 'error-404', 'popup' ];

	/** Whether a post was built with the other builder (and is not converted yet). */
	public static function has_data( int $post_id ): bool {
		return 'builder' === get_post_meta( $post_id, Upstream::meta( 'edit_mode' ), true ) && '' !== (string) get_post_meta( $post_id, Upstream::meta( 'data' ), true );
	}

	public static function is_converted( int $post_id ): bool {
		return is_array( get_post_meta( $post_id, self::BACKUP_META, true ) );
	}

	/** Post types whose posts can be converted from the list of posts (not the template libraries). */
	public static function post_types(): array {
		return array_values( array_diff( get_post_types( [ 'show_ui' => true ] ), [ Upstream::library_cpt(), Source_Local::CPT, 'attachment', 'wp_block', 'wp_navigation', 'wp_template', 'wp_template_part' ] ) );
	}

	/** Posts built with the other builder, not converted yet. */
	public static function pending( int $limit = -1 ): array {
		return get_posts( [
			'post_type' => self::post_types(),
			'post_status' => [ 'publish', 'draft', 'pending', 'private', 'future' ],
			'numberposts' => $limit,
			'fields' => 'ids',
			'orderby' => 'ID',
			'order' => 'ASC',
			'meta_key' => Upstream::meta( 'edit_mode' ), // phpcs:ignore WordPress.DB.SlowDBQuery.slow_db_query_meta_key
			'meta_value' => 'builder', // phpcs:ignore WordPress.DB.SlowDBQuery.slow_db_query_meta_value
			'suppress_filters' => true,
		] );
	}

	public static function converted(): array {
		return get_posts( [
			'post_type' => self::post_types(),
			'post_status' => [ 'publish', 'draft', 'pending', 'private', 'future' ],
			'numberposts' => -1,
			'fields' => 'ids',
			'meta_key' => self::BACKUP_META, // phpcs:ignore WordPress.DB.SlowDBQuery.slow_db_query_meta_key
			'suppress_filters' => true,
		] );
	}

	/** Their templates (any status but trash), without their site settings (the kit, moved by import_kit()). */
	public static function templates(): array {
		// Read from the database: the other builder may already be gone, its templates are still there.
		global $wpdb;

		$ids = array_map( 'intval', $wpdb->get_col( $wpdb->prepare( "SELECT ID FROM {$wpdb->posts} WHERE post_type = %s AND post_status IN ('publish','draft','pending','private','future') ORDER BY ID", Upstream::library_cpt() ) ) ); // phpcs:ignore WordPress.DB.DirectDatabaseQuery

		return array_values( array_filter( $ids, static fn( $id ) => ! in_array( (string) get_post_meta( $id, Upstream::meta( 'template_type' ), true ), [ 'kit', '' ], true ) ) );
	}

	/** Whether there is anything of the other builder's on the site (for showing the tools at all). */
	public static function has_anything(): bool {
		global $wpdb;

		return (bool) $wpdb->get_var( $wpdb->prepare( "SELECT 1 FROM {$wpdb->postmeta} WHERE meta_key IN (%s, %s) LIMIT 1", Upstream::meta( 'edit_mode' ), self::BACKUP_META ) ); // phpcs:ignore WordPress.DB.DirectDatabaseQuery
	}

	public static function template_map(): array {
		$map = get_option( self::MAP_OPTION, [] );

		return is_array( $map ) ? array_map( 'intval', $map ) : [];
	}

	/**
	 * Converts one post (templates and global styles first, the first time).
	 *
	 * @return array{ok:bool,error:string,replaced:array<string,int>}
	 */
	public static function convert_post( int $post_id ): array {
		if ( ! self::has_data( $post_id ) ) {
			return [ 'ok' => false, 'error' => 'not-built', 'replaced' => [] ];
		}

		self::prepare();

		$data = json_decode( (string) get_post_meta( $post_id, Upstream::meta( 'data' ), true ), true );

		if ( ! is_array( $data ) ) {
			return [ 'ok' => false, 'error' => 'unreadable', 'replaced' => [] ];
		}

		$converter = self::converter( $post_id );
		$elements = $converter->elements( $data );
		$settings = get_post_meta( $post_id, Upstream::meta( 'page_settings' ), true );
		$settings = $converter->page_settings( is_array( $settings ) ? $settings : [] );
		$type = (string) get_post_meta( $post_id, Upstream::meta( 'template_type' ), true );
		$type = '' !== $type ? Converter::template_type( $type ) : ( 'page' === get_post_type( $post_id ) ? 'wp-page' : 'wp-post' );
		$page_template = (string) get_post_meta( $post_id, '_wp_page_template', true );

		update_post_meta( $post_id, self::BACKUP_META, [
			'edit_mode' => 'builder',
			'page_template' => $page_template,
			'replaced' => $converter->replaced,
			'time' => time(),
		] );

		self::write( $post_id, $elements, $settings, $type );

		if ( '' !== $page_template ) {
			update_post_meta( $post_id, '_wp_page_template', Converter::page_template( $page_template ) );
		}

		// The other builder stops showing the page; its data stays for "Back to ...".
		delete_post_meta( $post_id, Upstream::meta( 'edit_mode' ) );
		clean_post_cache( $post_id );

		return [ 'ok' => true, 'error' => '', 'replaced' => $converter->replaced ];
	}

	/** Puts a converted page back to the other builder (while its data is there). */
	public static function revert( int $post_id ): bool {
		$backup = get_post_meta( $post_id, self::BACKUP_META, true );

		if ( ! is_array( $backup ) || '' === (string) get_post_meta( $post_id, Upstream::meta( 'data' ), true ) ) {
			return false;
		}

		update_post_meta( $post_id, Upstream::meta( 'edit_mode' ), 'builder' );

		if ( '' !== (string) ( $backup['page_template'] ?? '' ) ) {
			update_post_meta( $post_id, '_wp_page_template', (string) $backup['page_template'] );
		}

		foreach ( [ '_refraction_edit_mode', '_refraction_data', '_refraction_page_settings', '_refraction_template_type', '_refraction_version', '_refraction_css', self::BACKUP_META ] as $key ) {
			delete_post_meta( $post_id, $key );
		}

		clean_post_cache( $post_id );

		return true;
	}

	/** Global styles and templates, once (templates added later are picked up too). */
	public static function prepare(): void {
		if ( ! get_option( self::KIT_OPTION ) ) {
			self::import_kit();
		}

		self::import_templates();
	}

	/** Their site settings (global colors and fonts, typography, buttons, layout, breakpoints) into Refraction's. */
	public static function import_kit(): bool {
		$old = (int) get_option( Upstream::option( 'active_kit' ) );
		$settings = $old ? get_post_meta( $old, Upstream::meta( 'page_settings' ), true ) : null;
		update_option( self::KIT_OPTION, time(), false );

		if ( ! is_array( $settings ) || ! $settings ) {
			return false;
		}

		$kit_id = (int) Plugin::$instance->kits_manager->get_active_id();

		if ( ! $kit_id ) {
			return false;
		}

		$current = get_post_meta( $kit_id, '_refraction_page_settings', true );
		$merged = array_merge( is_array( $current ) ? $current : [], self::converter( 0 )->page_settings( $settings ) );
		update_post_meta( $kit_id, '_refraction_page_settings', wp_slash( $merged ) );
		delete_post_meta( $kit_id, '_refraction_css' );
		Plugin::$instance->files_manager->clear_cache();

		return true;
	}

	/**
	 * Their templates as Refraction templates, with their display conditions and popup triggers. Ids are given out
	 * first, so templates that show other templates point at the converted ones.
	 *
	 * @return array<int,int> Their id => the new one, for the templates converted now.
	 */
	public static function import_templates(): array {
		$map = self::template_map();
		$new = [];

		foreach ( self::templates() as $old ) {
			if ( isset( $map[ $old ] ) && get_post( $map[ $old ] ) ) {
				continue;
			}

			$post = get_post( $old );
			$id = wp_insert_post( [
				'post_type' => Source_Local::CPT,
				'post_title' => $post->post_title,
				'post_status' => $post->post_status,
				'post_author' => $post->post_author,
				'post_date' => $post->post_date,
				'menu_order' => $post->menu_order,
			], true );

			if ( ! is_wp_error( $id ) ) {
				$map[ $old ] = (int) $id;
				$new[ $old ] = (int) $id;
			}
		}

		if ( ! $new ) {
			return [];
		}

		update_option( self::MAP_OPTION, $map, false );

		foreach ( $new as $old => $id ) {
			$data = json_decode( (string) get_post_meta( $old, Upstream::meta( 'data' ), true ), true );
			$converter = self::converter( $old, $map );
			$type = Converter::template_type( (string) get_post_meta( $old, Upstream::meta( 'template_type' ), true ) );
			$settings = get_post_meta( $old, Upstream::meta( 'page_settings' ), true );
			$settings = $converter->page_settings( is_array( $settings ) ? $settings : [] );

			if ( 'popup' === $type ) {
				$settings = array_merge( $settings, self::popup_triggers( $old ) );
			}

			self::write( $id, $converter->elements( is_array( $data ) ? $data : [] ), $settings, $type );
			wp_set_object_terms( $id, $type, Source_Local::TAXONOMY_TYPE_SLUG );
			update_post_meta( $id, self::BACKUP_META, [ 'from' => $old, 'replaced' => $converter->replaced, 'time' => time() ] );

			$rules = get_post_meta( $old, Upstream::meta( 'conditions' ), true );

			if ( in_array( $type, self::THEME_TYPES, true ) && is_array( $rules ) && $rules ) {
				$theme_builder = Plugin::$instance->modules_manager->get_modules( 'theme-builder' );

				if ( $theme_builder ) {
					$theme_builder->get_store()->save_rules( $id, $type, array_values( array_filter( $rules, 'is_string' ) ) );
				}
			}
		}

		Plugin::$instance->files_manager->clear_cache();

		return $new;
	}

	/** Their popup's triggers as Refraction's popup settings. */
	private static function popup_triggers( int $old ): array {
		$display = get_post_meta( $old, Upstream::meta( 'popup_display_settings' ), true );
		$t = is_array( $display ) && is_array( $display['triggers'] ?? null ) ? $display['triggers'] : [];
		$on = static fn( string $key ) => 'yes' === ( $t[ $key ] ?? '' );
		$number = static function ( string $key, $default ) use ( $t ) {
			$value = $t[ $key ] ?? $default;

			return (string) (int) ( is_array( $value ) ? ( $value['size'] ?? $default ) : $value );
		};
		$out = [];

		if ( $on( 'page_load' ) ) {
			$out += [ 'rp_trigger_load' => 'yes', 'rp_load_delay' => $number( 'page_load_delay', 0 ) ];
		}

		if ( $on( 'scrolling' ) ) {
			if ( 'up' === ( $t['scrolling_direction'] ?? 'down' ) ) {
				$out += [ 'rp_trigger_scroll_up' => 'yes' ];
			} else {
				$out += [ 'rp_trigger_scroll' => 'yes', 'rp_scroll_mode' => 'percent', 'rp_scroll_percent' => $number( 'scrolling_offset', 50 ) ];
			}
		}

		if ( $on( 'scrolling_to' ) && '' !== (string) ( $t['scrolling_to_selector'] ?? '' ) ) {
			$out += [ 'rp_trigger_scroll' => 'yes', 'rp_scroll_mode' => 'element', 'rp_scroll_selector' => (string) $t['scrolling_to_selector'] ];
		}

		if ( $on( 'inactivity' ) ) {
			$out += [ 'rp_trigger_idle' => 'yes', 'rp_idle_seconds' => $number( 'inactivity_time', 30 ) ];
		}

		if ( $on( 'exit_intent' ) ) {
			$out['rp_trigger_exit'] = 'yes';
		}

		return $out;
	}

	private static function write( int $id, array $elements, array $settings, string $type ): void {
		update_post_meta( $id, '_refraction_edit_mode', 'builder' );
		update_post_meta( $id, '_refraction_template_type', $type );
		update_post_meta( $id, '_refraction_version', REFRACTION_VERSION );
		update_post_meta( $id, '_refraction_data', wp_slash( (string) wp_json_encode( $elements ) ) );

		if ( $settings ) {
			update_post_meta( $id, '_refraction_page_settings', wp_slash( $settings ) );
		} else {
			delete_post_meta( $id, '_refraction_page_settings' );
		}

		delete_post_meta( $id, '_refraction_css' );
	}

	private static function converter( int $post_id, ?array $map = null ): Converter {
		$widgets = array_keys( (array) Plugin::$instance->widgets_manager->get_widget_types() );

		return new Converter( $widgets, static fn( array $element ) => self::snapshot( $element, $post_id ), $map ?? self::template_map() );
	}

	/**
	 * What an element of a widget Refraction lacks showed, drawn by the other builder while it is still active.
	 * Without it there is nothing to draw with, and the HTML widget says what was there.
	 */
	private static function snapshot( array $element, int $post_id ): string {
		$plugin = Upstream::plugin();

		if ( ! $plugin || empty( $plugin->elements_manager ) ) {
			return '';
		}

		$previous = $GLOBALS['post'] ?? null;
		$level = ob_get_level();

		try {
			if ( $post_id ) {
				$GLOBALS['post'] = get_post( $post_id ); // phpcs:ignore WordPress.WP.GlobalVariablesOverride.Prohibited
				setup_postdata( $GLOBALS['post'] );
			}

			$instance = $plugin->elements_manager->create_element_instance( $element );

			if ( ! $instance ) {
				return '';
			}

			ob_start();
			$instance->print_element();
			$html = (string) ob_get_clean();
		} catch ( \Throwable $e ) {
			$html = '';
		} finally {
			while ( ob_get_level() > $level ) {
				ob_end_clean();
			}

			$GLOBALS['post'] = $previous; // phpcs:ignore WordPress.WP.GlobalVariablesOverride.Prohibited
			wp_reset_postdata();
		}

		// Scripts of the add-on will not be there once it is removed.
		return trim( (string) preg_replace( '#<script\b[^>]*>.*?</script>#is', '', $html ) );
	}
}
