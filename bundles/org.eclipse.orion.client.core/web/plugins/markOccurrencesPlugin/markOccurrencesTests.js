/*******************************************************************************
 * @license
 * Copyright (c) 2012 Contributors
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 *
 * Contributors:
 *     Andrew Eisenberg (vmware) - initial API and implementation
 *******************************************************************************/

/*global define markOccurrences*/
define(["./markOccurrences", "orion/assert"], function(markOccurrences, assert) {
	
	function testIsIdentifier(id) {
		assert.ok(markOccurrences._testObj.isIdentifier(id), id + " should be an identifier");
	}
	function testNotIdentifier(id) {
		assert.ok(!markOccurrences._testObj.isIdentifier(id), id + " should NOT be an identifier");
	}
	
	function testLocations(str, toFind) {
		var expected = [];
		var i = -1;
		do {
			i = str.indexOf(toFind, i+1);
			if (i >= 0) {
				if (i > 0) {
					if (str.charAt(i -1).match(/[a-zA-Z0-9\$_]/)) { 
						continue;
					}
				}
				if (i + toFind.length < str.length) {
					if (str.charAt(i + toFind.length).match(/[a-zA-Z0-9\$_]/)) { 
						continue;
					}
				}
				expected.push({
					start: i,
					end: i + toFind.length,
					title: "Occurrence of '" + toFind + "'"
				});
			}
		} while (i >= 0);
		
		var actual = markOccurrences._testObj.findLocations(str, toFind);
		assert.deepEqual(actual, expected, "Looking for: " + toFind + " in:\n" + str);
	}
	
	var tests = {};
	tests.testIsIdentifier = function() {
		testIsIdentifier("hi");
		testIsIdentifier("hi_fdsafdsa_fdfdsasfd");
		testIsIdentifier("$hi_fdsafdsa_fdfdsasfd");
		testIsIdentifier("$999");
		testIsIdentifier("$");
		testIsIdentifier("_");
	};
	
	tests.testNotIdentifier = function() {
		testNotIdentifier("999");
		testNotIdentifier("9aa");
		testNotIdentifier("9__");
		testNotIdentifier("foo.bar");
	};
	
	tests.testLocation1 = function() {
		testLocations("o", "o");
		testLocations("o p o  o", "o");
		testLocations("$o p o  $o", "$o");
		testLocations("$o p o  $o", "o");
		testLocations("$o p$o o $op $o", "$o");
		testLocations("9 99 999 $9 9$", "9");
		testLocations("9.9.9.$9/9$", "9");
	};
	
	
	return tests;
	
});