<?php

namespace Refraction\Modules\Finder;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

?>
<script type="text/template" id="tmpl-refraction-finder">
	<div id="refraction-finder__search">
		<i class="eicon-search" aria-hidden="true"></i>
		<input id="refraction-finder__search__input" placeholder="<?php echo esc_attr__( 'Type to find anything in Refraction', 'refraction' ); ?>" autocomplete="off">
	</div>
	<div id="refraction-finder__content"></div>
</script>

<script type="text/template" id="tmpl-refraction-finder-results-container">
	<div id="refraction-finder__no-results"><?php echo esc_html__( 'No Results Found', 'refraction' ); ?></div>
	<div id="refraction-finder__results"></div>
</script>

<script type="text/template" id="tmpl-refraction-finder__results__category">
	<div class="refraction-finder__results__category__title">{{{ title }}}</div>
	<div class="refraction-finder__results__category__items"></div>
</script>

<script type="text/template" id="tmpl-refraction-finder__results__item">
	<a href="{{ url }}" class="refraction-finder__results__item__link">
		<div class="refraction-finder__results__item__icon">
			<i class="eicon-{{{ icon }}}" aria-hidden="true"></i>
		</div>
		<div class="refraction-finder__results__item__title">{{{ title }}}</div>
		<# if ( description ) { #>
			<div class="refraction-finder__results__item__description">- {{{ description }}}</div>
		<# } #>

		<# if ( lock ) { #>
		<div class="refraction-finder__results__item__badge"><i class="{{{ lock.badge.icon }}}"></i>{{ lock.badge.text }}</div>
		<# } #>
	</a>
	<# if ( actions.length ) { #>
		<div class="refraction-finder__results__item__actions">
		<# jQuery.each( actions, function() { #>
			<a class="refraction-finder__results__item__action refraction-finder__results__item__action--{{ this.name }}" href="{{ this.url }}" target="_blank">
				<i class="eicon-{{{ this.icon }}}"></i>
			</a>
		<# } ); #>
		</div>
	<# } #>
</script>
