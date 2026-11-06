<?php
namespace Refraction\Modules\Migration\Classes;

use Refraction\Modules\Migration\Module;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Where the conversion is started: "Convert to Refraction" under each page built with the other builder (and "Back to
 * ..." under a converted one), the same as a bulk action in the lists of posts, and Refraction > Move from ... to
 * convert the whole site at once, with what is left to do.
 */
class Admin {

	const ACTION = 'refraction_migrate';
	const SLUG = 'refraction-migration';
	const BATCH = 15;

	public function __construct() {
		add_filter( 'page_row_actions', [ $this, 'row_actions' ], 30, 2 );
		add_filter( 'post_row_actions', [ $this, 'row_actions' ], 30, 2 );
		add_action( 'admin_post_' . self::ACTION, [ $this, 'handle' ] );
		add_action( 'admin_init', [ $this, 'bulk_actions' ] );
		add_action( 'admin_notices', [ $this, 'notice' ] );
	}

	public static function capability(): string {
		return 'edit_others_posts';
	}

	public function row_actions( $actions, $post ) {
		if ( ! $post instanceof \WP_Post || ! current_user_can( 'edit_post', $post->ID ) ) {
			return $actions;
		}

		if ( Importer::has_data( $post->ID ) ) {
			$actions['refraction_convert'] = sprintf( '<a href="%s" class="refraction-convert">%s</a>', esc_url( self::url( 'one', $post->ID ) ), esc_html__( 'Convert to Refraction', 'refraction' ) );
		} elseif ( Importer::is_converted( $post->ID ) && '' !== (string) get_post_meta( $post->ID, Upstream::meta( 'data' ), true ) && Upstream::is_active() ) {
			/* translators: %s: the other page builder's name. */
			$actions['refraction_revert'] = sprintf( '<a href="%s" class="refraction-revert">%s</a>', esc_url( self::url( 'undo', $post->ID ) ), esc_html( sprintf( __( 'Back to %s', 'refraction' ), Upstream::label() ) ) );
		}

		return $actions;
	}

	public static function url( string $do, int $post_id = 0 ): string {
		return wp_nonce_url( add_query_arg( array_filter( [ 'action' => self::ACTION, 'do' => $do, 'post' => $post_id ?: null ] ), admin_url( 'admin-post.php' ) ), self::ACTION );
	}

	public function bulk_actions(): void {
		foreach ( Importer::post_types() as $type ) {
			add_filter( "bulk_actions-edit-{$type}", [ $this, 'add_bulk_action' ] );
			add_filter( "handle_bulk_actions-edit-{$type}", [ $this, 'handle_bulk_action' ], 10, 3 );
		}
	}

	public function add_bulk_action( $actions ) {
		if ( Importer::has_anything() ) {
			$actions['refraction_convert'] = esc_html__( 'Convert to Refraction', 'refraction' );
		}

		return $actions;
	}

	public function handle_bulk_action( $redirect, $action, $ids ) {
		if ( 'refraction_convert' !== $action ) {
			return $redirect;
		}

		$this->remember( $this->convert( array_map( 'intval', (array) $ids ) ) );

		return $redirect;
	}

	/** One, an undo, or the whole site (in batches: each request converts some and goes on to the next). */
	public function handle(): void {
		check_admin_referer( self::ACTION );
		$do = isset( $_GET['do'] ) ? sanitize_key( wp_unslash( $_GET['do'] ) ) : ''; // phpcs:ignore WordPress.Security.NonceVerification.Recommended -- Checked above.
		$post_id = isset( $_GET['post'] ) ? absint( $_GET['post'] ) : 0; // phpcs:ignore WordPress.Security.NonceVerification.Recommended -- Checked above.
		$back = wp_get_referer() ?: admin_url( 'edit.php?post_type=page' );

		if ( 'all' === $do ) {
			if ( ! current_user_can( self::capability() ) ) {
				wp_die( esc_html__( 'Sorry, you are not allowed to do that.', 'refraction' ), 403 );
			}

			$done = $this->convert( Importer::pending( self::BATCH ) );
			$this->remember( $done, true );

			if ( $done['ok'] && Importer::pending( 1 ) ) {
				// More to do: the next batch, in a new request.
				wp_safe_redirect( self::url( 'all' ) );
				exit;
			}

			wp_safe_redirect( admin_url( 'admin.php?page=' . self::SLUG . '&done=1' ) );
			exit;
		}

		if ( ! $post_id || ! current_user_can( 'edit_post', $post_id ) ) {
			wp_die( esc_html__( 'Sorry, you are not allowed to do that.', 'refraction' ), 403 );
		}

		if ( 'undo' === $do ) {
			$this->remember( [ 'ok' => 0, 'failed' => [], 'replaced' => [], 'undone' => Importer::revert( $post_id ) ? 1 : 0 ] );
		} else {
			$this->remember( $this->convert( [ $post_id ] ) );
		}

		wp_safe_redirect( $back );
		exit;
	}

	/** @return array{ok:int,failed:int[],replaced:array<int,array<string,int>>} */
	private function convert( array $ids ): array {
		$result = [ 'ok' => 0, 'failed' => [], 'replaced' => [] ];

		foreach ( $ids as $id ) {
			if ( ! current_user_can( 'edit_post', $id ) ) {
				continue;
			}

			$done = Importer::convert_post( $id );

			if ( $done['ok'] ) {
				$result['ok']++;

				if ( $done['replaced'] ) {
					$result['replaced'][ $id ] = $done['replaced'];
				}
			} elseif ( 'not-built' !== $done['error'] ) {
				$result['failed'][] = $id;
			}
		}

		return $result;
	}

	/** The result, for the notice on the next page (added up over the batches of a whole-site run). */
	private function remember( array $result, bool $add = false ): void {
		$key = 'refraction_migration_notice_' . get_current_user_id();
		$before = $add ? get_transient( $key ) : false;

		if ( is_array( $before ) ) {
			$result['ok'] += (int) ( $before['ok'] ?? 0 );
			$result['failed'] = array_merge( (array) ( $before['failed'] ?? [] ), $result['failed'] );
			$result['replaced'] = (array) ( $before['replaced'] ?? [] ) + $result['replaced'];
		}

		set_transient( $key, $result, 10 * MINUTE_IN_SECONDS );
	}

	public function notice(): void {
		$key = 'refraction_migration_notice_' . get_current_user_id();
		$result = get_transient( $key );

		if ( ! is_array( $result ) ) {
			return;
		}

		delete_transient( $key );

		if ( ! empty( $result['undone'] ) ) {
			/* translators: %s: the other page builder's name. */
			echo '<div class="notice notice-success is-dismissible"><p>' . esc_html( sprintf( __( 'The page is back to %s.', 'refraction' ), Upstream::label() ) ) . '</p></div>';

			return;
		}

		if ( $result['ok'] ) {
			/* translators: %d: number of pages. */
			$text = sprintf( _n( '%d page converted to Refraction.', '%d pages converted to Refraction.', (int) $result['ok'], 'refraction' ), (int) $result['ok'] );
			echo '<div class="notice notice-success is-dismissible"><p>' . esc_html( $text ) . '</p>' . self::replaced_list( (array) $result['replaced'] ) . '</div>'; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Built from escaped parts.
		}

		if ( $result['failed'] ) {
			$titles = implode( ', ', array_map( static fn( $id ) => get_the_title( $id ), (array) $result['failed'] ) );
			/* translators: %s: page titles. */
			echo '<div class="notice notice-error"><p>' . esc_html( sprintf( __( 'These pages could not be read and were left as they are: %s', 'refraction' ), $titles ) ) . '</p></div>';
		}
	}

	/** The pages with widgets kept as HTML, linking to their editor. */
	public static function replaced_list( array $replaced ): string {
		if ( ! $replaced ) {
			return '';
		}

		$items = '';

		foreach ( $replaced as $post_id => $widgets ) {
			$names = [];

			foreach ( (array) $widgets as $name => $count ) {
				$names[] = $name . ( $count > 1 ? ' ×' . (int) $count : '' );
			}

			$items .= sprintf( '<li><a href="%s">%s</a>: %s</li>', esc_url( admin_url( 'post.php?post=' . (int) $post_id . '&action=refraction' ) ), esc_html( get_the_title( (int) $post_id ) ), esc_html( implode( ', ', $names ) ) );
		}

		return '<p>' . esc_html__( 'Some widgets come from add-on plugins Refraction has no version of. They were kept as HTML showing what they showed (without their scripts): replace them with Refraction widgets when you can.', 'refraction' ) . '</p><ul style="list-style:disc;margin-left:20px">' . $items . '</ul>';
	}

	/** Refraction > Move from ...: the whole site at once. */
	public function render(): void {
		$pending = Importer::pending();
		$converted = Importer::converted();
		$templates = Importer::templates();
		$map = Importer::template_map();
		$templates_left = array_filter( $templates, static fn( $id ) => ! isset( $map[ $id ] ) );
		$kit = (bool) get_option( Importer::KIT_OPTION );
		$label = Upstream::label();
		$replaced = [];

		foreach ( array_merge( $converted, array_values( $map ) ) as $id ) {
			$backup = get_post_meta( $id, Importer::BACKUP_META, true );

			if ( is_array( $backup ) && ! empty( $backup['replaced'] ) ) {
				$replaced[ $id ] = $backup['replaced'];
			}
		}
		?>
		<div class="wrap refraction-migration">
			<?php /* translators: %s: the other page builder's name. */ ?>
			<h1><?php echo esc_html( sprintf( __( 'Move from %s', 'refraction' ), $label ) ); ?></h1>
			<?php /* translators: %s: the other page builder's name. */ ?>
			<p style="max-width:760px"><?php echo esc_html( sprintf( __( 'Converts the pages, posts and templates built with %s into Refraction, with the site\'s global colors and fonts. Pages keep their content, layout and styles. %s\'s own data is kept: while it is installed, "Back to %s" under a page undoes its conversion. You can also convert one page at a time with "Convert to Refraction" under it in Pages.', 'refraction' ), $label, $label, $label ) ); ?></p>
			<table class="widefat striped" style="max-width:760px">
				<tbody>
					<tr><th><?php esc_html_e( 'Global colors, fonts and layout', 'refraction' ); ?></th><td><?php echo $kit ? esc_html__( 'Moved', 'refraction' ) : esc_html__( 'Moved with the first page', 'refraction' ); ?></td></tr>
					<?php /* translators: 1: templates converted, 2: all templates. */ ?>
					<tr><th><?php esc_html_e( 'Templates (headers, footers, popups, sections...)', 'refraction' ); ?></th><td><?php echo esc_html( sprintf( __( '%1$d of %2$d converted', 'refraction' ), count( $templates ) - count( $templates_left ), count( $templates ) ) ); ?></td></tr>
					<?php /* translators: 1: pages left, 2: pages converted. */ ?>
					<tr><th><?php esc_html_e( 'Pages and posts', 'refraction' ); ?></th><td><?php echo esc_html( sprintf( __( '%1$d to convert, %2$d converted', 'refraction' ), count( $pending ), count( $converted ) ) ); ?></td></tr>
				</tbody>
			</table>
			<?php if ( $pending || $templates_left ) : ?>
				<p><a class="button button-primary button-hero" href="<?php echo esc_url( self::url( 'all' ) ); ?>"><?php esc_html_e( 'Convert everything', 'refraction' ); ?></a></p>
			<?php else : ?>
				<div class="notice notice-success inline" style="max-width:740px">
					<?php /* translators: %s: the other page builder's name. */ ?>
					<p><strong><?php esc_html_e( 'Everything is converted.', 'refraction' ); ?></strong> <?php echo esc_html( sprintf( __( 'Check your pages, then deactivate and delete %s, its Pro version and its add-ons under Plugins. Refraction keeps showing the site.', 'refraction' ), $label ) ); ?> <a href="<?php echo esc_url( admin_url( 'plugins.php' ) ); ?>"><?php esc_html_e( 'Go to Plugins', 'refraction' ); ?></a></p>
				</div>
			<?php endif; ?>
			<?php if ( $replaced ) : ?>
				<h2><?php esc_html_e( 'Widgets kept as HTML', 'refraction' ); ?></h2>
				<?php echo self::replaced_list( $replaced ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Built from escaped parts. ?>
			<?php endif; ?>
			<h2><?php esc_html_e( 'Good to know', 'refraction' ); ?></h2>
			<ul style="list-style:disc;margin-left:20px;max-width:760px">
				<?php /* translators: %s: the other page builder's name. */ ?>
				<li><?php echo esc_html( sprintf( __( 'Custom fonts and custom icon sets uploaded to %s are not moved: upload them again under Refraction > Custom Fonts and Custom Icons (with the same names, pages pick them up).', 'refraction' ), $label ) ); ?></li>
				<li><?php esc_html_e( 'Form submissions already received stay where they are; new ones are kept by Refraction\'s forms.', 'refraction' ); ?></li>
				<li><?php esc_html_e( 'Popups keep their display conditions and their page load, scroll, inactivity and exit triggers.', 'refraction' ); ?></li>
			</ul>
		</div>
		<?php
	}
}
