<?php
namespace Refraction\Modules\ProWidgets\Widgets;

use Refraction\Controls_Manager;
use Refraction\Modules\ProWidgets\Base\Pro_Widget;
use Refraction\Modules\ProWidgets\Classes\Video_Url;
use Refraction\Repeater;
use Refraction\Utils;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * A player with a playlist next to it. YouTube (privacy-enhanced domain), Vimeo and video files are plain embeds that
 * are created only when the visitor presses play, so the page makes no request to a video site until then.
 */
class Video_Playlist extends Pro_Widget {

	public function get_name() {
		return 'refraction-video-playlist';
	}

	public function get_title() {
		return esc_html__( 'Video Playlist', 'refraction' );
	}

	public function get_icon() {
		return 'rficon-video-playlist';
	}

	public function get_keywords() {
		return [ 'video', 'playlist', 'youtube', 'vimeo', 'player', 'list' ];
	}

	public function get_style_depends(): array {
		return [ 'widget-video-playlist' ];
	}

	protected function register_controls() {
		$this->content_section( 'section_videos', esc_html__( 'Videos', 'refraction' ) );

		$repeater = new Repeater();

		$repeater->add_control(
			'title',
			[
				'label' => esc_html__( 'Title', 'refraction' ),
				'type' => Controls_Manager::TEXT,
				'default' => esc_html__( 'Video title', 'refraction' ),
				'label_block' => true,
				'dynamic' => [ 'active' => true ],
			]
		);

		$repeater->add_control(
			'link',
			[
				'label' => esc_html__( 'Video Link', 'refraction' ),
				'type' => Controls_Manager::TEXT,
				'placeholder' => 'https://www.youtube.com/watch?v=...',
				'description' => esc_html__( 'YouTube, Vimeo, or a link to an MP4/WebM file.', 'refraction' ),
				'label_block' => true,
				'dynamic' => [ 'active' => true ],
			]
		);

		$repeater->add_control(
			'thumbnail',
			[
				'label' => esc_html__( 'Thumbnail', 'refraction' ),
				'type' => Controls_Manager::MEDIA,
				'description' => esc_html__( 'Optional. Without one, no image is loaded from the video site.', 'refraction' ),
			]
		);

		$repeater->add_control(
			'duration',
			[
				'label' => esc_html__( 'Duration', 'refraction' ),
				'type' => Controls_Manager::TEXT,
				'placeholder' => '3:45',
			]
		);

		$this->add_control(
			'videos',
			[
				'label' => esc_html__( 'Playlist', 'refraction' ),
				'type' => Controls_Manager::REPEATER,
				'fields' => $repeater->get_controls(),
				'default' => [
					[ 'title' => 'First video', 'link' => '' ],
					[ 'title' => 'Second video', 'link' => '' ],
				],
				'title_field' => '{{{ title }}}',
			]
		);

		$this->add_control(
			'playlist_title',
			[
				'label' => esc_html__( 'Playlist Title', 'refraction' ),
				'type' => Controls_Manager::TEXT,
				'default' => esc_html__( 'Playlist', 'refraction' ),
				'separator' => 'before',
			]
		);

		$this->add_control(
			'layout',
			[
				'label' => esc_html__( 'Playlist Position', 'refraction' ),
				'type' => Controls_Manager::SELECT,
				'default' => 'right',
				'options' => [
					'right' => esc_html__( 'Right', 'refraction' ),
					'left' => esc_html__( 'Left', 'refraction' ),
					'below' => esc_html__( 'Below', 'refraction' ),
				],
				'prefix_class' => 'refraction-vp-layout-',
			]
		);

		$this->add_control(
			'autoplay_next',
			[
				'label' => esc_html__( 'Play Next Video Automatically', 'refraction' ),
				'type' => Controls_Manager::SWITCHER,
				'default' => 'yes',
				'return_value' => 'yes',
				'description' => esc_html__( 'Uses the player’s own messages; nothing extra is loaded.', 'refraction' ),
			]
		);

		$this->add_control(
			'loop_list',
			[
				'label' => esc_html__( 'Start Over After the Last Video', 'refraction' ),
				'type' => Controls_Manager::SWITCHER,
				'return_value' => 'yes',
				'condition' => [ 'autoplay_next' => 'yes' ],
			]
		);

		$this->add_control(
			'show_numbers',
			[
				'label' => esc_html__( 'Show Numbers', 'refraction' ),
				'type' => Controls_Manager::SWITCHER,
				'default' => 'yes',
				'return_value' => 'yes',
			]
		);

		$this->end_section();

		$this->style_section( 'section_vp_player', esc_html__( 'Player', 'refraction' ) );

		$this->add_responsive_control(
			'player_ratio',
			[
				'label' => esc_html__( 'Aspect Ratio', 'refraction' ),
				'type' => Controls_Manager::SELECT,
				'default' => '16 / 9',
				'options' => [ '16 / 9' => '16:9', '4 / 3' => '4:3', '21 / 9' => '21:9', '1 / 1' => '1:1' ],
				'selectors' => [ '{{WRAPPER}} .refraction-vp__screen' => 'aspect-ratio: {{VALUE}};' ],
			]
		);

		$this->add_responsive_control(
			'list_width',
			[
				'label' => esc_html__( 'Playlist Width', 'refraction' ),
				'type' => Controls_Manager::SLIDER,
				'size_units' => [ '%', 'px' ],
				'range' => [ '%' => [ 'min' => 20, 'max' => 50 ], 'px' => [ 'min' => 200, 'max' => 600 ] ],
				'default' => [ 'size' => 32, 'unit' => '%' ],
				'selectors' => [ '{{WRAPPER}} .refraction-vp' => '--refraction-vp-list: {{SIZE}}{{UNIT}};' ],
			]
		);

		$this->add_responsive_control(
			'list_height',
			[
				'label' => esc_html__( 'Playlist Maximum Height', 'refraction' ),
				'type' => Controls_Manager::SLIDER,
				'size_units' => [ 'px', 'vh' ],
				'range' => [ 'px' => [ 'min' => 120, 'max' => 900 ] ],
				'selectors' => [ '{{WRAPPER}} .refraction-vp__items' => 'max-height: {{SIZE}}{{UNIT}};' ],
			]
		);

		$this->add_control(
			'vp_bg',
			[
				'label' => esc_html__( 'Playlist Background', 'refraction' ),
				'type' => Controls_Manager::COLOR,
				'selectors' => [ '{{WRAPPER}} .refraction-vp__list' => 'background-color: {{VALUE}};' ],
			]
		);

		$this->text_style( 'vp_item', '{{WRAPPER}} .refraction-vp__item' );

		$this->add_control(
			'vp_active_bg',
			[
				'label' => esc_html__( 'Current Item Background', 'refraction' ),
				'type' => Controls_Manager::COLOR,
				'selectors' => [ '{{WRAPPER}} .refraction-vp__item[aria-current="true"]' => 'background-color: {{VALUE}};' ],
			]
		);

		$this->end_section();
	}

	protected function render() {
		$settings = $this->get_settings_for_display();
		$autoplay_next = 'yes' === $settings['autoplay_next'];
		$items = [];

		foreach ( $settings['videos'] ?? [] as $video ) {
			$parsed = Video_Url::parse( (string) ( $video['link'] ?? '' ) );

			if ( $parsed ) {
				$items[] = [
					'video' => $video,
					'provider' => $parsed['provider'],
					'src' => 'hosted' === $parsed['provider'] ? $parsed['url'] : Video_Url::embed_src( $parsed, [ 'autoplay' => true, 'api' => $autoplay_next ] ),
				];
			}
		}

		if ( empty( $items ) ) {
			$this->render_editor_hint( esc_html__( 'Add at least one video with a YouTube, Vimeo or video file link.', 'refraction' ) );
			return;
		}

		$this->add_render_attribute( 'vp', [
			'class' => 'refraction-vp',
			'data-autoplay-next' => $autoplay_next ? 'yes' : 'no',
			'data-loop' => 'yes' === $settings['loop_list'] ? 'yes' : 'no',
		] );
		$first = $items[0];
		?>
		<div <?php $this->print_render_attribute_string( 'vp' ); ?>>
			<div class="refraction-vp__stage">
				<div class="refraction-vp__screen">
					<div class="refraction-vp__cover"<?php echo ! empty( $first['video']['thumbnail']['url'] ) ? ' style="background-image:url(' . esc_url( $first['video']['thumbnail']['url'] ) . ')"' : ''; ?>>
						<button type="button" class="refraction-vp__play" aria-label="<?php echo esc_attr( sprintf( /* translators: %s: video title */ __( 'Play: %s', 'refraction' ), $first['video']['title'] ) ); ?>">
							<svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor" aria-hidden="true" focusable="false"><path d="M8 5v14l11-7z"/></svg>
						</button>
					</div>
					<div class="refraction-vp__media"></div>
				</div>
				<div class="refraction-vp__bar">
					<button type="button" class="refraction-vp__prev" aria-label="<?php esc_attr_e( 'Previous video', 'refraction' ); ?>"><svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M15 5l-7 7 7 7"/></svg></button>
					<span class="refraction-vp__now" aria-live="polite"><?php echo esc_html( $first['video']['title'] ); ?></span>
					<button type="button" class="refraction-vp__next" aria-label="<?php esc_attr_e( 'Next video', 'refraction' ); ?>"><svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M9 5l7 7-7 7"/></svg></button>
				</div>
			</div>
			<div class="refraction-vp__list">
				<?php if ( ! Utils::is_empty( $settings['playlist_title'] ) ) : ?>
					<div class="refraction-vp__list-title"><?php echo esc_html( $settings['playlist_title'] ); ?></div>
				<?php endif; ?>
				<ul class="refraction-vp__items">
					<?php foreach ( $items as $index => $item ) : ?>
						<?php $video = $item['video']; ?>
						<li>
							<button type="button" class="refraction-vp__item" data-index="<?php echo esc_attr( (string) $index ); ?>" data-provider="<?php echo esc_attr( $item['provider'] ); ?>" data-src="<?php echo esc_url( $item['src'] ); ?>" data-title="<?php echo esc_attr( $video['title'] ); ?>" data-thumb="<?php echo esc_url( $video['thumbnail']['url'] ?? '' ); ?>"<?php echo 0 === $index ? ' aria-current="true"' : ''; ?>>
								<?php if ( 'yes' === $settings['show_numbers'] ) : ?>
									<span class="refraction-vp__num" aria-hidden="true"><?php echo esc_html( (string) ( $index + 1 ) ); ?></span>
								<?php endif; ?>
								<?php if ( ! empty( $video['thumbnail']['url'] ) ) : ?>
									<img class="refraction-vp__thumb" src="<?php echo esc_url( $video['thumbnail']['url'] ); ?>" alt="" loading="lazy" width="96" height="54">
								<?php endif; ?>
								<span class="refraction-vp__label"><?php echo esc_html( $video['title'] ); ?></span>
								<?php if ( ! Utils::is_empty( $video['duration'] ) ) : ?>
									<span class="refraction-vp__duration"><?php echo esc_html( $video['duration'] ); ?></span>
								<?php endif; ?>
							</button>
						</li>
					<?php endforeach; ?>
				</ul>
			</div>
		</div>
		<?php
	}
}
