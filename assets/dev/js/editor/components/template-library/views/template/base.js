const TemplateLibraryInsertTemplateBehavior = require( 'refraction-templates/behaviors/insert-template' );
const { isTierAtLeast, TIERS } = require( 'refraction-utils/tiers' );

const TemplateLibraryTemplateView = Marionette.ItemView.extend( {
	className() {
		let classes = 'refraction-template-library-template';
		const source = this.model.get( 'source' );

		classes += ' refraction-template-library-template-' + source;

		if ( 'remote' === source ) {
			classes += ' refraction-template-library-template-' + this.model.get( 'type' );
		}

		if ( refraction.config.library_connect.base_access_tier !== this.model.get( 'accessTier' ) ) {
			classes += ' refraction-template-library-pro-template';
		}

		return refraction.hooks.applyFilters( 'refraction/editor/template-library/template/classes', classes, this );
	},

	attributes() {
		const userAccessTier = refraction.config.library_connect.current_access_tier;
		const templateAccessTier = this.model.get( 'accessTier' );
		const canDownloadTemplate = isTierAtLeast( userAccessTier, templateAccessTier );

		// User with access to the template shouldn't see the badge.
		if ( canDownloadTemplate ) {
			return {};
		}

		const subscriptionPlans = refraction.config.library_connect.subscription_plans;
		let subscriptionPlan = subscriptionPlans[ templateAccessTier ];

		// Free user should see a generic "Pro" badge.
		if ( userAccessTier === TIERS.free ) {
			subscriptionPlan = subscriptionPlans.essential;
		}

		if ( ! subscriptionPlan ) {
			return {};
		}

		return {
			style: `--refraction-template-library-subscription-plan-label: "${ subscriptionPlan.label }";--refraction-template-library-subscription-plan-color: ${ subscriptionPlan.color };`,
		};
	},

	ui() {
		return {
			previewButton: '.refraction-template-library-template-preview',
		};
	},

	events() {
		return {
			'click @ui.previewButton': 'onPreviewButtonClick',
		};
	},

	behaviors() {
		const behaviors = {
			insertTemplate: {
				behaviorClass: TemplateLibraryInsertTemplateBehavior,
			},
		};

		return refraction.hooks.applyFilters( 'refraction/editor/template-library/template/behaviors', behaviors, this );
	},
} );

module.exports = TemplateLibraryTemplateView;
