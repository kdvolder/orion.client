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
		assertCreateSummary('{"provided":{},"types":{"Global":{}},"kind":"global"}', "", "a");
	};
	
	tests.testOneVarGlobalStructure1 = function() {
		assertCreateSummary('{"provided":{"x":"Object"},"types":{"Global":{"x":"Object"}},"kind":"global"}', 
			"var x;", "a");
	};
	
	tests.testOneVarGlobalStructure2 = function() {
		assertCreateSummary('{"provided":{"x":"Number"},"types":{"Global":{"x":"Number"}},"kind":"global"}', 
			"var x=0;", "a");
	};
	
	tests.testOneVarGlobalStructure3 = function() {
		assertCreateSummary('{"provided":{"x":"String"},"types":{"Global":{"x":"String"}},"kind":"global"}', 
			"var x='';", "a");
	};
	
	tests.testOneVarGlobalStructure4 = function() {
		assertCreateSummary('{"provided":{"x":"gen~a~1"},"types":{"Global":{"x":"gen~a~1"},"gen~a~0":{"$$proto":"Global"},"gen~a~1":{"$$proto":"Object"}},"kind":"global"}', 
			"var x={};", "a");
	};
	
	tests.testOneVarGlobalStructure5 = function() {
		assertCreateSummary('{"provided":{"x":"gen~a~1"},"types":{"Global":{"x":"gen~a~1"},"gen~a~0":{"$$proto":"Global"},"gen~a~1":{"$$proto":"Object","f":"Number","g":"String"}},"kind":"global"}', 
			"var x={f:9, g:''};", "a");
	};
	
	tests.testOneVarGlobalStructure6 = function() {
		assertCreateSummary('{"provided":{"x":"?Object:"},"types":{"Global":{"x":"?Object:"},"gen~a~0":{"$$proto":"Global","arguments":"Arguments"},"gen~a~1":{"$$proto":"gen~a~0"}},"kind":"global"}', 
			"var x=function() {};", "a");
	};
	
	tests.testOneVarGlobalStructure7 = function() {
		assertCreateSummary('{"provided":{"x":"?Object:a,b"},"types":{"Global":{"x":"?Object:a,b"},"gen~a~0":{"$$proto":"Global","arguments":"Arguments","a":"Object","b":"Object"},"gen~a~1":{"$$proto":"gen~a~0"}},"kind":"global"}', 
			"var x=function(a,b) {};", "a");
	};
	
	tests.testOneVarGlobalStructure8 = function() {
		assertCreateSummary('{"provided":{"x":"?Number:a,b"},"types":{"Global":{"x":"?Number:a,b"},"gen~a~0":{"$$proto":"Global","arguments":"Arguments","a":"Object","b":"Object"},"gen~a~1":{"$$proto":"gen~a~0"}},"kind":"global"}', 
			"var x=function(a,b) {return 7; };", "a");
	};
	
	tests.testOneVarGlobalStructure9 = function() {
		assertCreateSummary('{"provided":{"x":"?Number:a,b"},"types":{"Global":{"x":"?Number:a,b"},"gen~a~0":{"$$proto":"Global","arguments":"Arguments","a":"Object","b":"Object"},"gen~a~1":{"$$proto":"gen~a~0"}},"kind":"global"}', 
			"function x(a,b) {return 7; }", "a");
	};
	
	//////////////////////////////////////////////////////////
	// AMD dependencies
	//////////////////////////////////////////////////////////
	tests.testAMD1 = function() {
		assertCreateSummary('{"provided":"Object","types":{"gen~a~0":{"$$proto":"Global","arguments":"Arguments"},"gen~a~1":{"$$proto":"gen~a~0"}},"kind":"AMD"}',
			"define('afg', [], function() { });", "a");
	};
	tests.testAMD2 = function() {
		assertCreateSummary('{"provided":"Number","types":{"gen~a~0":{"$$proto":"Global","arguments":"Arguments"},"gen~a~1":{"$$proto":"gen~a~0"}},"kind":"AMD"}',
			"define('afg', [], function() { return 8; });", "a");
	};
	tests.testAMD3 = function() {
		assertCreateSummary('{"provided":{"$$proto":"Object"},"types":{"gen~a~0":{"$$proto":"Global","arguments":"Arguments"},"gen~a~1":{"$$proto":"gen~a~0"},"gen~a~2":{"$$proto":"gen~a~1"},"gen~a~3":{"$$proto":"Object"}},"kind":"AMD"}',
			"define('afg', [], function() { return { }; });", "a");
	};
	tests.testAMD4 = function() {
		assertCreateSummary('{"provided":{"$$proto":"Object","first":"String"},"types":{"gen~a~0":{"$$proto":"Global","arguments":"Arguments"},"gen~a~1":{"$$proto":"gen~a~0"},"gen~a~2":{"$$proto":"gen~a~1"},"gen~a~3":{"$$proto":"Object","first":"String"}},"kind":"AMD"}',
			"define('afg', [], function() { return { first: 'a' }; });", "a");
	};
	tests.testAMD5 = function() {
		assertCreateSummary('{"provided":{"$$proto":"Object","first":"Number"},"types":{"gen~a~0":{"$$proto":"Global","arguments":"Arguments"},"gen~a~1":{"$$proto":"gen~a~0","a":"Number"},"gen~a~2":{"$$proto":"gen~a~1"},"gen~a~3":{"$$proto":"Object","first":"Number"}},"kind":"AMD"}',
			"define('afg', [], function() { var a = 9;\n return { first: a }; });", "a");
	};
	tests.testAMD6 = function() {
		assertCreateSummary('{"provided":{"$$proto":"Object","first":"?String:"},"types":{"gen~a~0":{"$$proto":"Global","arguments":"Arguments"},"gen~a~1":{"$$proto":"gen~a~0","a":"?String:"},"gen~a~2":{"$$proto":"gen~a~1","arguments":"Arguments"},"gen~a~3":{"$$proto":"gen~a~2"},"gen~a~4":{"$$proto":"gen~a~1"},"gen~a~5":{"$$proto":"Object","first":"?String:"}},"kind":"AMD"}',
			"define('afg', [], function() { var a = function() { return ''; };\n return { first: a }; });", "a");
	};
	tests.testAMD7 = function() {
		assertCreateSummary('{"provided":{"$$proto":"Object","first":"?String:","second":"Number"},"types":{"gen~a~0":{"$$proto":"Global","arguments":"Arguments"},"gen~a~1":{"$$proto":"gen~a~0","a":"?String:"},"gen~a~2":{"$$proto":"gen~a~1","arguments":"Arguments"},"gen~a~3":{"$$proto":"gen~a~2"},"gen~a~4":{"$$proto":"gen~a~1"},"gen~a~5":{"$$proto":"Object","first":"?String:","second":"Number"}},"kind":"AMD"}',
			"define('afg', [], function() { var a = function() { return ''; };\n return { first: a, second: 8 }; });", "a");
	};
	tests.testAMD8 = function() {
		assertCreateSummary('{"provided":{"$$proto":"Object","Exported":"?Exported:","second":"Number"},"types":{"gen~a~0":{"$$proto":"Global","arguments":"Arguments"},"gen~a~1":{"$$proto":"gen~a~0","Exported":"?Exported:"},"gen~a~2":{"$$proto":"gen~a~1","Exported":"?Exported:"},"Exported":{"$$proto":"Object","a":"Number"},"gen~a~3":{"$$proto":"gen~a~2","arguments":"Arguments"},"gen~a~4":{"$$proto":"gen~a~3"},"gen~a~5":{"$$proto":"gen~a~1"},"gen~a~6":{"$$proto":"Object","Exported":"?Exported:","second":"Number"}},"kind":"AMD"}',
			"define('afg', [], function() { var Exported = function() { this.a = 9; };\n return { Exported: Exported, second: 8 }; });", "a");
	};
	
	
	return tests;
});