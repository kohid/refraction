<?php
namespace Refraction\Modules\Popups\Classes;

use Refraction\Modules\Popups\Documents\Popup;
use Refraction\Modules\ThemeBuilder\Classes\Conditions_Manager;
use Refraction\Modules\ThemeBuilder\Classes\Conditions_Store;
use Refraction\Modules\ThemeBuilder\Classes\Locations_Manager;
use Refraction\Plugin;
use Refraction\TemplateLibrary\Source_Local;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Finds the popups for this request and prints them in the footer.
 *
 * A popup is printed only when it is published, its display conditions match, the visitor audience and the date
 * range allow it. Nothing at all (no markup, no script, no style) is added to pages without a match.
 */
class Popup_Manager {

	const SCRIPT = 'refraction-popups-frontend';
	const STYLE = 'refraction-popups-frontend';
	const MAX_POPUPS = 12;

	private Conditions_Store $store;
	private Conditions_Manager $conditions;
	private Locations_Manager $locations;

	/** @var array<int, string> Popup ID => markup, ordered by priority. */
	private array $markup = [];

	private bool $collected = false;

	public function __construct( Conditions_Store $store, Conditions_Manager $conditions, Locations_Manager $locations ) {
		$this->store = $store;
		$this->conditions = $conditions;
		$this->locations = $locations;

		add_action( 'wp_enqueue_scripts', [ $this, 'collect' ], 30 );
		add_action( 'wp_footer', [ $this, 'print_markup' ], 5 );
	}

	/** Whether popups may be printed on this request at all. */
	public function is_active_request(): bool {
		if ( is_customize_preview() || is_preview() || is_singular( Source_Local::CPT ) || Plugin::$instance->preview->is_preview_mode() ) {
			return false;
		}

		return $this->locations->is_active_request();
	}

	/** IDs of the popups that apply to this request, highest priority first. */
	public function find_matching(): array {
		$visitor = wp_get_current_user();
		$logged_in = is_user_logged_in();
		$roles = $logged_in ? array_map( 'strval', (array) $visitor->roles ) : [];
		$now = time();
		$priorities = [];

		foreach ( $this->store->get_candidates( Popup::TYPE, Source_Local::CPT ) as $id => $candidate ) {
			if ( null === $this->conditions->match( $candidate['rules'] ) ) {
				continue;
			}

			$document = Plugin::$instance->documents->get( $id );

			if ( ! $document instanceof Popup ) {
				continue;
			}

			$config = $document->get_popup_config();

			if ( ! Popup_Rules::audience_allows( $config['audience'], $logged_in, $roles ) || ! Popup_Rules::date_range_allows( $config['schedule'], $now ) ) {
				continue;
			}

			$priorities[ $id ] = $config['priority'];
		}

		return array_slice( Popup_Rules::sort_by_priority( $priorities ), 0, self::MAX_POPUPS );
	}

	/** Renders the matching popups while styles can still go into the head. */
	public function collect(): void {
		if ( $this->collected || ! $this->is_active_request() ) {
			return;
		}

		$this->collected = true;

		$ids = $this->find_matching();

		if ( $ids ) {
			// Before the popups' own CSS files, so a designer's settings win over the base styles.
			wp_enqueue_style( self::STYLE );
		}

		foreach ( $ids as $id ) {
			$document = Plugin::$instance->documents->get( $id );

			if ( ! $document instanceof Popup ) {
				continue;
			}

			$content = Plugin::$instance->frontend->get_builder_content_for_display( $id );

			if ( '' === trim( $content ) ) {
				continue;
			}

			$this->markup[ $id ] = Popup_Renderer::live( $document, $document->get_popup_config(), $content );
		}

		if ( $this->markup ) {
			wp_enqueue_style( self::STYLE );
			wp_enqueue_script( self::SCRIPT );
			wp_localize_script( self::SCRIPT, 'refractionPopups', $this->get_script_config() );
		}
	}

	public function print_markup(): void {
		foreach ( $this->markup as $html ) {
			echo $html; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Built in Popup_Renderer.
		}
	}

	/** @return int[] */
	public function get_printed_ids(): array {
		return array_keys( $this->markup );
	}

	private function get_script_config(): array {
		$breakpoints = Plugin::$instance->breakpoints->get_breakpoints_config();

		return [
			'tablet' => (int) ( $breakpoints['tablet']['value'] ?? 1024 ),
			'mobile' => (int) ( $breakpoints['mobile']['value'] ?? 767 ),
		];
	}
}
