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

/*global define esprima console setTimeout esprimaContentAssistant*/
define(["./esprimaJsContentAssist", "./indexerService", "orion/assert"], function(mEsprimaPlugin, mIndexerServicem, assert) {
	//////////////////////////////////////////////////////////
	// helpers
	//////////////////////////////////////////////////////////
	var esprimaContentAssistant = new mEsprimaPlugin.EsprimaJavaScriptContentAssistProvider();
	
	function computeSummary(fileName, buffer) {
		return esprimaContentAssistant.computeSummary(buffer, fileName);
	}

	function assertSameSummary(expectedSummaryText, actualSummary) {
		assert.equal(JSON.stringify(actualSummary), expectedSummaryText);
	}
	
	function assertCreateSummary(expectedSummaryText, buffer, fileName) {
		assertSameSummary(expectedSummaryText, computeSummary(fileName, buffer));
	}
	
	
	//////////////////////////////////////////////////////////
	// tests
	//////////////////////////////////////////////////////////
	var tests = {};

	tests.testEmpty = function() {};
	
	
	//////////////////////////////////////////////////////////
	// global dependencies
	//////////////////////////////////////////////////////////
	tests.testEmptyGlobalStructure = function() {
		assertCreateSummary('{"provided":{},"types":{},"kind":"global"}', "", "a");
	};
	
	tests.testOneVarGlobalStructure1 = function() {
		assertCreateSummary('{"provided":{"x":"Object"},"types":{},"kind":"global"}', 
			"var x;", "a");
	};
	
	tests.testOneVarGlobalStructure2 = function() {
		assertCreateSummary('{"provided":{"x":"Number"},"types":{},"kind":"global"}', 
			"var x=0;", "a");
	};
	
	tests.testOneVarGlobalStructure3 = function() {
		assertCreateSummary('{"provided":{"x":"String"},"types":{},"kind":"global"}', 
			"var x='';", "a");
	};
	
	tests.testOneVarGlobalStructure4 = function() {
		assertCreateSummary('{"provided":{"x":"gen~a~1"},"types":{"gen~a~1":{"$$proto":"Object"}},"kind":"global"}', 
			"var x={};", "a");
	};
	
	tests.testOneVarGlobalStructure5 = function() {
		assertCreateSummary('{"provided":{"x":"gen~a~1"},"types":{"gen~a~1":{"$$proto":"Object","f":"Number","g":"String"}},"kind":"global"}', 
			"var x={f:9, g:''};", "a");
	};
	
	tests.testOneVarGlobalStructure6 = function() {
		assertCreateSummary('{"provided":{"x":"?Object:"},"types":{},"kind":"global"}', 
			"var x=function() {};", "a");
	};
	
	tests.testOneVarGlobalStructure7 = function() {
		assertCreateSummary('{"provided":{"x":"?Object:a,b"},"types":{},"kind":"global"}', 
			"var x=function(a,b) {};", "a");
	};
	
	tests.testOneVarGlobalStructure8 = function() {
		assertCreateSummary('{"provided":{"x":"?Number:a,b"},"types":{},"kind":"global"}', 
			"var x=function(a,b) {return 7; };", "a");
	};
	
	tests.testOneVarGlobalStructure9 = function() {
		assertCreateSummary('{"provided":{"x":"?Number:a,b"},"types":{},"kind":"global"}', 
			"function x(a,b) {return 7; }", "a");
	};
	
	//////////////////////////////////////////////////////////
	// AMD dependencies name value pairs
	// See http://requirejs.org/docs/api.html#defsimple
	//////////////////////////////////////////////////////////
	tests.testNVP1 = function() {
		assertCreateSummary('{"provided":{"$$proto":"Object","a":"Number","b":"String"},"types":{},"kind":"AMD"}',
			"define({a : 1, b: ''});", "a");
	};

	tests.testNVP2 = function() {
		assertCreateSummary('{"provided":{"$$proto":"Object","a":"Number","b":"?Number:"},"types":{},"kind":"AMD"}',
			"define({a : 1, b: function() { return 8; }});", "a");
	};

	tests.testNVP3 = function() {
		assertCreateSummary('{"provided":{"$$proto":"Object","a":"Number","b":"?Fun:"},"types":{"Fun":{"$$proto":"Object","ff":"Number"}},"kind":"AMD"}',
			"define({a : 1, b: function() { function Fun(a) { this.ff = 8; }; return Fun(); }});", "a");
	};

	tests.testNVP4 = function() {
		assertCreateSummary('{"provided":{"$$proto":"Object","a":"Number","b":"??Fun:a:"},"types":{"Fun":{"$$proto":"Object","ff":"Number"}},"kind":"AMD"}',
			"define({a : 1, b: function() { function Fun(a) { this.ff = 8; }; return Fun; }});", "a");
	};
	tests.testNVP5 = function() {
		assertCreateSummary('{"provided":{"$$proto":"Object","a":"Number","b":"?Fun:"},"types":{"Fun":{"$$proto":"Object","ff":"Number"}},"kind":"AMD"}',
			"define({a : 1, b: function() { function Fun(a) { this.ff = 8; }; return new Fun(); }});", "a");
	};

	//////////////////////////////////////////////////////////
	// AMD dependencies
	//////////////////////////////////////////////////////////
	tests.testAMD1 = function() {
		assertCreateSummary('{"provided":"Object","types":{},"kind":"AMD"}',
			"define('afg', [], function() { });", "a");
	};
	tests.testAMD2 = function() {
		assertCreateSummary('{"provided":"Number","types":{},"kind":"AMD"}',
			"define('afg', [], function() { return 8; });", "a");
	};
	tests.testAMD3 = function() {
		assertCreateSummary('{"provided":{"$$proto":"Object"},"types":{},"kind":"AMD"}',
			"define('afg', [], function() { return { }; });", "a");
	};
	tests.testAMD4 = function() {
		assertCreateSummary('{"provided":{"$$proto":"Object","first":"String"},"types":{},"kind":"AMD"}',
			"define('afg', [], function() { return { first: 'a' }; });", "a");
	};
	tests.testAMD5 = function() {
		assertCreateSummary('{"provided":{"$$proto":"Object","first":"Number"},"types":{},"kind":"AMD"}',
			"define('afg', [], function() { var a = 9;\n return { first: a }; });", "a");
	};
	tests.testAMD6 = function() {
		assertCreateSummary('{"provided":{"$$proto":"Object","first":"?String:"},"types":{},"kind":"AMD"}',
			"define('afg', [], function() { var a = function() { return ''; };\n return { first: a }; });", "a");
	};
	tests.testAMD7 = function() {
		assertCreateSummary('{"provided":{"$$proto":"Object","first":"?String:","second":"Number"},"types":{},"kind":"AMD"}',
			"define('afg', [], function() { var a = function() { return ''; };\n return { first: a, second: 8 }; });", "a");
	};
	tests.testAMD8 = function() {
		assertCreateSummary('{"provided":{"$$proto":"Object","Exported":"?Exported:","second":"Number"},"types":{"Exported":{"$$proto":"Object","a":"Number"}},"kind":"AMD"}',
			"define('afg', [], function() { var Exported = function() { this.a = 9; };\n return { Exported: Exported, second: 8 }; });", "a");
	};
	tests.testAMD9 = function() {
		assertCreateSummary('{"provided":"?Exported:a,b","types":{"Exported":{"$$proto":"Object","a":"Number"}},"kind":"AMD"}',
			"define([], function() { var Exported = function(a,b) { this.a = 9; };\n return Exported; });", "a");
	};
	tests.testAMD10 = function() {
		assertCreateSummary('{"provided":"??Exported:a,b:c,d","types":{"Exported":{"$$proto":"Object","a":"Number"}},"kind":"AMD"}',
			"define([], function() { var Exported = function(a,b) { this.a = 9; };\n return function(c,d) { return Exported; }; });", "a");
	};
	tests.testAMD11 = function() {
		assertCreateSummary('{"provided":"?Exported:c,d","types":{"Exported":{"$$proto":"Object","a":"Number"}},"kind":"AMD"}',
			"define([], function() { var Exported = function(a,b) { this.a = 9; };\n return function(c,d) { return new Exported(c,d); }; });", "a");
	};
	tests.testAMD12 = function() {
		assertCreateSummary('{"provided":{"$$proto":"Object","a":"Number"},"types":{},"kind":"AMD"}',
			"define([], function() { var Exported = function(a,b) { this.a = 9; };\n return new Exported(); });", "a");
	};
	
	return tests;
});