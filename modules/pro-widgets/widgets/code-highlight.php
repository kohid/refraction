<?php
namespace Refraction\Modules\ProWidgets\Widgets;

use Refraction\Controls_Manager;
use Refraction\Modules\ProWidgets\Base\Pro_Widget;
use Refraction\Modules\ProWidgets\Classes\Code_Tokenizer;
use Refraction\Utils;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * A code block highlighted on the server (JS, PHP, CSS, HTML, JSON, Bash, Python): line numbers, highlighted lines,
 * a copy button and colour themes. The highlighting needs no script; JavaScript only powers the copy button.
 */
class Code_Highlight extends Pro_Widget {

	public function get_name() {
		return 'refraction-code-highlight';
	}

	public function get_title() {
		return esc_html__( 'Code Highlight', 'refraction' );
	}

	public function get_icon() {
		return 'rficon-code-highlight';
	}

	public function get_keywords() {
		return [ 'code', 'highlight', 'syntax', 'pre', 'snippet', 'programming', 'copy' ];
	}

	public function get_style_depends(): array {
		return [ 'widget-code-highlight' ];
	}

	protected function register_controls() {
		$this->content_section( 'section_code', esc_html__( 'Code', 'refraction' ) );

		$this->add_control(
			'language',
			[
				'label' => esc_html__( 'Language', 'refraction' ),
				'type' => Controls_Manager::SELECT,
				'default' => 'js',
				'options' => [
					'js' => 'JavaScript',
					'php' => 'PHP',
					'css' => 'CSS',
					'html' => 'HTML',
					'json' => 'JSON',
					'bash' => 'Bash',
					'python' => 'Python',
					'plain' => esc_html__( 'Plain text', 'refraction' ),
				],
			]
		);

		$this->add_control(
			'code',
			[
				'label' => esc_html__( 'Code', 'refraction' ),
				'type' => Controls_Manager::TEXTAREA,
				'default' => "// Print a greeting\nfunction greet(name) {\n  const message = \"Hello, \" + name + \"!\";\n  console.log(message);\n  return message.length;\n}\n\ngreet(\"world\");",
				'rows' => 12,
				'dynamic' => [ 'active' => true ],
			]
		);

		$this->add_control(
			'filename',
			[
				'label' => esc_html__( 'File Name', 'refraction' ),
				'type' => Controls_Manager::TEXT,
				'placeholder' => 'app.js',
			]
		);

		$this->add_control(
			'show_language',
			[
				'label' => esc_html__( 'Show Language', 'refraction' ),
				'type' => Controls_Manager::SWITCHER,
				'default' => 'yes',
				'return_value' => 'yes',
			]
		);

		$this->add_control(
			'show_line_numbers',
			[
				'label' => esc_html__( 'Line Numbers', 'refraction' ),
				'type' => Controls_Manager::SWITCHER,
				'default' => 'yes',
				'return_value' => 'yes',
			]
		);

		$this->add_control(
			'highlight_lines',
			[
				'label' => esc_html__( 'Highlight Lines', 'refraction' ),
				'type' => Controls_Manager::TEXT,
				'placeholder' => '2, 4-6',
			]
		);

		$this->add_control(
			'show_copy',
			[
				'label' => esc_html__( 'Copy Button', 'refraction' ),
				'type' => Controls_Manager::SWITCHER,
				'default' => 'yes',
				'return_value' => 'yes',
			]
		);

		$this->add_control(
			'copy_label',
			[
				'label' => esc_html__( 'Copy Button Text', 'refraction' ),
				'type' => Controls_Manager::TEXT,
				'default' => esc_html__( 'Copy', 'refraction' ),
				'condition' => [ 'show_copy' => 'yes' ],
			]
		);

		$this->add_control(
			'copied_label',
			[
				'label' => esc_html__( 'Copied Text', 'refraction' ),
				'type' => Controls_Manager::TEXT,
				'default' => esc_html__( 'Copied', 'refraction' ),
				'condition' => [ 'show_copy' => 'yes' ],
			]
		);

		$this->add_control(
			'wrap',
			[
				'label' => esc_html__( 'Wrap Long Lines', 'refraction' ),
				'type' => Controls_Manager::SWITCHER,
				'default' => '',
				'return_value' => 'yes',
			]
		);

		$this->end_section();

		$this->style_section( 'section_code_style', esc_html__( 'Code Block', 'refraction' ) );

		$this->add_control(
			'theme',
			[
				'label' => esc_html__( 'Theme', 'refraction' ),
				'type' => Controls_Manager::SELECT,
				'default' => 'night',
				'options' => [
					'night' => esc_html__( 'Night', 'refraction' ),
					'paper' => esc_html__( 'Paper', 'refraction' ),
					'solar' => esc_html__( 'Solar', 'refraction' ),
					'contrast' => esc_html__( 'High contrast', 'refraction' ),
				],
				'prefix_class' => 'refraction-code-theme-',
			]
		);

		$this->add_responsive_control(
			'font_size',
			[
				'label' => esc_html__( 'Font Size', 'refraction' ),
				'type' => Controls_Manager::SLIDER,
				'size_units' => [ 'px', 'em', 'rem' ],
				'range' => [ 'px' => [ 'min' => 10, 'max' => 28 ] ],
				'default' => [ 'size' => 14, 'unit' => 'px' ],
				'selectors' => [ '{{WRAPPER}} .refraction-code__pre' => 'font-size: {{SIZE}}{{UNIT}};' ],
			]
		);

		$this->add_responsive_control(
			'max_height',
			[
				'label' => esc_html__( 'Maximum Height', 'refraction' ),
				'type' => Controls_Manager::SLIDER,
				'size_units' => [ 'px', 'vh' ],
				'range' => [ 'px' => [ 'min' => 80, 'max' => 1000 ] ],
				'selectors' => [ '{{WRAPPER}} .refraction-code__pre' => 'max-height: {{SIZE}}{{UNIT}};' ],
			]
		);

		$this->add_responsive_control(
			'tab_size',
			[
				'label' => esc_html__( 'Tab Size', 'refraction' ),
				'type' => Controls_Manager::NUMBER,
				'min' => 1,
				'max' => 8,
				'default' => 2,
				'selectors' => [ '{{WRAPPER}} .refraction-code__pre' => 'tab-size: {{VALUE}};' ],
			]
		);

		$this->add_responsive_control(
			'code_radius',
			[
				'label' => esc_html__( 'Border Radius', 'refraction' ),
				'type' => Controls_Manager::SLIDER,
				'range' => [ 'px' => [ 'max' => 30 ] ],
				'selectors' => [ '{{WRAPPER}} .refraction-code' => 'border-radius: {{SIZE}}{{UNIT}};' ],
			]
		);

		$this->add_responsive_control(
			'code_padding',
			[
				'label' => esc_html__( 'Padding', 'refraction' ),
				'type' => Controls_Manager::SLIDER,
				'range' => [ 'px' => [ 'max' => 60 ] ],
				'selectors' => [ '{{WRAPPER}} .refraction-code__pre' => 'padding: {{SIZE}}{{UNIT}};' ],
			]
		);

		$this->end_section();
	}

	protected function render() {
		$settings = $this->get_settings_for_display();
		$code = (string) ( $settings['code'] ?? '' );

		if ( '' === trim( $code ) ) {
			$this->render_editor_hint( esc_html__( 'Add some code.', 'refraction' ) );
			return;
		}

		$language = Code_Tokenizer::normalize_language( (string) $settings['language'] );
		$lines = Code_Tokenizer::lines( $code, $language );
		$highlighted = array_flip( Code_Tokenizer::parse_line_ranges( (string) ( $settings['highlight_lines'] ?? '' ) ) );
		$language_names = [ 'js' => 'JavaScript', 'php' => 'PHP', 'css' => 'CSS', 'html' => 'HTML', 'json' => 'JSON', 'bash' => 'Bash', 'python' => 'Python', 'plain' => __( 'Text', 'refraction' ) ];
		$has_bar = ! Utils::is_empty( $settings['filename'] ) || 'yes' === $settings['show_language'] || 'yes' === $settings['show_copy'];

		$this->add_render_attribute( 'code', [
			'class' => array_filter( [
				'refraction-code',
				'yes' === $settings['show_line_numbers'] ? 'refraction-code--numbers' : '',
				'yes' === $settings['wrap'] ? 'refraction-code--wrap' : '',
			] ),
		] );
		?>
		<div <?php $this->print_render_attribute_string( 'code' ); ?>>
			<?php if ( $has_bar ) : ?>
				<div class="refraction-code__bar">
					<span class="refraction-code__file"><?php echo esc_html( $settings['filename'] ); ?></span>
					<?php if ( 'yes' === $settings['show_language'] ) : ?>
						<span class="refraction-code__lang"><?php echo esc_html( $language_names[ $language ] ?? '' ); ?></span>
					<?php endif; ?>
					<?php if ( 'yes' === $settings['show_copy'] ) : ?>
						<button type="button" class="refraction-code__copy" data-copied="<?php echo esc_attr( $settings['copied_label'] ); ?>"><?php echo esc_html( $settings['copy_label'] ); ?></button>
					<?php endif; ?>
				</div>
			<?php endif; ?>
			<pre class="refraction-code__pre" tabindex="0" aria-label="<?php echo esc_attr( sprintf( /* translators: %s: language name */ __( '%s code', 'refraction' ), $language_names[ $language ] ?? '' ) ); ?>"><code class="language-<?php echo esc_attr( $language ); ?>"><?php
				foreach ( $lines as $index => $line_html ) {
					$class = 'refraction-code__line' . ( isset( $highlighted[ $index + 1 ] ) ? ' is-highlighted' : '' );
					echo '<span class="' . esc_attr( $class ) . '">' . ( '' === $line_html ? '&#8203;' : $line_html ) . '</span>'; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- escaped by Code_Tokenizer.
				}
			?></code></pre>
			<span class="refraction-code__status refraction-visually-hidden" role="status" aria-live="polite"></span>
		</div>
		<?php
	}
}
