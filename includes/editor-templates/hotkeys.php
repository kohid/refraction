<?php
namespace Refraction;

use Refraction\Utils;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}
?>
<script type="text/template" id="tmpl-refraction-hotkeys">
	<# var ctrlLabel = environment.mac ? '&#8984;' : 'Ctrl'; #>
	<div id="refraction-hotkeys__content">

		<div class="refraction-hotkeys__col">

			<h3 class="refraction-hotkeys__header"><?php echo esc_html__( 'Actions', 'refraction' ); ?></h3>

			<ul class="refraction-hotkeys__list">

				<li class="refraction-hotkeys__item">
					<div class="refraction-hotkeys__item--label"><?php echo esc_html__( 'Undo', 'refraction' ); ?></div>
					<div class="refraction-hotkeys__item--shortcut">
						<kbd>{{{ ctrlLabel }}}</kbd>
						<kbd>Z</kbd>
					</div>
				</li>

				<li class="refraction-hotkeys__item">
					<div class="refraction-hotkeys__item--label"><?php echo esc_html__( 'Redo', 'refraction' ); ?></div>
					<div class="refraction-hotkeys__item--shortcut">
						<kbd>{{{ ctrlLabel }}}</kbd>
						<kbd>Shift</kbd>
						<kbd>Z</kbd>
					</div>
				</li>

				<li class="refraction-hotkeys__item">
					<div class="refraction-hotkeys__item--label"><?php echo esc_html__( 'Copy', 'refraction' ); ?></div>
					<div class="refraction-hotkeys__item--shortcut">
						<kbd>{{{ ctrlLabel }}}</kbd>
						<kbd>C</kbd>
					</div>
				</li>

				<li class="refraction-hotkeys__item">
					<div class="refraction-hotkeys__item--label"><?php echo esc_html__( 'Paste', 'refraction' ); ?></div>
					<div class="refraction-hotkeys__item--shortcut">
						<kbd>{{{ ctrlLabel }}}</kbd>
						<kbd>V</kbd>
					</div>
				</li>

				<li class="refraction-hotkeys__item">
					<div class="refraction-hotkeys__item--label"><?php echo esc_html__( 'Paste Style', 'refraction' ); ?></div>
					<div class="refraction-hotkeys__item--shortcut">
						<kbd>{{{ ctrlLabel }}}</kbd>
						<kbd>Shift</kbd>
						<kbd>V</kbd>
					</div>
				</li>

				<li class="refraction-hotkeys__item">
					<div class="refraction-hotkeys__item--label"><?php echo esc_html__( 'Delete', 'refraction' ); ?></div>
					<div class="refraction-hotkeys__item--shortcut">
						<kbd>Delete</kbd>
					</div>
				</li>

				<li class="refraction-hotkeys__item">
					<div class="refraction-hotkeys__item--label"><?php echo esc_html__( 'Duplicate', 'refraction' ); ?></div>
					<div class="refraction-hotkeys__item--shortcut">
						<kbd>{{{ ctrlLabel }}}</kbd>
						<kbd>D</kbd>
					</div>
				</li>

				<li class="refraction-hotkeys__item">
					<div class="refraction-hotkeys__item--label"><?php echo esc_html__( 'Save', 'refraction' ); ?></div>
					<div class="refraction-hotkeys__item--shortcut">
						<kbd>{{{ ctrlLabel }}}</kbd>
						<kbd>S</kbd>
					</div>
				</li>


			</ul>

		</div>

		<div class="refraction-hotkeys__col">

			<h3 class="refraction-hotkeys__header"><?php echo esc_html__( 'Panels', 'refraction' ); ?></h3>

			<ul class="refraction-hotkeys__list">

				<li class="refraction-hotkeys__item">
					<div class="refraction-hotkeys__item--label"><?php echo esc_html__( 'Finder', 'refraction' ); ?></div>
					<div class="refraction-hotkeys__item--shortcut">
						<kbd>{{{ ctrlLabel }}}</kbd>
						<kbd>E</kbd>
					</div>
				</li>

				<li class="refraction-hotkeys__item">
					<div class="refraction-hotkeys__item--label"><?php echo esc_html__( 'Show / Hide Panel', 'refraction' ); ?></div>
					<div class="refraction-hotkeys__item--shortcut">
						<kbd>{{{ ctrlLabel }}}</kbd>
						<kbd>P</kbd>
					</div>
				</li>

				<li class="refraction-hotkeys__item">
					<div class="refraction-hotkeys__item--label"><?php echo esc_html__( 'Site Settings', 'refraction' ); ?></div>
					<div class="refraction-hotkeys__item--shortcut">
						<kbd>{{{ ctrlLabel }}}</kbd>
						<kbd>K</kbd>
					</div>
				</li>

				<li class="refraction-hotkeys__item">
					<div class="refraction-hotkeys__item--label"><?php echo esc_html__( 'Structure', 'refraction' ); ?></div>
					<div class="refraction-hotkeys__item--shortcut">
						<kbd>{{{ ctrlLabel }}}</kbd>
						<kbd>I</kbd>
					</div>
				</li>

				<li class="refraction-hotkeys__item">
					<div class="refraction-hotkeys__item--label"><?php echo esc_html__( 'Page Settings', 'refraction' ); ?></div>
					<div class="refraction-hotkeys__item--shortcut">
						<kbd>{{{ ctrlLabel }}}</kbd>
						<kbd>Shift</kbd>
						<kbd>Y</kbd>
					</div>
				</li>

				<li class="refraction-hotkeys__item">
					<div class="refraction-hotkeys__item--label"><?php echo esc_html__( 'History', 'refraction' ); ?></div>
					<div class="refraction-hotkeys__item--shortcut">
						<kbd>{{{ ctrlLabel }}}</kbd>
						<kbd>Shift</kbd>
						<kbd>H</kbd>
					</div>
				</li>

				<li class="refraction-hotkeys__item">
					<div class="refraction-hotkeys__item--label"><?php echo esc_html__( 'User Preferences', 'refraction' ); ?></div>
					<div class="refraction-hotkeys__item--shortcut">
						<kbd>{{{ ctrlLabel }}}</kbd>
						<kbd>Shift</kbd>
						<kbd>U</kbd>
					</div>
				</li>

			</ul>

		</div>

		<div class="refraction-hotkeys__col">

			<h3 class="refraction-hotkeys__header"><?php echo esc_html__( 'Go To', 'refraction' ); ?></h3>

			<ul class="refraction-hotkeys__list">

				<li class="refraction-hotkeys__item">
					<div class="refraction-hotkeys__item--label"><?php echo esc_html__( 'Responsive Mode', 'refraction' ); ?></div>
					<div class="refraction-hotkeys__item--shortcut">
						<kbd>{{{ ctrlLabel }}}</kbd>
						<kbd>Shift</kbd>
						<kbd>M</kbd>
					</div>
				</li>

				<li class="refraction-hotkeys__item">
					<div class="refraction-hotkeys__item--label"><?php echo esc_html__( 'Template Library', 'refraction' ); ?></div>
					<div class="refraction-hotkeys__item--shortcut">
						<kbd>{{{ ctrlLabel }}}</kbd>
						<kbd>Shift</kbd>
						<kbd>L</kbd>
					</div>
				</li>

				<?php if ( Utils::has_pro() ) : ?>
				<li class="refraction-hotkeys__item">
					<div class="refraction-hotkeys__item--label"><?php echo esc_html__( 'Notes', 'refraction' ); ?></div>
					<div class="refraction-hotkeys__item--shortcut">
						<kbd>Shift</kbd>
						<kbd>C</kbd>
					</div>
				</li>
				<?php endif ?>

				<li class="refraction-hotkeys__item">
					<div class="refraction-hotkeys__item--label"><?php echo esc_html__( 'Keyboard Shortcuts', 'refraction' ); ?></div>
					<div class="refraction-hotkeys__item--shortcut">
						<kbd>Shift</kbd>
						<kbd>?</kbd>
					</div>
				</li>

				<li class="refraction-hotkeys__item">
					<div class="refraction-hotkeys__item--label"><?php echo esc_html__( 'Quit', 'refraction' ); ?></div>
					<div class="refraction-hotkeys__item--shortcut">
						<kbd>Esc</kbd>
					</div>
				</li>

			</ul>

		</div>

	</div>
</script>
