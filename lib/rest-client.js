/**
 * Copyright [2013] [runrightfast.co]
 * 
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not
 * use this file except in compliance with the License. You may obtain a copy of
 * the License at
 * 
 * http://www.apache.org/licenses/LICENSE-2.0
 * 
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
 * WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
 * License for the specific language governing permissions and limitations under
 * the License.
 */

/**
 * The REST client, by default, is configured for:
 * 
 * <pre>
 * 1. automatic retry
 * 2. request timeout
 * 3. content negotiation as supported by the rest module - https://github.com/cujojs/rest/blob/master/docs/mime.md#module-rest/mime/registry
 * 
 * The REST client also supports Hawk authentication - see https://github.com/hueniverse/hawk.
 * </pre>
 * 
 * options: <code>
 * var options = {
 *	baseUrl : 'http://localhost:8000'						 			// REQUIRED,  
 *  retry : { 															// OPTIONAL - Set to false to disable.
 *  	initial : 100, 													// OPTIONAL - initial delay in milliseconds after the first error response,
 *  																	//  must be > 0. Default = 100 
 *  	multiplier : 2 													// OPTIONAL - multiplier for the delay on each subsequent failure used for 
 *  																	//  exponential back offs, must be > 0. Default = 2
 *  	max : 1000 * 60 * 60 											// OPTIONAL - max delay in milliseconds, must be > 0. Default = 1 minute
 *  },
 *  timeout : 1000*30,	 												// OPTIONAL - duration in milliseconds before canceling the request. 
 *  																	//  Non-positive values disable the timeout. Default is 30 seconds
 *  mime :{																// OPTIONAL - Set to false to disable. 
 *  	mime: 'application/json'										//  see https://github.com/cujojs/rest/blob/master/docs/interceptors.md#module-rest/interceptor/mime
 *  },
 *  auth : {															// OPTIONAL - see https://github.com/hueniverse/hawk
 *  	hawk : {
 *  		credentials : {
 *			    id: 'dh37fgj492je',
 *			    key: 'werxhqb98rpaxn39848xrunpaw3489ruxnpa98w4rxn',
 *			    algorithm: 'sha256'
 *			},
 *			ext : 'app-specific-data'
 *  	}	
 *  }
 *};
 * </code>
 */
(function() {
	'use strict';

	var logging = require('runrightfast-commons').logging;
	var logger = logging.getLogger('runrighfast-rest-client');
	
	var lodash = require('lodash');
	var extend = require('extend');
	var Hoek = require('hoek');
	var assert = Hoek.assert;

	var validateConfig = function(config) {
		assert(lodash.isString(config.baseUrl), 'baseUrl is required');

		if (!lodash.isUndefined(config.retry) && !lodash.isBoolean(config.retry)) {
			if (!lodash.isUndefined(config.retry.initial)) {
				assert(lodash.isNumber(config.retry.initial) && config.retry.initial > 0, 'retry.initial must be > 0');
			}

			if (!lodash.isUndefined(config.retry.multiplier)) {
				assert(lodash.isNumber(config.retry.multiplier) && config.retry.multiplier > 0, 'retry.multiplier must be > 0');
			}

			if (!lodash.isUndefined(config.retry.max)) {
				assert(lodash.isNumber(config.retry.max) && config.retry.max > 0, 'retry.max must be > 0');
			}
		}

		if (!lodash.isUndefined(config.timeout)) {
			assert(lodash.isNumber(config.timeout), 'timeout must be a Number');
		}

		if (!lodash.isUndefined(config.mime) && !lodash.isBoolean(config.mime)) {
			if (!lodash.isUndefined(config.mime.mime)) {
				assert(lodash.isString(config.mime.mime), 'mime.mime must be a String');
			}
		}

		logging.setLogLevel(logger, config.logLevel);

	};

	var getConfig = function(options) {
		var retry = {
			initial : 100,
			multiplier : 2,
			// 1 minute
			max : 1000 * 60 * 60
		};

		var config = {
			retry : retry,
			logLevel : 'WARN',
			timeout : 1000 * 30,
			mime : {}
		};
		extend(true, config, options || {});

		if (lodash.isBoolean(config.retry) && config.retry) {
			config.retry = retry;
		}

		validateConfig(config);
		logger.debug(config);
		return config;
	};

	var createRestClient = function(config) {
		var rest = require('rest');
		var errorCode = require('rest/interceptor/errorCode');
		var retry = require('rest/interceptor/retry');
		var timeout = require('rest/interceptor/timeout');
		var pathPrefix = require('rest/interceptor/pathPrefix');
		var mime = require('rest/interceptor/mime');

		if (config.mime) {
			rest = rest.chain(mime, config.mime);
		}

		if (config.auth) {
			if (config.auth.hawk) {
				if (logger.isDebugEnabled()) {
					logger.debug('chaining hawk-auth-interceptor to rest client');
				}
				var hawk = require('runrightfast-rest-auth-hawk-interceptor');
				rest = rest.chain(hawk.interceptor, config.auth);
			}
		}

		var pathPrefixConfig = {
			prefix : config.baseUrl
		};

		var timeoutConfig = {
			timeout : config.timeout
		};

		return rest.chain(pathPrefix, pathPrefixConfig).chain(retry, config.retry).chain(timeout, timeoutConfig).chain(errorCode);
	};

	module.exports = function(options) {
		var config = getConfig(options);
		return createRestClient(config);
	};

}());
