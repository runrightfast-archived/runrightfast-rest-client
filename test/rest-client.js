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

'use strict';
var expect = require('chai').expect;

var logRoutePath = '/api/runrightfast-logging-service/log';

function startServer(callback) {
	var Hapi = require('hapi');

	var manifest = {
		pack : {},
		servers : [ {
			port : 8000,
			options : {
				labels : [ 'web' ]
			}
		} ],
		plugins : {
			'lout' : {},
			'furball' : {},
			'runrightfast-logging-service-hapi-plugin' : {
				logRoutePath : logRoutePath
			}
		}
	};

	var composer = new Hapi.Composer(manifest);

	composer.compose(function(err) {
		if (err) {
			console.error('Failed composing servers : ' + err.message);
			callback(err);
		} else {
			console.log('Hapi is composed.');
			composer.start(function() {
				console.log('All servers started');
				callback();
			});
		}
	});

	return composer;
}

var Request = function(event) {
	this.path = logRoutePath;
	this.entity = event;
	this.headers = {
		"Content-Type" : 'application/json'
	};
};

describe('REST client', function() {
	var composer = null;

	beforeEach(function(done) {
		composer = startServer(done);
	});

	afterEach(function(done) {
		composer.stop({
			timeout : 1000
		}, function() {
			console.log('All servers stopped');
			done();
		});
	});

	it('log one valid event', function(done) {
		var loggingClient = require('..')({
			baseUrl : 'http://localhost:8000'
		});
		var event = {
			tags : [ 'info' ],
			data : 'test : log a valid event'
		};

		loggingClient(new Request(event)).then(function(response) {
			done();
		}, function(response) {
			var info = {
				statusCode : response.status.code,
				statusText : response.status.text,
				entity : response.entity
			};
			done(new Error('log request failed: ' + JSON.stringify(info)));
		});

	});

	it('allows the mime rest interceptor to be disabled', function(done) {
		var loggingClient = require('..')({
			baseUrl : 'http://localhost:8000',
			mime : false
		});
		var event = {
			tags : [ 'info' ],
			data : 'test : log a valid event'
		};

		loggingClient(new Request(JSON.stringify(event))).then(function(response) {
			done();
		}, function(response) {
			var info = {
				statusCode : response.status.code,
				statusText : response.status.text,
				entity : response.entity
			};
			done(new Error('log request failed: ' + JSON.stringify(info)));
		});

	});

	it('allows the mime rest interceptor to be configured', function(done) {
		var loggingClient = require('..')({
			baseUrl : 'http://localhost:8000',
			mime : {
				mime : 'application/json'
			}
		});
		var event = {
			tags : [ 'info' ],
			data : 'test : log a valid event'
		};

		var request = {
			path : logRoutePath,
			entity : event
		};

		loggingClient(request).then(function(response) {
			done();
		}, function(response) {
			var info = {
				statusCode : response.status.code,
				statusText : response.status.text,
				entity : response.entity
			};
			done(new Error('log request failed: ' + JSON.stringify(info)));
		});

	});

	it('allows the retry rest interceptor to be disabled', function(done) {
		var loggingClient = require('..')({
			baseUrl : 'http://localhost:8000',
			retry : false
		});
		var event = {
			tags : [ 'info' ],
			data : 'test : log a valid event'
		};

		loggingClient(new Request(event)).then(function(response) {
			done();
		}, function(response) {
			var info = {
				statusCode : response.status.code,
				statusText : response.status.text,
				entity : response.entity
			};
			done(new Error('log request failed: ' + JSON.stringify(info)));
		});

	});

	it('allows the retry rest interceptor to be set to true, which uses the defaults', function(done) {
		var loggingClient = require('..')({
			baseUrl : 'http://localhost:8000',
			retry : true
		});
		var event = {
			tags : [ 'info' ],
			data : 'test : log a valid event'
		};

		loggingClient(new Request(event)).then(function(response) {
			done();
		}, function(response) {
			var info = {
				statusCode : response.status.code,
				statusText : response.status.text,
				entity : response.entity
			};
			done(new Error('log request failed: ' + JSON.stringify(info)));
		});

	});

	it('log a valid event with timeout of 100 msec', function(done) {
		var i;
		var loggingClient = require('..')({
			baseUrl : 'http://localhost:8000',
			timeout : 100
		});
		var event = {
			tags : [ 'info' ],
			data : 'test : log a valid event with timeout of 100 msec'
		};

		var responseCount = 0;
		for (i = 0; i < 10; i++) {
			loggingClient(new Request(event)).then(function(response) {
				responseCount++;
				if (responseCount == 10) {
					done();
				}
			}, function(response) {
				var info = {
					statusCode : response.status.code,
					statusText : response.status.text,
					entity : response.entity
				};
				done(new Error('log request failed: ' + JSON.stringify(info)));
			});
		}

	});

	it('log a valid event to an invalid URL', function(done) {
		var loggingClient = require('..')({
			baseUrl : 'http://localhost:8000',
			timeout : 10,
			retry : {
				initial : 1,
				multiplier : 2,
				max : 2
			},
			logLevel : 'DEBUG',
			errorCallback : function() {
				done();
			}
		});
		var event = {
			tags : [ 'info' ],
			data : 'test : log a valid event to an invalid URL'
		};

		loggingClient({
			path : 'XXX',
			entity : event,
			headers : {
				"Content-Type" : 'application/json'
			}
		}).then(function(response) {
			done(new Error('Expected request to fail'));
		}, function(response) {
			done();
		});
	});

	it('log an invalid event', function(done) {
		var loggingClient = require('..')({
			baseUrl : 'http://localhost:8000'
		});
		var event = {
			data : 'test : log an invalid event'
		};

		loggingClient(new Request(event)).then(function(response) {
			done(new Error('Expected request to fail'));
		}, function(response) {
			done();
		});
	});

});