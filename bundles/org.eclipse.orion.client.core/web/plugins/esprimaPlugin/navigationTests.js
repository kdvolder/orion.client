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

// tests for javascript navigation, both in-file and out
/*global define esprima console setTimeout esprimaContentAssistant*/
define(["plugins/esprimaPlugin/esprimaJsContentAssist", "orion/assert"], function(mEsprimaPlugin, assert) {
	
	//////////////////////////////////////////////////////////
	// helpers
	//////////////////////////////////////////////////////////
	
	function MockIndexer(amdDeps) {
		function createSummary(buffer, name) {
			var esprimaContentAssistant = new mEsprimaPlugin.EsprimaJavaScriptContentAssistProvider();
			return esprimaContentAssistant.computeSummary(buffer, name);
		}
		
		this.retrieveGlobalSummaries = function() { };
	
		this.retrieveSummary = function(name) {
			return amdDeps ? createSummary(amdDeps[name], name) : null;
		};
	}
	
	function computeDefinition(buffer, toFind, indexer) {
		var offset = buffer.lastIndexOf(toFind)+1;
		if (!indexer) {
			indexer = new MockIndexer({});
		}
		
		var esprimaContentAssistant = new mEsprimaPlugin.EsprimaJavaScriptContentAssistProvider(indexer);
		return esprimaContentAssistant.findDefinition(buffer, offset);
	}
		
	function assertDefinition(expected, actual) {
		if (!actual) {
			assert.fail("No definition found for:\n" + expected.hover );
		}
		assert.equal(actual.typeName, expected.typeName, "Invalid type name in definition");
		assert.equal(actual.path, expected.path, "Invalid path in definition");
		assert.equal(actual.range[0], expected.range[0], "Invalid range start in definition");
		assert.equal(actual.range[1], expected.range[1], "Invalid range end in definition");
		assert.equal(actual.hover, expected.hover, "Invalid hover in definition");
	}
	
	function createExpected(buffer, toFind, typeName, hover, path, findIndex) {
		if (!hover) {
			hover = toFind + " :: " + typeName;
		}
		var expected = {};
		expected.range = [];
		
		expected.range[0] = -1
		for (var i = 0; i < findIndex; i++) {
			expected.range[0] = buffer.indexOf(toFind, expected.range[0]+1);
		}
		expected.range[1] = expected.range[0] + toFind.length-1;
		expected.typeName = typeName;
		expected.hover = hover;
		expected.path = path;
		expected.buffer = buffer;
		return expected;
	}
	
	function doSameFileTest(buffer, toFind, typeName, hover, findIndex) {
		if (!findIndex) { findIndex = 1; }
		var expected = createExpected(buffer, toFind, typeName, hover, null, findIndex);
		var actual = computeDefinition(buffer, toFind);
		assertDefinition(expected, actual);
	}
	function doMultiFileTest(otherFile, otherBuffer, buffer, toFind, typeName, hover, findIndex) {
		if (!findIndex) { findIndex = 1; }
		var expected = createExpected(otherBuffer, toFind, typeName, hover, otherFile, findIndex);
		var buffers = { };
		buffers[otherFile] = otherBuffer;
		var actual = computeDefinition(buffer, toFind, new MockIndexer(buffers));
		assertDefinition(expected, actual);
	}


	var tests = {};

	//////////////////////////////////////////////////////////
	// tests in same file
	//////////////////////////////////////////////////////////
	tests.testVar1 = function() {
		doSameFileTest("var aaa = 9\naaa", 'aaa', 'Number');
	};
	tests.testVar2 = function() {
		doSameFileTest("var aaa = function(a,b,c) { return 9; }\naaa", 'aaa', "?Number:a,b,c", 'aaa :: (a,b,c) -> Number');
	};
	tests.testVar3 = function() {
		doSameFileTest("var aaa = function(a,b,c) { return function(a) { return 9; }; }\naaa", 
			'aaa', "??Number:a:a,b,c", 'aaa :: (a,b,c) -> (a) -> Number');
	};
	tests.testParam1 = function() {
		doSameFileTest("var bbb = function(a,b,d) { d }", 
			'd', "gen~local~3", 'd :: {  }');
	};
	tests.testParam2 = function() {
		doSameFileTest("var d = 9;var bbb = function(a,b,d) { d }", 
			'd', "gen~local~3", 'd :: {  }', 2);
	};
	tests.testParam3 = function() {
		doSameFileTest("var d = 9;var bbb = function(a,b,d) {  }\nd", 
			'd', "Number", 'd :: Number', 1);
	};
	
	
	//////////////////////////////////////////////////////////
	// tests in same other file
	//////////////////////////////////////////////////////////
	tests.testAMD1 = function() {
		doMultiFileTest( "file1", "define({ val1 : 9 });",
			"define(['file1'], function(f1) { f1.val1; });", 
			'val1', "Number", 'val1 :: Number');
	}
	tests.testAMD2 = function() {
		doMultiFileTest( "file1", "define({ val1 : function() { return 9; } });",
			"define(['file1'], function(f1) { f1.val1; });", 
			'val1', "?Number:", 'val1 :: () -> Number');
	}
	
	
	return tests;
});
