<?php
namespace Refraction\Modules\ProWidgets\Classes;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Walker for the Nav Menu widget: BEM class names, a real button for every submenu toggle
 * (keyboard and touch), and a CSS-drawn indicator (no icon font needed).
 */
class Nav_Menu_Walker extends \Walker_Nav_Menu {

	public function start_lvl( &$output, $depth = 0, $args = null ) {
		$output .= '<ul class="refraction-nav-menu__sub refraction-nav-menu__sub--depth-' . (int) ( $depth + 1 ) . '">';
	}

	public function end_lvl( &$output, $depth = 0, $args = null ) {
		$output .= '</ul>';
	}

	public function start_el( &$output, $data_object, $depth = 0, $args = null, $current_object_id = 0 ) {
		$item = $data_object;
		$has_children = in_array( 'menu-item-has-children', (array) $item->classes, true );

		$classes = [ 'refraction-nav-menu__item' ];
		foreach ( (array) $item->classes as $class ) {
			if ( in_array( $class, [ 'menu-item-has-children', 'current-menu-item', 'current-menu-ancestor', 'current-menu-parent', 'current_page_item' ], true ) ) {
				$classes[] = $class;
			}
		}
		if ( $has_children ) {
			$classes[] = 'refraction-nav-menu__item--parent';
		}

		$output .= '<li class="' . esc_attr( implode( ' ', array_unique( $classes ) ) ) . '">';

		$title = apply_filters( 'the_title', $item->title, $item->ID );
		$link_class = 'refraction-nav-menu__link' . ( $depth > 0 ? ' refraction-nav-menu__link--sub' : '' );

		$attrs = ' class="' . esc_attr( $link_class ) . '"';
		$attrs .= ' href="' . esc_url( ! empty( $item->url ) ? $item->url : '#' ) . '"';
		if ( ! empty( $item->target ) ) {
			$attrs .= ' target="' . esc_attr( $item->target ) . '"';
		}
		if ( ! empty( $item->xfn ) ) {
			$attrs .= ' rel="' . esc_attr( $item->xfn ) . '"';
		} elseif ( '_blank' === $item->target ) {
			$attrs .= ' rel="noopener"';
		}
		if ( ! empty( $item->attr_title ) ) {
			$attrs .= ' title="' . esc_attr( $item->attr_title ) . '"';
		}
		if ( in_array( 'current-menu-item', $classes, true ) ) {
			$attrs .= ' aria-current="page"';
		}

		$output .= '<a' . $attrs . '><span class="refraction-nav-menu__text">' . wp_kses_post( $title ) . '</span></a>';

		if ( $has_children ) {
			$label = sprintf(
				/* translators: %s: menu item title */
				__( 'Toggle submenu of %s', 'refraction' ),
				wp_strip_all_tags( $title )
			);
			$output .= '<button type="button" class="refraction-nav-menu__subtoggle" aria-expanded="false" aria-label="' . esc_attr( $label ) . '"><span class="refraction-nav-menu__indicator" aria-hidden="true"></span></button>';
		}
	}

	public function end_el( &$output, $data_object, $depth = 0, $args = null ) {
		$output .= '</li>';
	}
}
