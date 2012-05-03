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

// tests for javascript content assist where dependencies are provided
/*global define esprima console setTimeout esprimaContentAssistant*/
define(["./esprimaJsContentAssist", "orion/assert"], function(mEsprimaPlugin, assert) {
	
	//////////////////////////////////////////////////////////
	// helpers
	//////////////////////////////////////////////////////////
	
	function MockIndexer(globalDeps, amdDeps) {
		function createSummary(buffer, name) {
			var esprimaContentAssistant = new mEsprimaPlugin.EsprimaJavaScriptContentAssistProvider();
			return esprimaContentAssistant.computeSummary(buffer, name);
		}
	
		var processedGlobalDeps = [];
		for (var name in globalDeps) {
			if (globalDeps.hasOwnProperty(name)) {
				processedGlobalDeps.push(createSummary(globalDeps[name], name));
			}
		}
	
		this.retrieveGlobalSummaries = function() {
			return processedGlobalDeps;
		};
		
		this.retrieveSummary = function(name) {
			return amdDeps ? createSummary(amdDeps[name], name) : null;
		};
	}
	
	function computeContentAssist(buffer, prefix, indexer) {
		var esprimaContentAssistant = new mEsprimaPlugin.EsprimaJavaScriptContentAssistProvider(indexer);
		if (!prefix) {
			prefix = "";
		}
		var offset = buffer.indexOf("/**/");
		if (offset < 0) {
			offset = buffer.length;
		}
		return esprimaContentAssistant.computeProposals(buffer, offset, {prefix : prefix});
	}
	
	function testProposal(proposal, text, description, prefix) {
		assert.equal(prefix + proposal.proposal, text, "Invalid proposal text");
		if (description) {
			assert.equal(proposal.description, description, "Invalid proposal description");
		}
	}
	
	function stringifyExpected(expectedProposals) {
		var text = "";
		for (var i = 0; i < expectedProposals.length; i++)  {
			text += expectedProposals[i][0] + " : " + expectedProposals[i][1] + "\n";
		}
		return text;
	}
	
	function stringifyActual(actualProposals) {
		var text = "";
		for (var i = 0; i < actualProposals.length; i++) {
			text += actualProposals[i].proposal + " : " + actualProposals[i].description + "\n";
		}
		return text;
	}
	
	function testProposals(prefix, actualProposals, expectedProposals) {
//		console.log("Proposals:");
//		console.log(actualProposals);
		
		assert.equal(actualProposals.length, expectedProposals.length, 
			"Wrong number of proposals.  Expected:\n" + stringifyExpected(expectedProposals) +"\nActual:\n" + stringifyActual(actualProposals));
			
		for (var i = 0; i < actualProposals.length; i++) {
			testProposal(actualProposals[i], expectedProposals[i][0], expectedProposals[i][1], prefix);
		}
	}

	//////////////////////////////////////////////////////////
	// tests
	//////////////////////////////////////////////////////////

	var tests = {};

	tests.testEmpty = function() {};
	
	//////////////////////////////////////////////////////////
	// tests of global dependencies
	//////////////////////////////////////////////////////////
	tests.testGlobal1 = function() {
		var results = computeContentAssist(
			"aa", "aa", new MockIndexer(
			{ 
				first: "var aaa = 9"
			}));
		testProposals("aa", results, [
			["aaa", "aaa : Number (esprima)"]
		]);
	};
	tests.testGlobal2 = function() {
		var results = computeContentAssist(
			"aa", "aa", new MockIndexer(
			{
				first: "var aaa = 9",
				second: "var aab = 9"
			}));
		testProposals("aa", results, [
			["aaa", "aaa : Number (esprima)"],
			["aab", "aab : Number (esprima)"]
		]);
	};
	tests.testGlobal3 = function() {
		var results = computeContentAssist(
			"var aac=9;\naa", "aa", new MockIndexer(
			{
				first: "var aaa = 9",
				second: "var aab = 9"
			}));
		testProposals("aa", results, [
			["aaa", "aaa : Number (esprima)"],
			["aab", "aab : Number (esprima)"],
			["aac", "aac : Number (esprima)"]
		]);
	};
	tests.testGlobal4 = function() {
		// a dependency defines a variable of the same name.
		// local variable should take precedence
		var results = computeContentAssist(
			"var aaa='';\naa", "aa", new MockIndexer(
			{
				first: "var aaa = 9",
				second: "var aab = 9"
			}));
		testProposals("aa", results, [
			["aaa", "aaa : String (esprima)"],
			["aab", "aab : Number (esprima)"]
		]);
	};
	tests.testGlobal5 = function() {
		var results = computeContentAssist(
			"aaa.bbb.aa", "aa", new MockIndexer(
			{
				first: "var aaa = { bbb : { aaa : ''} }",
				second: "var aab = 9"
			}));
		testProposals("aa", results, [
			["aaa", "aaa : String (esprima)"]
		]);
	};
	tests.testGlobal6 = function() {
		var results = computeContentAssist(
			"aaa.bbb.aa", "aa", new MockIndexer(
			{
				first: "var aaa = { bbb : { aaa : function(a,b,c) { return 9; } } }",
				second: "var aab = 9"
			}));
		testProposals("aa", results, [
			["aaa(a, b, c)", "aaa(a, b, c) : Number (esprima)"]
		]);
	};
	
	//////////////////////////////////////////////////////////
	// tests of amd dependencies
	//////////////////////////////////////////////////////////
	tests.testAMD1 = function() {
		var results = computeContentAssist(
			"define(['first'], function(aaa) { aa/**/ });", "aa", new MockIndexer(
			[], {
				first: "define('first', [], function() { return 9; });"
			}));
		testProposals("aa", results, [
			["aaa", "aaa : Number (esprima)"]
		]);
	};
	tests.testAMD2 = function() {
		var results = computeContentAssist(
			"define(['first'], function(f) { f.aa/**/ });", "aa", new MockIndexer(
			[], {
				first: "define('first', [], function() { return { aaa : 9 } });"
			}));
		testProposals("aa", results, [
			["aaa", "aaa : Number (esprima)"]
		]);
	};
	tests.testAMD3 = function() {
		var results = computeContentAssist(
			"define(['first'], function(f) { f.aaa.toF/**/ });", "toF", new MockIndexer(
			[], {
				first: "define('first', [], function() { return { aaa : 9 } });"
			}));
		testProposals("toF", results, [
			["toFixed(digits)", "toFixed(digits) : Number (esprima)"]
		]);
	};
	tests.testAMD4 = function() {
		var results = computeContentAssist(
			"define(['first', 'second'], function(fa, fb) { f/**/ });", "f", new MockIndexer(
			[], {
				first: "define('first', [], function() { return { aaa : 9 } });",
				second: "define('second', [], function() { return { aaa : 9 } });"
			}));
		testProposals("f", results, [
			["fa", "fa : { aaa } (esprima)"],
			["fb", "fb : { aaa } (esprima)"],
		]);
	};
	
	// returns an anonymous function
	tests.testAMD5a = function() {
		var results = computeContentAssist(
			"define(['first'], function(ff) { f/**/ });", "f", new MockIndexer(
			[], {
				first: "define('first', [], function() { return function(a,b) { return 9; } });"
			}));
		testProposals("f", results, [
			["ff(a, b)", "ff(a, b) : Number (esprima)"]
		]);
	};
	tests.testAMD5b = function() {
		var results = computeContentAssist(
			"define(['first'], function(ff) { ff().toF/**/ });", "toF", new MockIndexer(
			[], {
				first: "define('first', [], function() { return function(a,b) { return 9; } });"
			}));
		testProposals("toF", results, [
			["toFixed(digits)", "toFixed(digits) : Number (esprima)"]
		]);
	};
	
	
	// returns a named function
	tests.testAMD6a = function() {
		var results = computeContentAssist(
			"define(['first'], function(ff) { ff.fun/**/ });", "fun", new MockIndexer(
			[], {
				first: "define('first', [], function() { return { fun : function(a,b) { return 9; } } });"
			}));
		testProposals("fun", results, [
			["fun(a, b)", "fun(a, b) : Number (esprima)"]
		]);
	};
	tests.testAMD6b = function() {
		var results = computeContentAssist(
			"define(['first'], function(ff) { ff.fun().toF/**/ });", "toF", new MockIndexer(
			[], {
				first: "define('first', [], function() { return { fun : function(a,b) { return 9; } } });"
			}));
		testProposals("toF", results, [
			["toFixed(digits)", "toFixed(digits) : Number (esprima)"]
		]);
	};

	// returns a named constructor
	tests.testAMD7a = function() {
		var results = computeContentAssist(
			"define(['first'], function(ff) { new ff.Fun().f/**/ });", "f", new MockIndexer(
			[], {
				first: "define('first', [], function() { return { Fun : function(a,b) { this.ff = 9; } } });"
			}));
		testProposals("f", results, [
			["ff", "ff : Number (esprima)"]
		]);
	};
	tests.testAMD7b = function() {
		var results = computeContentAssist(
			"define(['first'], function(ff) { new ff.Fun().ff.toF/**/ });", "toF", new MockIndexer(
			[], {
				first: "define('first', [], function() { return { Fun : function(a,b) { this.ff = 9; } } });"
			}));
		testProposals("toF", results, [
			["toFixed(digits)", "toFixed(digits) : Number (esprima)"]
		]);
	};


	// what's up with content assist on constructor calls...!!!!!!!!
	// returns an object that refererences an object defined in module
	// both global and module	
	return tests;
});
