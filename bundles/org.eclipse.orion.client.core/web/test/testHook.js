/*******************************************************************************
 * @license
 * Copyright (c) 2010, 2011 VMware and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 * 
 * Contributors: Andrew Eisenberg - initial API and implementation
 ******************************************************************************/
 /*global define window document setTimeout*/
define("test/testHook", ["orion/test", "orion/assert", "orion/plugin"], function(tester, assert) {
	return function(nestedRequire) {
	if (window.location.hash) {
		var hash;
		if (window.location.hash.charAt(0) === '#') {
			hash = window.location.hash.substring(1);
		} else {
			hash = window.location.hash;
		}
		var lastSlash = hash.lastIndexOf('/');
		var name = hash.substring(lastSlash+1, hash.length-3);
		// first check if defined in a requirejs/AMD module
		setTimeout(function() {
			nestedRequire(["testpath/"+name], function(testcase) {
				if (testcase) {
					tester.run(testcase);
				} else {
					// probably not a requirejs module check other variations
					if (window.testcase) {
						tester.run(window.testcase);
					} else if (window.tests) {
						tester.run(window.tests);
					} else if (window.test) {
						tester.run(window.test);
					} else {
						// couldn't find the tests
						tester.run({
							testNoTestsFound: function() {
								assert.fail("Test script must be an AMD module or it must define a global variable named 'testcase'");
							}
						});
					}
				}
			});
		});
	}};
});