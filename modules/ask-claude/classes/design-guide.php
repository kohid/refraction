<?php
namespace Refraction\Modules\AskClaude\Classes;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * How Ask Claude should design, shared by every mode (API key, Claude.ai chat, Claude Code queue, MCP). It is a
 * design direction, a list of what makes Refraction pages stand out (with the exact settings), recipes of whole
 * sections, and a checklist to review the result against. The recipes are data: scripts/check-ask-claude-design.mjs
 * runs each through the Layout_Sanitizer and fails when a setting or option value would be dropped.
 */
class Design_Guide {

	const DIRECTION = "DESIGN DIRECTION\nAim for a modern, confident page a design studio would sign: it should look made for this subject, not like a template.\n- Before building, decide in one sentence the page's idea and mood (for example \"a late-night city ride: deep ink navy, a warm amber accent, big quiet type\"), then hold every choice to it.\n- Palette: one dark ink, one light paper, one accent with a pale tint of it; at most one more color. Use the site's global colors when they suit; otherwise set exact colors. Text on any background must stay easy to read.\n- Type: a clear scale with real contrast. Hero heading 64-88px (tablet 52, phone 38-42), section headings 40-52px (phone 30-32), body 17-18px with line height 1.6, small labels 13-14px. Big headings bold (700-800) with letter spacing -1 to -2px and line height 1-1.1; body regular. Keep lines of text under about 65 characters (a max width on text, or a narrower column).\n- Space: an 8px rhythm. Sections 112-140px top and bottom on desktop, 88 on tablet, 64-72 on phone; boxed width 1200-1280px; gaps 24-32px in grids, 48-80px between a text column and a picture.\n- Composition: vary the rhythm of sections (light, dark, accent band, light again) and their shapes (a split hero, a full-width band, a bento grid with one big tile, a sticky column beside a scrolling one). Never more than one grid of identical cards per page. Leave room: one idea per section.\n- One signature moment per page that people remember (see SIGNATURE FEATURES): pick the one that fits the subject, build it properly, and keep everything else calm.\n- Motion with restraint: a text reveal on the hero heading, the cards of a grid coming in one after another, a magnetic main button, slow parallax on decorative pictures only. Do not stack several effects on one element, and do not animate body text.\n- User friendly: one clear main action per screen with the same wording each time it appears, a secondary action that looks secondary, buttons at least 48px tall, links that say where they go, contact details as tappable links (tel:, mailto:), and important information above the fold.\n- Icons: Font Awesome 5 free names (\"fas fa-phone\", \"fab fa-apple\"); there are no number icons, so give steps a meaningful icon or write the number as a heading.\n- Phones: every row container also gets flex_direction_mobile \"column\" (or a one-column grid), smaller _mobile font sizes and paddings, centered or left text that does not wrap one word per line, and nothing wider than the screen.";

	const SIGNATURE = "SIGNATURE FEATURES (exact settings; any widget or container accepts the motion ones)\n- Text reveal: rf_reveal_text \"lines\"|\"words\"|\"chars\" with rf_reveal_text_effect \"mask\" (or fade-up, blur, rise...) on a heading; rf_reveal \"fade-up\"|\"zoom-in\"|\"blur\"|\"wipe-up\"... on any element; rf_reveal_children on a container brings its elements in one after another (rf_reveal_stagger 80-120 ms). rf_reveal_trigger \"scroll\" ties it to the scroll instead of playing once.\n- Two-tone heading (heading widget): rf_dual \"yes\", rf_dual_text = the highlighted words, rf_dual_after = text after them; rf_dual_fill \"color\" (rf_dual_color) or \"gradient\" (rf_dual_grad_a, rf_dual_grad_b); rf_dual_mark \"marker\"|\"underline\"|\"round\"|\"block\" with rf_dual_mark_color and rf_dual_draw \"yes\" (the mark draws in).\n- Animated headline (refraction-animated-headline): rotating words (animation_type \"clip\"|\"typing\"|\"slide\"|\"flip\", rotating_text one per line) or a hand-drawn shape (\"underline\"|\"circle\"|\"highlight\") around highlighted_text.\n- Marquee band (refraction-marquee): items of text, icons or logos running across the page; tilt for a slanted ribbon, rows \"2\" running opposite ways, scroll \"boost\" to speed up with the scroll, outline on alternate items, separator \"icon\".\n- Parallax and scroll effects: rf_scroll_preset \"far\"|\"mid\"|\"near\"|\"float\"|\"drift-left\"|\"drift-right\"|\"depth\" on pictures and shapes; rf_mouse_tilt \"yes\" on a product picture or card.\n- Sticky: rf_sticky \"top\" with rf_sticky_parent \"yes\" keeps a column in place while the one beside it scrolls (a story, steps, a pinned picture).\n- Magnetic main button: rf_magnetic \"yes\" (rf_magnetic_strength {\"unit\":\"px\",\"size\":30}); rf_cursor_label shows a word in the cursor over an element (\"View\", \"Drag\").\n- Scroll doors (container): rf_door \"left\"|\"right\"|\"push\"|\"slide\"|\"book\"|\"zoom\" turns the container into a door that opens onto the next section as the page scrolls; best on one full-height section.\n- Backgrounds: background_background \"gradient\" (background_color, background_color_b, background_gradient_angle), an image with a background_overlay_* gradient for legible text, or \"slideshow\" with background_slideshow_ken_burns \"yes\"; shape_divider_top/bottom (\"waves\", \"curve\", \"tilt\", \"mountains\"...) between sections, with shape_divider_top_color set to the background of the section above (otherwise it shows white).\n- Bento grids: a container with container_type \"grid\" and grid_columns_grid; a tile spans cells with grid_column and grid_row (\"2\" = two cells; set grid_column_mobile \"1\" for phones, and grid_rows_grid_mobile {\"unit\":\"fr\",\"size\":1} so phone tiles take their own height).\n- Experience widgets, when the subject calls for them: refraction-phone-showcase (an app on a phone with steps), refraction-timed-slides (auto-playing story slides), refraction-hotspot (points on a picture), refraction-flip-box, refraction-testimonial-carousel, refraction-nested-carousel (stack layout), build-scene (a 3D model assembling with the scroll), counter (numbers that count up).";

	const CHECKLIST = "REVIEW BEFORE ANSWERING (fix anything that fails)\n1. Could this page belong to any other business? If yes, sharpen the copy, the palette or the signature moment.\n2. Is the hierarchy obvious in a two-second glance: one h1, a clear main action, a scale from big to small?\n3. Is there exactly one signature moment, and is the motion restrained (no element with two effects)?\n4. Are section paddings, gaps and widths consistent with the 8px rhythm, with a different rhythm or shape from one section to the next?\n5. Does every row work on a phone (flex_direction_mobile column, _mobile sizes, no overflow, buttons easy to tap)?\n6. Contrast: is all text easy to read on its background, including over pictures?\n7. Facts: no invented prices, numbers, names, reviews or awards; placeholders in brackets instead.";

	/**
	 * Sections that use the signature features well, as elements. Each is checked by the design test, so their
	 * settings are always valid; a page combines and restyles them instead of copying them as they are.
	 */
	public static function recipes(): array {
		$px = static function ( $size ) {
			return [ 'unit' => 'px', 'size' => $size ];
		};
		$pad = static function ( $y, $x = 24 ) {
			return [ 'unit' => 'px', 'top' => (string) $y, 'right' => (string) $x, 'bottom' => (string) $y, 'left' => (string) $x, 'isLinked' => false ];
		};
		$type = static function ( $size, $weight, $mobile = null, $extra = [] ) use ( $px ) {
			return array_merge( [ 'typography_typography' => 'custom', 'typography_font_size' => $px( $size ), 'typography_font_weight' => (string) $weight ], null !== $mobile ? [ 'typography_font_size_mobile' => $px( $mobile ) ] : [], $extra );
		};

		$hero = [
			'elType' => 'container',
			'settings' => [
				'content_width' => 'boxed',
				'boxed_width' => $px( 1240 ),
				'min_height' => [ 'unit' => 'vh', 'size' => 88 ],
				'flex_direction' => 'row',
				'flex_direction_mobile' => 'column',
				'flex_align_items' => 'center',
				'flex_gap' => [ 'unit' => 'px', 'row' => '40', 'column' => '64', 'isLinked' => false ],
				'padding' => $pad( 120 ),
				'padding_mobile' => $pad( 72, 20 ),
				'background_background' => 'gradient',
				'background_color' => '#0E1324',
				'background_color_b' => '#1B2340',
				'background_gradient_angle' => [ 'unit' => 'deg', 'size' => 160 ],
			],
			'elements' => [
				[
					'elType' => 'container',
					'settings' => [ 'width' => [ 'unit' => '%', 'size' => 58 ], 'width_mobile' => [ 'unit' => '%', 'size' => 100 ], 'flex_direction' => 'column', 'flex_gap' => [ 'unit' => 'px', 'row' => '24', 'column' => '24', 'isLinked' => true ], 'rf_reveal_children' => 'fade-up', 'rf_reveal_stagger' => 110 ],
					'elements' => [
						[ 'elType' => 'widget', 'widgetType' => 'heading', 'settings' => array_merge( [ 'title' => '[Short promise]', 'header_size' => 'h1', 'title_color' => '#F5F1E8', 'rf_dual' => 'yes', 'rf_dual_text' => '[the key words]', 'rf_dual_mark' => 'marker', 'rf_dual_mark_color' => '#F2A93B', 'rf_dual_draw' => 'yes', 'rf_reveal_text' => 'words', 'rf_reveal_text_effect' => 'mask' ], $type( 80, 800, 40, [ 'typography_line_height' => [ 'unit' => 'em', 'size' => 1.04 ], 'typography_letter_spacing' => $px( -2 ) ] ) ), 'elements' => [] ],
						[ 'elType' => 'widget', 'widgetType' => 'text-editor', 'settings' => array_merge( [ 'editor' => '<p>[One or two sentences on what the visitor gets and why it is different.]</p>', 'text_color' => '#C9CCD6' ], $type( 19, 400, 17 ) ), 'elements' => [] ],
						[
							'elType' => 'container',
							'settings' => [ 'flex_direction' => 'row', 'flex_wrap' => 'wrap', 'flex_gap' => [ 'unit' => 'px', 'row' => '12', 'column' => '12', 'isLinked' => true ] ],
							'elements' => [
								[ 'elType' => 'widget', 'widgetType' => 'button', 'settings' => array_merge( [ 'text' => '[Main action]', 'link' => [ 'url' => '#contact' ], 'size' => 'lg', 'background_background' => 'classic', 'background_color' => '#F2A93B', 'button_text_color' => '#0E1324', 'border_radius' => [ 'unit' => 'px', 'top' => '999', 'right' => '999', 'bottom' => '999', 'left' => '999', 'isLinked' => true ], 'rf_magnetic' => 'yes', 'rf_magnetic_strength' => $px( 30 ) ], $type( 16, 700 ) ), 'elements' => [] ],
								[ 'elType' => 'widget', 'widgetType' => 'button', 'settings' => [ 'text' => '[Second action]', 'link' => [ 'url' => '#how' ], 'size' => 'lg', 'background_background' => 'classic', 'background_color' => 'rgba(255,255,255,0)', 'button_text_color' => '#F5F1E8', 'border_border' => 'solid', 'border_width' => [ 'unit' => 'px', 'top' => '1', 'right' => '1', 'bottom' => '1', 'left' => '1', 'isLinked' => true ], 'border_color' => 'rgba(245,241,232,0.35)', 'border_radius' => [ 'unit' => 'px', 'top' => '999', 'right' => '999', 'bottom' => '999', 'left' => '999', 'isLinked' => true ] ], 'elements' => [] ],
							],
						],
					],
				],
				[
					'elType' => 'container',
					'settings' => [ 'width' => [ 'unit' => '%', 'size' => 42 ], 'width_mobile' => [ 'unit' => '%', 'size' => 100 ], 'flex_direction' => 'column' ],
					'elements' => [
						[ 'elType' => 'widget', 'widgetType' => 'image', 'settings' => [ 'image_border_radius' => [ 'unit' => 'px', 'top' => '28', 'right' => '28', 'bottom' => '28', 'left' => '28', 'isLinked' => true ], 'rf_scroll_preset' => 'float', 'rf_mouse_tilt' => 'yes' ], 'elements' => [] ],
					],
				],
			],
		];

		$marquee = [
			'elType' => 'container',
			'settings' => [ 'content_width' => 'full', 'padding' => $pad( 0, 0 ), 'background_background' => 'classic', 'background_color' => '#F2A93B' ],
			'elements' => [
				[ 'elType' => 'widget', 'widgetType' => 'refraction-marquee', 'settings' => array_merge( [
					'items' => [ [ 'type' => 'text', 'text' => '[Service one]' ], [ 'type' => 'text', 'text' => '[Service two]', 'outline' => 'yes' ], [ 'type' => 'text', 'text' => '[Service three]' ], [ 'type' => 'text', 'text' => '[Area served]', 'outline' => 'yes' ] ],
					'separator' => 'icon',
					'separator_icon' => [ 'value' => 'fas fa-asterisk', 'library' => 'fa-solid' ],
					'speed' => $px( 60 ),
					'scroll' => 'boost',
					'tilt' => [ 'unit' => 'deg', 'size' => -2 ],
					'band_bg' => '#F2A93B',
					'text_color' => '#0E1324',
					'separator_color' => '#0E1324',
				], [ 'text_typography_typography' => 'custom', 'text_typography_font_size' => $px( 44 ), 'text_typography_font_size_mobile' => $px( 28 ), 'text_typography_font_weight' => '800' ] ), 'elements' => [] ],
			],
		];

		$stat = static function ( $label ) use ( $type ) {
			return [ 'elType' => 'widget', 'widgetType' => 'counter', 'settings' => array_merge( [ 'starting_number' => 0, 'ending_number' => 0, 'suffix' => '+', 'title' => $label, 'number_color' => '#0E1324', 'title_color' => '#5B6070' ], [ 'typography_number_typography' => 'custom', 'typography_number_font_size' => [ 'unit' => 'px', 'size' => 56 ], 'typography_number_font_weight' => '800' ] ), 'elements' => [] ];
		};

		$bento = [
			'elType' => 'container',
			'settings' => [ 'content_width' => 'boxed', 'boxed_width' => $px( 1240 ), 'flex_direction' => 'column', 'flex_gap' => [ 'unit' => 'px', 'row' => '48', 'column' => '48', 'isLinked' => true ], 'padding' => $pad( 128 ), 'padding_mobile' => $pad( 72, 20 ), 'background_background' => 'classic', 'background_color' => '#F7F4EE', '_element_id' => 'how' ],
			'elements' => [
				[ 'elType' => 'widget', 'widgetType' => 'heading', 'settings' => array_merge( [ 'title' => '[What makes it work]', 'header_size' => 'h2', 'title_color' => '#0E1324', 'rf_reveal_text' => 'lines', 'rf_reveal_text_effect' => 'mask' ], $type( 48, 800, 32, [ 'typography_letter_spacing' => $px( -1 ) ] ) ), 'elements' => [] ],
				[
					'elType' => 'container',
					'settings' => [ 'container_type' => 'grid', 'grid_columns_grid' => [ 'unit' => 'fr', 'size' => 3 ], 'grid_columns_grid_mobile' => [ 'unit' => 'fr', 'size' => 1 ], 'grid_rows_grid' => [ 'unit' => 'fr', 'size' => 2 ], 'grid_rows_grid_mobile' => [ 'unit' => 'fr', 'size' => 1 ], 'grid_gaps' => [ 'unit' => 'px', 'row' => '24', 'column' => '24', 'isLinked' => true ], 'rf_reveal_children' => 'fade-up', 'rf_reveal_stagger' => 90 ],
					'elements' => [
						[ 'elType' => 'container', 'settings' => [ 'flex_direction' => 'column', 'flex_justify_content' => 'flex-end', 'min_height' => $px( 360 ), 'padding' => $pad( 40, 40 ), 'background_background' => 'classic', 'background_color' => '#0E1324', 'border_radius' => [ 'unit' => 'px', 'top' => '28', 'right' => '28', 'bottom' => '28', 'left' => '28', 'isLinked' => true ], 'grid_column' => '2', 'grid_row' => '2', 'grid_column_mobile' => '1', 'grid_row_mobile' => '1' ], 'elements' => [
							[ 'elType' => 'widget', 'widgetType' => 'icon-box', 'settings' => [ 'selected_icon' => [ 'value' => 'fas fa-bolt', 'library' => 'fa-solid' ], 'position' => 'block-start', 'text_align' => 'start', 'title_text' => '[The main benefit]', 'description_text' => '[Why it matters, in one sentence.]', 'primary_color' => '#F2A93B', 'title_color' => '#F5F1E8', 'description_color' => '#C9CCD6' ], 'elements' => [] ],
						] ],
						[ 'elType' => 'container', 'settings' => [ 'flex_direction' => 'column', 'padding' => $pad( 32, 32 ), 'background_background' => 'classic', 'background_color' => '#FFFFFF', 'border_radius' => [ 'unit' => 'px', 'top' => '28', 'right' => '28', 'bottom' => '28', 'left' => '28', 'isLinked' => true ] ], 'elements' => [ $stat( '[Number to confirm]' ) ] ],
						[ 'elType' => 'container', 'settings' => [ 'flex_direction' => 'column', 'padding' => $pad( 32, 32 ), 'background_background' => 'classic', 'background_color' => '#FBE3BC', 'border_radius' => [ 'unit' => 'px', 'top' => '28', 'right' => '28', 'bottom' => '28', 'left' => '28', 'isLinked' => true ] ], 'elements' => [
							[ 'elType' => 'widget', 'widgetType' => 'icon-box', 'settings' => [ 'selected_icon' => [ 'value' => 'fas fa-clock', 'library' => 'fa-solid' ], 'position' => 'block-start', 'text_align' => 'start', 'title_text' => '[A second benefit]', 'description_text' => '[One sentence.]', 'primary_color' => '#0E1324' ], 'elements' => [] ],
						] ],
					],
				],
			],
		];

		$story = [
			'elType' => 'container',
			'settings' => [ 'content_width' => 'boxed', 'boxed_width' => $px( 1240 ), 'flex_direction' => 'row', 'flex_direction_mobile' => 'column', 'flex_align_items' => 'flex-start', 'flex_gap' => [ 'unit' => 'px', 'row' => '40', 'column' => '80', 'isLinked' => false ], 'padding' => $pad( 128 ), 'padding_mobile' => $pad( 72, 20 ) ],
			'elements' => [
				[ 'elType' => 'container', 'settings' => [ 'width' => [ 'unit' => '%', 'size' => 40 ], 'width_mobile' => [ 'unit' => '%', 'size' => 100 ], 'flex_direction' => 'column', 'rf_sticky' => 'top', 'rf_sticky_parent' => 'yes', 'rf_sticky_offset' => 120, 'rf_sticky_on' => [ 'desktop', 'tablet' ] ], 'elements' => [
					[ 'elType' => 'widget', 'widgetType' => 'heading', 'settings' => array_merge( [ 'title' => '[How it works, in three steps]', 'header_size' => 'h2', 'title_color' => '#0E1324' ], $type( 48, 800, 32 ) ), 'elements' => [] ],
				] ],
				[ 'elType' => 'container', 'settings' => [ 'width' => [ 'unit' => '%', 'size' => 60 ], 'width_mobile' => [ 'unit' => '%', 'size' => 100 ], 'flex_direction' => 'column', 'flex_gap' => [ 'unit' => 'px', 'row' => '56', 'column' => '56', 'isLinked' => true ], 'rf_reveal_children' => 'fade-up' ], 'elements' => [
					[ 'elType' => 'widget', 'widgetType' => 'icon-box', 'settings' => [ 'selected_icon' => [ 'value' => 'fas fa-phone', 'library' => 'fa-solid' ], 'view' => 'stacked', 'shape' => 'circle', 'position' => 'inline-start', 'title_text' => '[Step one]', 'description_text' => '[What the visitor does and what happens next.]', 'primary_color' => '#0E1324', 'secondary_color' => '#F2A93B' ], 'elements' => [] ],
					[ 'elType' => 'widget', 'widgetType' => 'icon-box', 'settings' => [ 'selected_icon' => [ 'value' => 'fas fa-calendar-check', 'library' => 'fa-solid' ], 'view' => 'stacked', 'shape' => 'circle', 'position' => 'inline-start', 'title_text' => '[Step two]', 'description_text' => '[One sentence.]', 'primary_color' => '#0E1324', 'secondary_color' => '#F2A93B' ], 'elements' => [] ],
				] ],
			],
		];

		$cta = [
			'elType' => 'container',
			'settings' => [ 'content_width' => 'boxed', 'boxed_width' => $px( 1000 ), 'flex_direction' => 'column', 'flex_align_items' => 'center', 'flex_gap' => [ 'unit' => 'px', 'row' => '28', 'column' => '28', 'isLinked' => true ], 'padding' => $pad( 140 ), 'padding_mobile' => $pad( 88, 20 ), 'background_background' => 'classic', 'background_color' => '#0E1324', 'shape_divider_top' => 'curve', 'shape_divider_top_color' => '#F7F4EE', '_element_id' => 'contact' ],
			'elements' => [
				[ 'elType' => 'widget', 'widgetType' => 'refraction-animated-headline', 'settings' => array_merge( [ 'animation_type' => 'clip', 'before_text' => '[Ready when you are,]', 'rotating_text' => "[day]\n[night]\n[weekend]", 'header_tag' => 'h2', 'headline_align' => 'center', 'headline_color' => '#F5F1E8', 'dynamic_color' => '#F2A93B' ], [ 'headline_typography_typography' => 'custom', 'headline_typography_font_size' => $px( 56 ), 'headline_typography_font_size_mobile' => $px( 34 ), 'headline_typography_font_weight' => '800' ] ), 'elements' => [] ],
				[ 'elType' => 'widget', 'widgetType' => 'button', 'settings' => [ 'text' => '[Main action]', 'link' => [ 'url' => 'tel:[Phone number]' ], 'size' => 'xl', 'align' => 'center', 'background_background' => 'classic', 'background_color' => '#F2A93B', 'button_text_color' => '#0E1324', 'rf_magnetic' => 'yes', 'rf_cursor_label' => 'Call' ], 'elements' => [] ],
			],
		];

		return [
			'hero: split, two-tone h1 that reveals word by word, magnetic main button, floating tilted picture' => $hero,
			'marquee band: a slanted ribbon of services that speeds up with the scroll' => $marquee,
			'bento: one big dark tile spanning two rows beside smaller tiles that come in one after another' => $bento,
			'story: a sticky heading beside steps that scroll past (sticky on desktop and tablet only)' => $story,
			'closing call: rotating words over a curved divider, a magnetic call button with a cursor label' => $cta,
		];
	}

	/** The recipes as text: one line of name and one line of JSON each. */
	public static function recipes_text(): string {
		$out = [ "SECTION RECIPES (valid settings to start from: change the colors, copy, sizes and order to fit the page; never paste all of them as they are)" ];

		foreach ( self::recipes() as $name => $element ) {
			$out[] = '- ' . $name . "\n" . wp_json_encode( $element );
		}

		return implode( "\n", $out );
	}

	/** Everything above, for a prompt. */
	public static function text( bool $with_recipes = true ): string {
		return implode( "\n\n", array_filter( [ self::DIRECTION, self::SIGNATURE, $with_recipes ? self::recipes_text() : '', self::CHECKLIST ] ) );
	}
}
