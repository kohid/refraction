<?php
namespace Refraction\Modules\CustomCode\Classes;

use Refraction\Core\Utils\Icons;
use Refraction\Modules\CustomCode\Module;
use Refraction\Modules\ThemeBuilder\Classes\Rule;
use Refraction\Plugin;
use Refraction\Utils;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/** Refraction > Custom Code: the snippet list and the snippet form. */
class Admin_Page {

	const SLUG = 'refraction-custom-code';
	const SAVE = 'refraction_custom_code_save';
	const TOGGLE = 'refraction_custom_code_toggle';
	const DELETE = 'refraction_custom_code_delete';

	private Snippets $snippets;

	public function __construct( Snippets $snippets ) {
		$this->snippets = $snippets;

		add_action( 'admin_post_' . self::SAVE, [ $this, 'handle_save' ] );
		add_action( 'admin_post_' . self::TOGGLE, [ $this, 'handle_toggle' ] );
		add_action( 'admin_post_' . self::DELETE, [ $this, 'handle_delete' ] );
		add_action( 'admin_enqueue_scripts', [ $this, 'enqueue_assets' ] );
	}

	public static function url( array $args = [] ): string {
		return add_query_arg( $args, admin_url( 'admin.php?page=' . self::SLUG ) );
	}

	private function guard(): void {
		if ( ! Module::can_manage() ) {
			wp_die( esc_html__( 'Only administrators who can use unfiltered HTML may manage custom code.', 'refraction' ), 403 );
		}
	}

	private function types(): array {
		return [
			'html' => esc_html__( 'HTML', 'refraction' ),
			'js' => esc_html__( 'JavaScript', 'refraction' ),
			'css' => esc_html__( 'CSS', 'refraction' ),
		];
	}

	private function locations(): array {
		return [
			'head' => esc_html__( 'Head (before </head>)', 'refraction' ),
			'body_start' => esc_html__( 'Body start (after <body>)', 'refraction' ),
			'body_end' => esc_html__( 'Body end (footer)', 'refraction' ),
		];
	}

	public function enqueue_assets( string $hook ): void {
		if ( false === strpos( $hook, self::SLUG ) || ! Module::can_manage() ) {
			return;
		}

		$min = Utils::is_script_debug() ? '' : '.min';

		wp_enqueue_style( 'refraction-custom-code-admin', REFRACTION_ASSETS_URL . 'css/modules/custom-code/admin' . $min . '.css', [], REFRACTION_VERSION );

		// phpcs:ignore WordPress.Security.NonceVerification.Recommended
		if ( ! isset( $_GET['edit'] ) ) {
			return;
		}

		$editors = [];

		foreach ( [ 'html' => 'text/html', 'js' => 'application/javascript', 'css' => 'text/css' ] as $type => $mime ) {
			$editors[ $type ] = wp_enqueue_code_editor( [ 'type' => $mime ] );
		}

		wp_enqueue_script( 'refraction-custom-code-admin', REFRACTION_ASSETS_URL . 'js/custom-code-admin' . $min . '.js', [ 'wp-theme-plugin-editor', 'wp-i18n' ], REFRACTION_VERSION, true );
		wp_set_script_translations( 'refraction-custom-code-admin', 'refraction' );

		$theme_builder = Plugin::$instance->modules_manager->get_modules( 'theme-builder' );

		wp_localize_script(
			'refraction-custom-code-admin',
			'refractionCustomCode',
			[
				'editors' => $editors,
				'rules' => $theme_builder ? $theme_builder->get_conditions_config() : [ 'conditions' => [], 'canEdit' => false ],
			]
		);
	}

	public function render(): void {
		$this->guard();

		// phpcs:ignore WordPress.Security.NonceVerification.Recommended
		if ( isset( $_GET['edit'] ) ) {
			$this->render_form( absint( $_GET['edit'] ) );
			return;
		}

		$this->render_list();
	}

	private function notice(): void {
		// phpcs:disable WordPress.Security.NonceVerification.Recommended
		$messages = [
			'saved' => esc_html__( 'Snippet saved.', 'refraction' ),
			'deleted' => esc_html__( 'Snippet deleted.', 'refraction' ),
			'toggled' => esc_html__( 'Snippet status changed.', 'refraction' ),
		];
		$key = isset( $_GET['done'] ) ? sanitize_key( wp_unslash( $_GET['done'] ) ) : '';
		// phpcs:enable

		if ( isset( $messages[ $key ] ) ) {
			echo '<div class="notice notice-success is-dismissible"><p>' . esc_html( $messages[ $key ] ) . '</p></div>';
		}
	}

	private function render_list(): void {
		$posts = $this->snippets->all();
		$manager = Plugin::$instance->modules_manager->get_modules( 'theme-builder' )->get_conditions_manager();
		$types = $this->types();
		$locations = $this->locations();

		?>
		<div class="wrap rcc-wrap">
			<h1 class="wp-heading-inline"><?php echo esc_html__( 'Custom Code', 'refraction' ); ?></h1>
			<a href="<?php echo esc_url( self::url( [ 'edit' => 0 ] ) ); ?>" class="page-title-action"><?php echo esc_html__( 'Add New', 'refraction' ); ?></a>
			<hr class="wp-header-end">
			<?php $this->notice(); ?>

			<p class="rcc-intro"><?php echo esc_html__( 'Add HTML, JavaScript or CSS to the head, the top of the body or the footer, on the pages you choose. Snippets run on the front end for every visitor of those pages, never in the admin or the editor.', 'refraction' ); ?></p>

			<?php if ( defined( Module::KILL_SWITCH ) && constant( Module::KILL_SWITCH ) ) : ?>
				<div class="notice notice-warning inline"><p><?php echo esc_html( sprintf( /* translators: %s: constant name. */ __( 'All snippets are turned off because %s is defined.', 'refraction' ), Module::KILL_SWITCH ) ); ?></p></div>
			<?php endif; ?>

			<?php if ( ! $posts ) : ?>
				<div class="rcc-empty">
					<?php echo Icons::svg( 'code', [ 'size' => 36 ] ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Bundled SVG. ?>
					<p><?php echo esc_html__( 'No snippets yet. Add an analytics tag, a verification meta tag or a few lines of CSS and choose where they load.', 'refraction' ); ?></p>
					<a href="<?php echo esc_url( self::url( [ 'edit' => 0 ] ) ); ?>" class="button button-primary"><?php echo esc_html__( 'Add New', 'refraction' ); ?></a>
				</div>
			<?php else : ?>
				<table class="wp-list-table widefat fixed striped rcc-table">
					<thead>
						<tr>
							<th scope="col" class="column-title"><?php echo esc_html__( 'Title', 'refraction' ); ?></th>
							<th scope="col" class="column-where"><?php echo esc_html__( 'Location', 'refraction' ); ?></th>
							<th scope="col" class="column-conditions"><?php echo esc_html__( 'Appears on', 'refraction' ); ?></th>
							<th scope="col" class="column-status"><?php echo esc_html__( 'Status', 'refraction' ); ?></th>
						</tr>
					</thead>
					<tbody>
					<?php foreach ( $posts as $post ) : ?>
						<?php
						$s = $this->snippets->describe( $post );
						$lines = $manager->describe( $s['rules'] );
						$has_include = (bool) array_filter( $s['rules'], static fn( $r ) => 0 === strpos( $r, 'include/' ) );
						$title = '' !== $s['title'] ? $s['title'] : esc_html__( '(no title)', 'refraction' );
						$toggle = wp_nonce_url( add_query_arg( [ 'action' => self::TOGGLE, 'snippet' => $s['id'] ], admin_url( 'admin-post.php' ) ), self::TOGGLE . $s['id'] );
						$delete = wp_nonce_url( add_query_arg( [ 'action' => self::DELETE, 'snippet' => $s['id'] ], admin_url( 'admin-post.php' ) ), self::DELETE . $s['id'] );
						?>
						<tr>
							<td class="column-title has-row-actions">
								<strong><a class="row-title" href="<?php echo esc_url( self::url( [ 'edit' => $s['id'] ] ) ); ?>"><?php echo esc_html( $title ); ?></a></strong>
								<span class="rcc-type is-<?php echo esc_attr( $s['type'] ); ?>"><?php echo esc_html( $types[ $s['type'] ] ); ?></span>
								<div class="row-actions">
									<span class="edit"><a href="<?php echo esc_url( self::url( [ 'edit' => $s['id'] ] ) ); ?>"><?php echo esc_html__( 'Edit', 'refraction' ); ?></a> | </span>
									<span class="trash"><a class="submitdelete" href="<?php echo esc_url( $delete ); ?>"><?php echo esc_html__( 'Delete', 'refraction' ); ?></a></span>
								</div>
							</td>
							<td class="column-where"><?php echo esc_html( $locations[ $s['location'] ] ); ?></td>
							<td class="column-conditions">
								<?php if ( ! $has_include ) : ?>
									<span class="rcc-chip is-none"><?php echo esc_html__( 'Not displayed anywhere', 'refraction' ); ?></span>
								<?php endif; ?>
								<?php foreach ( $lines as $i => $line ) : ?>
									<span class="rcc-chip<?php echo 0 === strpos( $s['rules'][ $i ] ?? '', 'exclude/' ) ? ' is-exclude' : ''; ?>"><?php echo esc_html( $line ); ?></span>
								<?php endforeach; ?>
							</td>
							<td class="column-status">
								<a class="rcc-switch<?php echo $s['active'] ? ' is-on' : ''; ?>" role="switch" aria-checked="<?php echo $s['active'] ? 'true' : 'false'; ?>" href="<?php echo esc_url( $toggle ); ?>">
									<span class="rcc-switch-knob"></span>
									<span class="rcc-switch-text"><?php echo esc_html( $s['active'] ? __( 'Active', 'refraction' ) : __( 'Inactive', 'refraction' ) ); ?></span>
								</a>
							</td>
						</tr>
					<?php endforeach; ?>
					</tbody>
				</table>
			<?php endif; ?>
		</div>
		<?php
	}

	private function render_form( int $id ): void {
		$post = $id ? get_post( $id ) : null;

		if ( $id && ( ! $post || Snippets::POST_TYPE !== $post->post_type ) ) {
			wp_die( esc_html__( 'Snippet not found.', 'refraction' ), 404 );
		}

		$s = $post ? $this->snippets->describe( $post ) : [
			'id' => 0, 'title' => '', 'code' => '', 'active' => true, 'location' => 'head', 'type' => 'html', 'priority' => 10, 'rules' => [ 'include/general' ],
		];

		?>
		<div class="wrap rcc-wrap">
			<h1><?php echo esc_html( $id ? __( 'Edit snippet', 'refraction' ) : __( 'Add snippet', 'refraction' ) ); ?></h1>
			<form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>" class="rcc-form">
				<input type="hidden" name="action" value="<?php echo esc_attr( self::SAVE ); ?>">
				<input type="hidden" name="snippet" value="<?php echo esc_attr( (string) $s['id'] ); ?>">
				<?php wp_nonce_field( self::SAVE . $s['id'] ); ?>

				<label class="rcc-field rcc-title">
					<span><?php echo esc_html__( 'Title', 'refraction' ); ?></span>
					<input type="text" name="title" value="<?php echo esc_attr( $s['title'] ); ?>" placeholder="<?php echo esc_attr__( 'For example: Analytics tag', 'refraction' ); ?>">
				</label>

				<div class="rcc-row">
					<label class="rcc-field">
						<span><?php echo esc_html__( 'Type', 'refraction' ); ?></span>
						<select name="type" id="rcc-type">
							<?php foreach ( $this->types() as $value => $label ) : ?>
								<option value="<?php echo esc_attr( $value ); ?>"<?php selected( $s['type'], $value ); ?>><?php echo esc_html( $label ); ?></option>
							<?php endforeach; ?>
						</select>
					</label>
					<label class="rcc-field">
						<span><?php echo esc_html__( 'Location', 'refraction' ); ?></span>
						<select name="location">
							<?php foreach ( $this->locations() as $value => $label ) : ?>
								<option value="<?php echo esc_attr( $value ); ?>"<?php selected( $s['location'], $value ); ?>><?php echo esc_html( $label ); ?></option>
							<?php endforeach; ?>
						</select>
					</label>
					<label class="rcc-field rcc-priority">
						<span><?php echo esc_html__( 'Priority', 'refraction' ); ?></span>
						<input type="number" name="priority" min="1" max="999" value="<?php echo esc_attr( (string) $s['priority'] ); ?>">
						<small><?php echo esc_html__( 'Lower numbers print first.', 'refraction' ); ?></small>
					</label>
				</div>

				<label class="rcc-field rcc-code">
					<span><?php echo esc_html__( 'Code', 'refraction' ); ?></span>
					<textarea name="code" id="rcc-code" rows="16" spellcheck="false"><?php echo esc_textarea( $s['code'] ); ?></textarea>
					<small id="rcc-code-hint"><?php echo esc_html__( 'JavaScript and CSS are wrapped in their own tag. HTML is printed as written, so include the tags yourself.', 'refraction' ); ?></small>
				</label>

				<div class="rcc-field">
					<span><?php echo esc_html__( 'Display conditions', 'refraction' ); ?></span>
					<div id="rcc-conditions" data-rules="<?php echo esc_attr( wp_json_encode( $s['rules'] ) ); ?>"></div>
					<input type="hidden" name="rules" id="rcc-rules" value="<?php echo esc_attr( wp_json_encode( $s['rules'] ) ); ?>">
				</div>

				<label class="rcc-check">
					<input type="checkbox" name="active" value="1"<?php checked( $s['active'] ); ?>>
					<span><?php echo esc_html__( 'Active', 'refraction' ); ?></span>
				</label>

				<p class="rcc-actions">
					<button type="submit" class="button button-primary"><?php echo esc_html__( 'Save snippet', 'refraction' ); ?></button>
					<a class="button" href="<?php echo esc_url( self::url() ); ?>"><?php echo esc_html__( 'Back to list', 'refraction' ); ?></a>
				</p>
			</form>
		</div>
		<?php
	}

	public function handle_save(): void {
		$this->guard();

		$id = isset( $_POST['snippet'] ) ? absint( $_POST['snippet'] ) : 0;

		check_admin_referer( self::SAVE . $id );

		if ( $id ) {
			$post = get_post( $id );

			if ( ! $post || Snippets::POST_TYPE !== $post->post_type ) {
				wp_die( esc_html__( 'Snippet not found.', 'refraction' ), 404 );
			}
		}

		$rules = json_decode( isset( $_POST['rules'] ) ? wp_unslash( $_POST['rules'] ) : '[]', true ); // phpcs:ignore WordPress.Security.ValidatedSanitizedInput.InputNotSanitized -- Parsed and validated by Rule::sanitize_list().

		$id = $this->snippets->save(
			$id,
			[
				'title' => isset( $_POST['title'] ) ? sanitize_text_field( wp_unslash( $_POST['title'] ) ) : '',
				'code' => isset( $_POST['code'] ) ? wp_unslash( $_POST['code'] ) : '', // phpcs:ignore WordPress.Security.ValidatedSanitizedInput.InputNotSanitized -- Written on purpose by an administrator who may use unfiltered HTML.
				'location' => isset( $_POST['location'] ) ? sanitize_key( wp_unslash( $_POST['location'] ) ) : 'head',
				'type' => isset( $_POST['type'] ) ? sanitize_key( wp_unslash( $_POST['type'] ) ) : 'html',
				'priority' => isset( $_POST['priority'] ) ? sanitize_text_field( wp_unslash( $_POST['priority'] ) ) : 10,
				'active' => ! empty( $_POST['active'] ),
				'rules' => is_array( $rules ) ? Rule::sanitize_list( $rules ) : [],
			]
		);

		wp_safe_redirect( self::url( $id ? [ 'done' => 'saved' ] : [] ) );
		exit;
	}

	public function handle_toggle(): void {
		$this->guard();

		$id = isset( $_GET['snippet'] ) ? absint( $_GET['snippet'] ) : 0;

		check_admin_referer( self::TOGGLE . $id );

		$post = get_post( $id );

		if ( $post && Snippets::POST_TYPE === $post->post_type ) {
			$this->snippets->set_active( $id, 'publish' !== $post->post_status );
		}

		wp_safe_redirect( self::url( [ 'done' => 'toggled' ] ) );
		exit;
	}

	public function handle_delete(): void {
		$this->guard();

		$id = isset( $_GET['snippet'] ) ? absint( $_GET['snippet'] ) : 0;

		check_admin_referer( self::DELETE . $id );

		$post = get_post( $id );

		if ( $post && Snippets::POST_TYPE === $post->post_type ) {
			$this->snippets->delete( $id );
		}

		wp_safe_redirect( self::url( [ 'done' => 'deleted' ] ) );
		exit;
	}
}
