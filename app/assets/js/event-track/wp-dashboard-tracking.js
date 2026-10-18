import NavigationTracking from './dashboard/navigation';
import PluginActions from './dashboard/plugin-actions';
import PromotionTracking from './dashboard/promotion';
import ScreenViewTracking from './dashboard/screen-view';
import MenuPromotionTracking from './dashboard/menu-promotion';
import ActionControlTracking from './dashboard/action-controls';

const SESSION_TIMEOUT_MINUTES = 30;
const MINUTE_MS = 60 * 1000;
const SESSION_TIMEOUT = SESSION_TIMEOUT_MINUTES * MINUTE_MS;
const ACTIVITY_CHECK_INTERVAL = 1 * MINUTE_MS;
const SESSION_STORAGE_KEY = 'refraction_wpdash_session';
const PENDING_NAV_CLICK_KEY = 'refraction_wpdash_pending_nav';

export const CONTROL_TYPES = {
	BUTTON: 'button',
	CHECKBOX: 'checkbox',
	RADIO: 'radio',
	LINK: 'link',
	SELECT: 'select',
	TOGGLE: 'toggle',
	FILTER: 'filter',
};

export const NAV_AREAS = {
	LEFT_MENU: 'left_menu',
	SUBMENU: 'submenu',
	HOVER_MENU: 'hover_menu',
	TOP_BAR: 'top_bar',
	SIDEBAR_MENU: 'sidebar',
};

export const SCREEN_TYPES = {
	TAB: 'tab',
	POPUP: 'popup',
	APP_SCREEN: 'app_screen',
};

export default class WpDashboardTracking {
	static anyPageWithRefractionString = 'refraction';

	static refractionPages = [
		this.anyPageWithRefractionString,
		'e-form-submissions',
		'popup_templates',
	];

	static refractionPostTypes = [
		'refraction_library',
		'e-floating-buttons',
		'refraction_snippet',
		'refraction_font',
		'refraction_icons',
	];

	static sessionStartTime = Date.now();
	static lastActivityTime = Date.now();
	static sessionEnded = false;
	static navItemsVisited = new Set();
	static activityCheckInterval = null;
	static initialized = false;
	static navigationListeners = [];
	static isNavigatingToRefraction = false;

	static getRefractionCommon() {
		return window.refractionCommon;
	}

	static init() {
		if ( this.initialized ) {
			return;
		}

		this.restoreOrCreateSession();

		if ( this.isEventsManagerAvailable() ) {
			this.startSessionMonitoring();
			this.attachActivityListeners();
			this.attachNavigationListener();
			this.initialized = true;
		}
	}

	static restoreOrCreateSession() {
		const storedSession = this.getStoredSession();

		if ( storedSession ) {
			this.sessionStartTime = storedSession.sessionStartTime;
			this.navItemsVisited = new Set( storedSession.navItemsVisited );
			this.lastActivityTime = Date.now();
			this.sessionEnded = false;
		} else {
			this.sessionStartTime = Date.now();
			this.lastActivityTime = Date.now();
			this.sessionEnded = false;
			this.navItemsVisited = new Set();
		}

		this.processPendingNavClick();
		this.saveSessionToStorage();
	}

	static isEditorOneActive() {
		const refractionCommon = this.getRefractionCommon();
		return refractionCommon?.config?.editor_events?.isEditorOneActive ?? false;
	}

	static processPendingNavClick() {
		try {
			const pendingNav = sessionStorage.getItem( PENDING_NAV_CLICK_KEY );

			if ( pendingNav ) {
				const { itemId, rootItem, area } = JSON.parse( pendingNav );
				this.navItemsVisited.add( itemId );

				const properties = {
					wpdash_nav_item_id: itemId,
					wpdash_nav_area: area,
				};

				if ( rootItem ) {
					properties.wpdash_nav_item_root = rootItem;
				}

				this.dispatchEvent( 'wpdash_nav_clicked', properties, { send_immediately: true } );
				sessionStorage.removeItem( PENDING_NAV_CLICK_KEY );
			}
		} catch ( error ) {
			sessionStorage.removeItem( PENDING_NAV_CLICK_KEY );
		}
	}

	static getStoredSession() {
		try {
			const stored = sessionStorage.getItem( SESSION_STORAGE_KEY );
			return stored ? JSON.parse( stored ) : null;
		} catch ( error ) {
			return null;
		}
	}

	static saveSessionToStorage() {
		const sessionData = {
			sessionStartTime: this.sessionStartTime,
			navItemsVisited: Array.from( this.navItemsVisited ),
		};
		sessionStorage.setItem( SESSION_STORAGE_KEY, JSON.stringify( sessionData ) );
	}

	static clearStoredSession() {
		sessionStorage.removeItem( SESSION_STORAGE_KEY );
	}

	static isEventsManagerAvailable() {
		const refractionCommon = this.getRefractionCommon();

		return refractionCommon?.eventsManager &&
			'function' === typeof refractionCommon.eventsManager.dispatchEvent;
	}

	static canSendEvents() {
		const refractionCommon = this.getRefractionCommon();
		return refractionCommon?.config?.editor_events?.can_send_events ?? false;
	}

	static dispatchEvent( eventName, properties = {}, options = {} ) {
		if ( ! this.isEventsManagerAvailable() || ! this.canSendEvents() ) {
			return;
		}

		const refractionCommon = this.getRefractionCommon();
		refractionCommon?.eventsManager?.dispatchEvent( eventName, properties, options );
	}

	static updateActivity() {
		this.lastActivityTime = Date.now();
	}

	static startSessionMonitoring() {
		this.activityCheckInterval = setInterval( () => {
			this.checkSessionTimeout();
		}, ACTIVITY_CHECK_INTERVAL );

		window.addEventListener( 'beforeunload', () => {
			if ( ! this.sessionEnded && ! this.isNavigatingToRefraction ) {
				this.trackSessionEnd( 'tab_closed' );
			}
		} );

		document.addEventListener( 'visibilitychange', () => {
			if ( ! this.sessionEnded && document.hidden ) {
				const timeSinceLastActivity = Date.now() - this.lastActivityTime;
				if ( timeSinceLastActivity > SESSION_TIMEOUT ) {
					this.trackSessionEnd( 'tab_inactive' );
				}
			}
		} );
	}

	static isRefractionPage( url ) {
		try {
			const urlObj = new URL( url, window.location.origin );
			const params = urlObj.searchParams;

			const page = params.get( 'page' );
			const postType = params.get( 'post_type' );
			const action = params.get( 'action' );

			return !! ( ( page && this.refractionPages.some( ( p ) => page.includes( p ) ) ) ||
				( postType && this.refractionPostTypes.includes( postType ) ) ||
				( action && action.includes( this.anyPageWithRefractionString ) ) );
		} catch ( error ) {
			return false;
		}
	}

	static isPluginsPage( url ) {
		try {
			const urlObj = new URL( url, window.location.origin );
			return urlObj.pathname.includes( 'plugins.php' );
		} catch ( error ) {
			return false;
		}
	}

	static isNavigatingAwayFromRefraction( targetUrl ) {
		if ( ! targetUrl ) {
			return false;
		}

		if ( targetUrl.startsWith( '#' ) ) {
			return false;
		}

		return ! this.isRefractionPage( targetUrl );
	}

	static isLinkOpeningInNewTab( link ) {
		const target = link.getAttribute( 'target' );
		return '_blank' === target || '_new' === target;
	}

	static attachNavigationListener() {
		const handleLinkClick = ( event ) => {
			const link = event.target.closest( 'a' );
			if ( link && link.href ) {
				if ( this.isLinkOpeningInNewTab( link ) ) {
					return;
				}

				if ( ! this.sessionEnded && this.isNavigatingAwayFromRefraction( link.href ) ) {
					this.trackSessionEnd( 'navigate_away' );
				} else if ( this.isRefractionPage( link.href ) ) {
					this.isNavigatingToRefraction = true;
				}
			}

			const isSidebar = event.target.closest( '#editor-one-sidebar-navigation' );
			if ( isSidebar ) {
				this.isNavigatingToRefraction = true;
			}
		};

		const handleFormSubmit = ( event ) => {
			const form = event.target;
			if ( form.action ) {
				if ( ! this.sessionEnded && this.isNavigatingAwayFromRefraction( form.action ) ) {
					this.trackSessionEnd( 'navigate_away' );
				} else if ( this.isRefractionPage( form.action ) ) {
					this.isNavigatingToRefraction = true;
				}
			}
		};

		document.addEventListener( 'click', handleLinkClick, true );
		document.addEventListener( 'submit', handleFormSubmit, true );

		this.navigationListeners.push(
			{ type: 'click', handler: handleLinkClick },
			{ type: 'submit', handler: handleFormSubmit },
		);
	}

	static checkSessionTimeout() {
		const timeSinceLastActivity = Date.now() - this.lastActivityTime;

		if ( timeSinceLastActivity > SESSION_TIMEOUT && ! this.sessionEnded ) {
			this.trackSessionEnd( 'timeout' );
		}
	}

	static attachActivityListeners() {
		const events = [ 'mousedown', 'keydown', 'scroll', 'touchstart', 'click' ];

		events.forEach( ( event ) => {
			document.addEventListener( event, () => {
				this.updateActivity();
			}, { capture: true, passive: true } );
		} );
	}

	static formatDuration( milliseconds ) {
		const totalSeconds = Math.floor( milliseconds / 1000 );
		return Number( ( totalSeconds ).toFixed( 2 ) );
	}

	static trackNavClicked( itemId, rootItem = null, area = NAV_AREAS.LEFT_MENU ) {
		if ( ! this.initialized ) {
			const pendingNav = { itemId, rootItem, area };
			sessionStorage.setItem( PENDING_NAV_CLICK_KEY, JSON.stringify( pendingNav ) );
			return;
		}

		this.updateActivity();

		this.navItemsVisited.add( itemId );
		this.saveSessionToStorage();

		const properties = {
			wpdash_nav_item_id: itemId,
			wpdash_nav_area: area,
		};

		if ( rootItem ) {
			properties.wpdash_nav_item_root = rootItem;
		}

		this.dispatchEvent( 'wpdash_nav_clicked', properties );
	}

	static trackScreenViewed( screenId, screenType = SCREEN_TYPES.TAB ) {
		this.updateActivity();

		const properties = {
			wpdash_screen_id: screenId,
			wpdash_screen_type: screenType,
		};

		this.dispatchEvent( 'wpdash_screen_viewed', properties );
	}

	static trackActionControl( controlIdentifier, controlType ) {
		this.updateActivity();

		const properties = {
			wpdash_action_control_interacted: controlIdentifier,
			wpdash_control_type: controlType,
		};

		this.dispatchEvent( 'wpdash_action_control', properties );
	}

	static trackPromoClicked( promoName, destination, clickPath ) {
		this.updateActivity();

		const properties = {
			wpdash_promo_name: promoName,
			wpdash_promo_destination: destination,
			wpdash_promo_clicked_path: clickPath,
		};

		this.dispatchEvent( 'wpdash_promo_clicked', properties );
	}

	static trackSessionEnd( reason = 'timeout' ) {
		if ( this.sessionEnded ) {
			return;
		}

		this.sessionEnded = true;

		if ( this.activityCheckInterval ) {
			clearInterval( this.activityCheckInterval );
			this.activityCheckInterval = null;
		}

		const duration = Date.now() - this.sessionStartTime;

		const properties = {
			wpdash_endstate_nav_summary: Array.from( this.navItemsVisited ),
			wpdash_endstate_nav_count: this.navItemsVisited.size,
			wpdash_endstate_duration: this.formatDuration( duration ),
			reason,
		};

		this.dispatchEvent( 'wpdash_session_end_state', properties );
		this.clearStoredSession();
	}

	static destroy() {
		if ( this.activityCheckInterval ) {
			clearInterval( this.activityCheckInterval );
		}

		this.navigationListeners.forEach( ( { type, handler } ) => {
			document.removeEventListener( type, handler, true );
		} );

		this.navigationListeners = [];

		ScreenViewTracking.destroy();
		PromotionTracking.destroy();
		MenuPromotionTracking.destroy();
		ActionControlTracking.destroy();

		this.initialized = false;
	}
}

window.addEventListener( 'refraction/admin/init', () => {
	const currentUrl = window.location.href;
	const isPluginsPage = WpDashboardTracking.isPluginsPage( currentUrl );
	const isRefractionPage = WpDashboardTracking.isRefractionPage( currentUrl );

	if ( isPluginsPage ) {
		PluginActions.init();
	}

	NavigationTracking.init();

	if ( isRefractionPage ) {
		WpDashboardTracking.init();
		ScreenViewTracking.init();
		PromotionTracking.init();
		MenuPromotionTracking.init();
		ActionControlTracking.init();
	}
} );

window.addEventListener( 'beforeunload', () => {
	NavigationTracking.destroy();
	PluginActions.destroy();
	WpDashboardTracking.destroy();
} );
