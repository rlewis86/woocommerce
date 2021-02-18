/*global wc_geolocation_params */
jQuery( function( $ ) {

	var this_page = window.location.toString();

	/**
	 * If the provided hash does not match the hash from the wc_geolocation_params object,
	 * perform a redirect (this effectively 'defeats' page caching, if enabled, allowing
	 * the customer sees pricing etc tailored to their region).
	 *
	 * @param {string} geolocationHash Hash used to indicate the current customer's location.
	 */
	function maybeRedirect( geolocationHash ) {
		// If the current hash is different from the hash contained in the wc_geolocation_params
		// object (which could have been page-cached), update our cookie-based cache and redirect.
		if ( geolocationHash !== wc_geolocation_params.hash ) {
			$geolocation_redirect( geolocationHash );
		}
	}

	var $append_hashes = function() {
		if ( wc_geolocation_params.hash ) {
			$( 'a[href^="' + wc_geolocation_params.home_url + '"]:not(a[href*="v="]), a[href^="/"]:not(a[href*="v="])' ).each( function() {
				var $this      = $( this ),
					href       = $this.attr( 'href' ),
					href_parts = href.split( '#' );

				href = href_parts[0];

				if ( href.indexOf( '?' ) > 0 ) {
					href = href + '&v=' + wc_geolocation_params.hash;
				} else {
					href = href + '?v=' + wc_geolocation_params.hash;
				}

				if ( typeof href_parts[1] !== 'undefined' && href_parts[1] !== null ) {
					href = href + '#' + href_parts[1];
				}

				$this.attr( 'href', href );
			});
		}
	};

	var $geolocation_redirect = function( hash ) {
		if ( this_page.indexOf( '?v=' ) > 0 || this_page.indexOf( '&v=' ) > 0 ) {
			this_page = this_page.replace( /v=[^&]+/, 'v=' + hash );
		} else if ( this_page.indexOf( '?' ) > 0 ) {
			this_page = this_page + '&v=' + hash;
		} else {
			this_page = this_page + '?v=' + hash;
		}

		window.location = this_page;
	};

	var $geolocate_customer = {
		url: wc_geolocation_params.wc_ajax_url.toString().replace( '%%endpoint%%', 'get_customer_location' ),
		type: 'GET',
		success: function( response ) {
			if ( response.success && response.data.hash ) {
				// Store the updated hash in a cookie for 1hr (expiration units are days).
				Cookies.set( 'woocommerce_geo_hash', response.data.hash, { expires: 1/24 } );
				maybeRedirect( response.data.hash );
			}
		}
	};

	if ( '1' === wc_geolocation_params.is_available ) {
		// To prevent unnecessary ajax requests, let's first check to see if the hash was recently
		// cached as a cookie.
		var storedHash = Cookies.get( 'woocommerce_geo_hash' ) || null;

		// If the hash wasn't cached, get a new hash via an ajax request.
		if ( storedHash === null || storedHash.length < 1 ) {
			$.ajax( $geolocate_customer );
		} else {
			maybeRedirect( storedHash );
		}

		// Support form elements
		$( 'form' ).each( function() {
			var $this  = $( this );
			var method = $this.attr( 'method' );
			var hasField = $this.find('input[name="v"]').length > 0;

			if ( method && 'get' === method.toLowerCase() && !hasField ) {
				$this.append( '<input type="hidden" name="v" value="' + wc_geolocation_params.hash + '" />' );
			} else {
				var href = $this.attr( 'action' );
				if ( href ) {
					if ( href.indexOf( '?' ) > 0 ) {
						$this.attr( 'action', href + '&v=' + wc_geolocation_params.hash );
					} else {
						$this.attr( 'action', href + '?v=' + wc_geolocation_params.hash );
					}
				}
			}
		});

		// Append hashes on load
		$append_hashes();
	}

	$( document.body ).on( 'added_to_cart', function() {
		$append_hashes();
	});

	// Enable user to trigger manual append hashes on AJAX operations
	$( document.body ).on( 'woocommerce_append_geo_hashes', function() {
		$append_hashes();
	});

});
