"use strict";

var MAX_PARALLEL = 3;

module.exports = function(grunt) {

	require('load-grunt-tasks')(grunt);

	grunt.initConfig({
		'connect': {
			testserver: {
				options: {
					// We use end2end task (which does not start the webserver)
					// and start the webserver as a separate process
					// to avoid https://github.com/joyent/libuv/issues/826
					port: 8000,
					hostname: '0.0.0.0',
					middleware: function(connect, options) {
						return [
							function(req, resp, next) {
								// cache get requests to speed up tests on travis
								if (req.method === 'GET') {
									resp.setHeader('Cache-control', 'public, max-age=3600');
								}

								next();
							},
							connect.static(options.base)
						];
					}
				}
			}
		},

		'packager': {

			options: {
				name: 'Core'
			},

			all: {
				src: 'Source/**/*.js',
				dest: 'mootools-all.js'
			},

			nocompat: {
				options: {
					strip: ['.*compat'],
					only: '<%= grunt.option("file") && "Core/" + grunt.option("file") %>'
				},
				src: 'Source/**/*.js',
				dest: 'mootools-nocompat.js'
			},

			specs: {
				options: {
					name: 'Specs'
				},
				src: 'Specs/<%= grunt.option("module") || "**" %>/<%= grunt.option("file") || "*" %>.js',
				dest: 'mootools-specs.js'
			},

			'specs-nocompat': {
				options: {
					name: 'Specs',
					strip: ['.*compat'],
					only: '<%= grunt.option("file") && "Specs/" + grunt.option("file") %>'
				},
				src: 'Specs/**/*.js',
				dest: 'mootools-specs.js'
			}

		},

		'karma': {

			options: {
				captureTimeout: 60000 * 2,
				singleRun: true,
				frameworks: ['jasmine', 'sinon'],
				files: ['Tests/Utilities/*.js', 'mootools-*.js'],
				sauceLabs: {
					username: process.env.SAUCE_USERNAME,
					accessKey: process.env.SAUCE_ACCESS_KEY,
					testName: 'MooTools-Core'
				}
			},

			continuous: {
				browsers: ['PhantomJS']
			},

			dev: {
				singleRun: false,
				browsers: ['PhantomJS'],
				reporters: 'dots'
			}

		},

		'clean': {
			all: {
				src: 'mootools-*.js'
			}
		}

	});

	grunt.registerTask('default', ['clean', 'packager:all', 'packager:specs', 'karma:continuous']);
	grunt.registerTask('nocompat', ['clean', 'packager:nocompat', 'packager:specs-nocompat', 'karma:continuous']);

	grunt.registerTask('sauce', 'Launch specs against SauceLabs™ VMs', function(){

		grunt.task.run(['clean', 'packager:all', 'packager:specs']);

		var browsers = {
			chrome_linux:  { browserName: 'chrome', platform: 'linux' },
			firefox_linux: { browserName: 'firefox', platform: 'linux' },
			opera_win2000: { browserName: 'opera', platform: 'Windows 2008', version: '12'}
		};

		var set = [];
		for (var i in browsers){
			browsers[i].base = 'SauceLabs';
			set.push([i, browsers[i]]);
		}

		var nset = [];
		while (set.length) nset.push(set.splice(0, MAX_PARALLEL))

		grunt.task.run(nset.map(function(set, i){
			var browsers = {};
			set.forEach(function(bits){
				browsers[bits[0]] = bits[1];
			});

			grunt.config.set('karma.sauce' + i, {
				port: 9876,
				customLaunchers: browsers,
				browsers: Object.keys(browsers),
				reporters: 'saucelabs'
			});

			return 'karma:sauce' + i;
		}));
	});

};
