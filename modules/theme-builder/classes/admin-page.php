<?php
namespace Refraction\Modules\ThemeBuilder\Classes;

use Refraction\Core\Base\Document;
use Refraction\Plugin;
use Refraction\TemplateLibrary\Source_Local;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Refraction > Theme Builder: the Headers and Footers lists with their display conditions.
 */
class Admin_Page {

	const SLUG = 'refraction-theme-builder';
	const DELETE_ACTION = 'refraction_theme_builder_delete';

	private Conditions_Store $store;
	private Conditions_Manager $conditions;

	public function __construct( Conditions_Store $store, Conditions_Manager $conditions ) {
		$this->store = $store;
		$this->conditions = $conditions;

		add_action( 'admin_post_' . self::DELETE_ACTION, [ $this, 'handle_delete' ] );
		add_action( 'admin_enqueue_scripts', [ $this, 'enqueue_assets' ] );
	}

	public static function get_url( string $tab = '' ): string {
		$url = admin_url( 'admin.php?page=' . self::SLUG );

		return $tab ? add_query_arg( 'tab', $tab, $url ) : $url;
	}

	private function get_tabs(): array {
		return [
			Locations_Manager::HEADER => [
				'label' => esc_html__( 'Headers', 'refraction' ),
				'singular' => esc_html__( 'Header', 'refraction' ),
				'empty' => esc_html__( 'No header yet. Build one and choose where it appears.', 'refraction' ),
			],
			Locations_Manager::FOOTER => [
				'label' => esc_html__( 'Footers', 'refraction' ),
				'singular' => esc_html__( 'Footer', 'refraction' ),
				'empty' => esc_html__( 'No footer yet. Build one and choose where it appears.', 'refraction' ),
			],
		];
	}

	public function enqueue_assets( string $hook ): void {
		if ( false === strpos( $hook, self::SLUG ) ) {
			return;
		}

		$min = \Refraction\Utils::is_script_debug() ? '' : '.min';

		wp_enqueue_style( 'refraction-theme-builder-admin', REFRACTION_ASSETS_URL . 'css/modules/theme-builder/admin' . $min . '.css', [], REFRACTION_VERSION );
	}

	private function query_templates( string $type ): array {
		return get_posts( [
			'post_type' => Source_Local::CPT,
			'post_status' => [ 'publish', 'draft', 'pending', 'private', 'future' ],
			'posts_per_page' => 200,
			'no_found_rows' => true,
			'meta_key' => Document::TYPE_META_KEY, // phpcs:ignore WordPress.DB.SlowDBQuery.slow_db_query_meta_key
			'meta_value' => $type, // phpcs:ignore WordPress.DB.SlowDBQuery.slow_db_query_meta_value
			'orderby' => 'modified',
			'order' => 'DESC',
		] );
	}

	private function glyph( string $location ): string {
		$band = Locations_Manager::HEADER === $location
			? '<rect class="band" x="2" y="2" width="26" height="6" rx="1.5"/>'
			: '<rect class="band" x="2" y="22" width="26" height="6" rx="1.5"/>';

		return '<svg class="rtb-glyph" viewBox="0 0 30 30" width="30" height="30" aria-hidden="true" focusable="false"><rect class="page" x="1" y="1" width="28" height="28" rx="3"/>' . $band . '<path class="lines" d="M6 14h18M6 18h12"/></svg>';
	}

	public function render(): void {
		if ( ! current_user_can( 'edit_posts' ) ) {
			wp_die( esc_html__( 'Sorry, you are not allowed to access this page.', 'refraction' ), 403 );
		}

		$tabs = $this->get_tabs();
		$tab = isset( $_GET['tab'] ) ? sanitize_key( wp_unslash( $_GET['tab'] ) ) : Locations_Manager::HEADER; // phpcs:ignore WordPress.Security.NonceVerification.Recommended
		$tab = isset( $tabs[ $tab ] ) ? $tab : Locations_Manager::HEADER;
		$posts = $this->query_templates( $tab );
		$can_manage = current_user_can( 'manage_options' );
		$add_url = add_query_arg(
			[
				'post_type' => Source_Local::CPT,
				'refraction_library_type' => $tab,
			],
			admin_url( 'edit.php' )
		) . '#add_new';

		$counts = [];
		foreach ( array_keys( $tabs ) as $key ) {
			$counts[ $key ] = $key === $tab ? count( $posts ) : count( $this->query_templates( $key ) );
		}

		?>
		<div class="wrap rtb-wrap">
			<h1 class="wp-heading-inline"><?php echo esc_html__( 'Theme Builder', 'refraction' ); ?></h1>
			<a href="<?php echo esc_url( $add_url ); ?>" class="page-title-action">
				<?php
				/* translators: %s: template type, "Header" or "Footer". */
				echo esc_html( sprintf( __( 'Add New %s', 'refraction' ), $tabs[ $tab ]['singular'] ) );
				?>
			</a>
			<hr class="wp-header-end">

			<?php if ( isset( $_GET['deleted'] ) ) : // phpcs:ignore WordPress.Security.NonceVerification.Recommended ?>
				<div class="notice notice-success is-dismissible"><p><?php echo esc_html__( 'Template moved to the trash.', 'refraction' ); ?></p></div>
			<?php endif; ?>

			<p class="rtb-intro">
				<?php echo esc_html__( 'Build the header and footer of your site with Refraction, then choose where each one appears. When no template matches a page, your theme shows its own.', 'refraction' ); ?>
			</p>

			<nav class="rtb-tabs" aria-label="<?php echo esc_attr__( 'Template type', 'refraction' ); ?>">
				<?php foreach ( $tabs as $key => $tab_data ) : ?>
					<a class="rtb-tab<?php echo $key === $tab ? ' is-active' : ''; ?>" href="<?php echo esc_url( self::get_url( $key ) ); ?>"<?php echo $key === $tab ? ' aria-current="page"' : ''; ?>>
						<?php echo $this->glyph( $key ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Static SVG. ?>
						<span class="rtb-tab-label"><?php echo esc_html( $tab_data['label'] ); ?></span>
						<span class="rtb-tab-count"><?php echo esc_html( (string) $counts[ $key ] ); ?></span>
					</a>
				<?php endforeach; ?>
			</nav>

			<?php if ( ! $posts ) : ?>
				<div class="rtb-empty">
					<?php echo $this->glyph( $tab ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Static SVG. ?>
					<p><?php echo esc_html( $tabs[ $tab ]['empty'] ); ?></p>
					<a href="<?php echo esc_url( $add_url ); ?>" class="button button-primary">
						<?php
						/* translators: %s: template type, "Header" or "Footer". */
						echo esc_html( sprintf( __( 'Add New %s', 'refraction' ), $tabs[ $tab ]['singular'] ) );
						?>
					</a>
				</div>
			<?php else : ?>
				<table class="wp-list-table widefat fixed striped rtb-table">
					<thead>
						<tr>
							<th scope="col" class="column-title"><?php echo esc_html__( 'Title', 'refraction' ); ?></th>
							<th scope="col" class="column-conditions"><?php echo esc_html__( 'Appears on', 'refraction' ); ?></th>
							<th scope="col" class="column-status"><?php echo esc_html__( 'Status', 'refraction' ); ?></th>
							<th scope="col" class="column-modified"><?php echo esc_html__( 'Last modified', 'refraction' ); ?></th>
						</tr>
					</thead>
					<tbody>
						<?php foreach ( $posts as $post ) : ?>
							<?php $this->render_row( $post, $tab, $can_manage ); ?>
						<?php endforeach; ?>
					</tbody>
				</table>
			<?php endif; ?>
		</div>
		<?php
	}

	private function render_row( \WP_Post $post, string $tab, bool $can_manage ): void {
		$document = Plugin::$instance->documents->get( $post->ID );
		$edit_url = $document ? $document->get_edit_url() : '';
		$rules = $this->store->get_rules( $post->ID );
		$title = '' !== $post->post_title ? $post->post_title : esc_html__( '(no title)', 'refraction' );
		$is_live = 'publish' === $post->post_status;
		$lines = $this->conditions->describe( $rules );
		$has_include = (bool) array_filter( $rules, fn( $rule ) => 0 === strpos( $rule, 'include/' ) );
		$status = get_post_status_object( $post->post_status );

		?>
		<tr>
			<td class="column-title has-row-actions">
				<strong>
					<?php if ( $edit_url && current_user_can( 'edit_post', $post->ID ) ) : ?>
						<a class="row-title" href="<?php echo esc_url( $edit_url ); ?>"><?php echo esc_html( $title ); ?></a>
					<?php else : ?>
						<?php echo esc_html( $title ); ?>
					<?php endif; ?>
				</strong>
				<div class="row-actions">
					<?php if ( $edit_url && current_user_can( 'edit_post', $post->ID ) ) : ?>
						<span class="edit"><a href="<?php echo esc_url( $edit_url ); ?>"><?php echo esc_html__( 'Edit with Refraction', 'refraction' ); ?></a></span>
					<?php endif; ?>
					<?php if ( current_user_can( 'delete_post', $post->ID ) ) : ?>
						<?php
						$delete_url = wp_nonce_url(
							add_query_arg(
								[
									'action' => self::DELETE_ACTION,
									'post' => $post->ID,
									'tab' => $tab,
								],
								admin_url( 'admin-post.php' )
							),
							self::DELETE_ACTION . '_' . $post->ID
						);
						?>
						<?php if ( current_user_can( 'edit_post', $post->ID ) ) : ?> | <?php endif; ?>
						<span class="trash"><a class="submitdelete" href="<?php echo esc_url( $delete_url ); ?>"><?php echo esc_html__( 'Delete', 'refraction' ); ?></a></span>
					<?php endif; ?>
				</div>
			</td>
			<td class="column-conditions">
				<?php if ( ! $has_include ) : ?>
					<span class="rtb-chip is-none"><?php echo esc_html__( 'Not displayed anywhere', 'refraction' ); ?></span>
				<?php endif; ?>
				<?php foreach ( $lines as $index => $line ) : ?>
					<?php $is_exclude = 0 === strpos( $rules[ $index ] ?? '', 'exclude/' ); ?>
					<span class="rtb-chip<?php echo $is_exclude ? ' is-exclude' : ''; ?>"><?php echo esc_html( $line ); ?></span>
				<?php endforeach; ?>
			</td>
			<td class="column-status">
				<span class="rtb-status<?php echo $is_live ? ' is-live' : ''; ?>"><?php echo esc_html( $status ? $status->label : $post->post_status ); ?></span>
				<?php if ( ! $is_live ) : ?>
					<span class="rtb-status-note"><?php echo esc_html__( 'Not shown until published', 'refraction' ); ?></span>
				<?php endif; ?>
			</td>
			<td class="column-modified"><?php echo esc_html( mysql2date( get_option( 'date_format' ), $post->post_modified ) ); ?></td>
		</tr>
		<?php
	}

	public function handle_delete(): void {
		$post_id = isset( $_GET['post'] ) ? absint( $_GET['post'] ) : 0;

		check_admin_referer( self::DELETE_ACTION . '_' . $post_id );

		$post = get_post( $post_id );

		if ( ! $post || Source_Local::CPT !== $post->post_type || ! current_user_can( 'delete_post', $post_id ) ) {
			wp_die( esc_html__( 'You are not allowed to delete this template.', 'refraction' ), 403 );
		}

		wp_trash_post( $post_id );

		$tab = isset( $_GET['tab'] ) ? sanitize_key( wp_unslash( $_GET['tab'] ) ) : '';

		wp_safe_redirect( add_query_arg( 'deleted', 1, self::get_url( $tab ) ) );
		exit;
	}
}
