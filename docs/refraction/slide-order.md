# Slides of nested widgets: order, Structure (0.138.0)

A nested widget (Timed Slides, Focus Stack, Showcase Wheel, Dynamic Container, Nested Carousel, Mega Menu, Off-Canvas,
Tabs, Accordion, Form Builder steps) keeps two lists that must stay in step: its repeater rows (title, picture,
background and other per-slide settings) and its child containers (the slide's content). The nested-repeater hooks
move, duplicate and remove the container with the row.

## What was wrong

- `findChildContainerOrFail( widget, index )` took `view.children.findByIndex( index )`. Marionette keeps child views
  in the order they were made, not the elements' order, so once a slide had been moved or added the next move,
  duplicate or remove acted on another slide's container: content and settings swapped. It now finds the view of the
  element at that index (`model.get( 'elements' ).at( index )`).
- Widgets that give each child its own slot (`child_container_placeholder_selector`: Showcase Wheel, Mega Menu,
  Accordion, steps): the widget redraws its slots in the new order, then the moved container was inserted next to its
  old neighbour, inside that neighbour's slot. `NestedViewBase.attachHtml()` now puts the child into the slot of its
  place and `placeChildrenInSlots()` puts every child back into its own (also after a removal); a slot is this widget's
  own, not one of a widget of the same kind inside a slide.

## Structure

- `refraction.helpers.getNestedItem( id )` gives a nested widget's slide and its row (owner, repeater name, index,
  row, title key).
- A slide's title in Structure is its row's title (`elementModel.getNestedItemTitle()`); Structure redraws the titles
  after any `document/repeater/*` command and any change of a row (`navigator.js`).
- Renaming a slide in Structure also sets its row's title (`exitTitleEditing()`).
- Its context menu (Structure and the canvas): Duplicate runs `document/repeater/duplicate`, Delete
  `document/repeater/remove` (disabled for the last slide); "Copy <widget>" copies the widget (0.137.0).
- A click scrolls to the outermost nested widget holding the element (`getScrollTarget()`), not to the slide, which
  may be hidden or off to the side until the widget shows it; the existing `panel/editor/open` hook then selects the
  slide.

## Check

`node scripts/check-slide-order.mjs --site DIR --port N`.
