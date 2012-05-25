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
define(["plugins/esprimaPlugin/esprimaJsContentAssist", "orion/assert"], function(mEsprimaPlugin, assert) {
	
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
			["fa", "fa : { aaa : Number } (esprima)"],
			["fb", "fb : { aaa : Number } (esprima)"],
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
	

	//////////////////////////////////////////////////////////
	// tests for name-value pair (NVP) style modules
	//////////////////////////////////////////////////////////
	tests.testNVP1 = function() {
		var results = computeContentAssist(
			"define(['first'], function(ff) { ff.fun.toF/**/ });", "toF", new MockIndexer(
			[], {
				first: "define({ fun : 8 });"
			}));
		testProposals("toF", results, [
			["toFixed(digits)", "toFixed(digits) : Number (esprima)"]
		]);
	};
	tests.testNVP2 = function() {
		var results = computeContentAssist(
			"define(['first'], function(ff) { ff.fun().toF/**/ });", "toF", new MockIndexer(
			[], {
				first: "define({ fun : function() { return 8; }});"
			}));
		testProposals("toF", results, [
			["toFixed(digits)", "toFixed(digits) : Number (esprima)"]
		]);
	};
	tests.testNVP3 = function() {
		var results = computeContentAssist(
			"define(['first'], function(ff) { new ff.Fun().ff.toF/**/ });", "toF", new MockIndexer(
			[], {
				first: "define({ Fun : function() { this.ff = 8; }});"
			}));
		testProposals("toF", results, [
			["toFixed(digits)", "toFixed(digits) : Number (esprima)"]
		]);
	};
	
	//////////////////////////////////////////////////////////
	// tests for async require function
	// note that async require calls are typically either in 
	// an html file or surrounded by a define
	//////////////////////////////////////////////////////////
	tests.testAMDRequire1Simple = function() {
		var results = computeContentAssist(
			"require(['first'], function(ff) { new ff.Fun().ff.toF/**/ });", "toF", new MockIndexer(
			[], {
				first: "define('first', [], function() { return { Fun : function(a,b) { this.ff = 9; } } });"
			}));
		testProposals("toF", results, [
			["toFixed(digits)", "toFixed(digits) : Number (esprima)"]
		]);
	};

	tests.testAMDRequire2NestedInDefine = function() {
		var results = computeContentAssist(
			"define(['second'], function(ss) { require(['first'], function(ff) { new ff.Fun().ff.toF/**/ }); });", "toF", new MockIndexer(
			[], {
				first: "define('first', [], function() { return { Fun : function(a,b) { this.ff = 9; } } });",
				second: "define('second', [], function() { return { Fun2 : function(a,b) { this.ff = 9; } } });"
			}));
		testProposals("toF", results, [
			["toFixed(digits)", "toFixed(digits) : Number (esprima)"]
		]);
	};

	tests.testAMDRequire3NestedInRequire = function() {
		var results = computeContentAssist(
			"require(['second'], function(ss) { require(['first'], function(ff) { new ff.Fun().ff.toF/**/ }); });", "toF", new MockIndexer(
			[], {
				first: "define('first', [], function() { return { Fun : function(a,b) { this.ff = 9; } } });",
				second: "define('second', [], function() { return { Fun2 : function(a,b) { this.ff = 9; } } });"
			}));
		testProposals("toF", results, [
			["toFixed(digits)", "toFixed(digits) : Number (esprima)"]
		]);
	};
	
	tests.testAMDRequire4NestedInDefineWithShadowing = function() {
		var results = computeContentAssist(
			"define(['second'], function(ff) { require(['first'], function(ff) { new ff.Fun().ff.toF/**/ }); });", "toF", new MockIndexer(
			[], {
				first: "define('first', [], function() { return { Fun : function(a,b) { this.ff = 9; } } });",
				second: "define('second', [], function() { return { Fun2 : function(a,b) { this.ff = ''; } } });"
			}));
		testProposals("toF", results, [
			["toFixed(digits)", "toFixed(digits) : Number (esprima)"]
		]);
	};

	tests.testAMDRequire5NestedInRequire = function() {
		var results = computeContentAssist(
			"require(['second'], function(ff) { require(['first'], function(ff) { new ff.Fun().ff.toF/**/ }); });", "toF", new MockIndexer(
			[], {
				first: "define('first', [], function() { return { Fun : function(a,b) { this.ff = 9; } } });",
				second: "define('second', [], function() { return { Fun2 : function(a,b) { this.ff = ''; } } });"
			}));
		testProposals("toF", results, [
			["toFixed(digits)", "toFixed(digits) : Number (esprima)"]
		]);
	};
	
	//////////////////////////////////////////////////////////
	// Commonjs
	//////////////////////////////////////////////////////////
	tests.testCommonJS1 = function() {
		var results = computeContentAssist(
			"require('first').toF", "toF", new MockIndexer(
			[], {
				first: "exports = 9;"
			}));
		testProposals("toF", results, [
			["toFixed(digits)", "toFixed(digits) : Number (esprima)"]
		]);
	};
	tests.testCommonJS2 = function() {
		var results = computeContentAssist(
			"var foo = require('first');\n" +
			"foo.toF", "toF", new MockIndexer(
			[], {
				first: "exports = 9;"
			}));
		testProposals("toF", results, [
			["toFixed(digits)", "toFixed(digits) : Number (esprima)"]
		]);
	};
	tests.testCommonJS3 = function() {
		var results = computeContentAssist(
			"var foo = require('first');\n" +
			"foo.first.toF", "toF", new MockIndexer(
			[], {
				first: "exports = { first : 9 };"
			}));
		testProposals("toF", results, [
			["toFixed(digits)", "toFixed(digits) : Number (esprima)"]
		]);
	};
	tests.testCommonJS4 = function() {
		var results = computeContentAssist(
			"var foo = require('first');\n" +
			"foo.first.toF", "toF", new MockIndexer(
			[], {
				first: "var first = 9;\nexports = { first : first };"
			}));
		testProposals("toF", results, [
			["toFixed(digits)", "toFixed(digits) : Number (esprima)"]
		]);
	};
	tests.testCommonJS5 = function() {
		var results = computeContentAssist(
			"var foo = require('first');\n" +
			"foo.first().toF", "toF", new MockIndexer(
			[], {
				first: "var first = function() { return 9; }\n" +
				       "exports = { first : first };"
			}));
		testProposals("toF", results, [
			["toFixed(digits)", "toFixed(digits) : Number (esprima)"]
		]);
	};
	tests.testCommonJS6 = function() {
		var results = computeContentAssist(
			"var Foo = require('first').First;\n" +
			"new Foo().x.toF", "toF", new MockIndexer(
			[], {
				first: "var First = function() { this.x = 9 }\n" +
				       "exports = { First : First };"
			}));
		testProposals("toF", results, [
			["toFixed(digits)", "toFixed(digits) : Number (esprima)"]
		]);
	};
	
	// I don't know if this one is valid syntax since jslint flags this with an error, 
	// but we'll keep this test since esprima parses it properly and the result is correct
	tests.testCommonJS7 = function() {
		var results = computeContentAssist(
			"var foo = new (require('first').First)();\n" +
			"foo.x.toF", "toF", new MockIndexer(
			[], {
				first: "var First = function() { this.x = 9 }\n" +
				       "exports = { First : First };"
			}));
		testProposals("toF", results, [
			["toFixed(digits)", "toFixed(digits) : Number (esprima)"]
		]);
	};
	
	tests.testCommonJS8 = function() {
		var results = computeContentAssist(
			"var foo = require('first');\n" +
			"new foo.First().x.toF", "toF", new MockIndexer(
			[], {
				first: "var First = function() { this.x = 9 }\n" +
				       "exports = { First : First };"
			}));
		testProposals("toF", results, [
			["toFixed(digits)", "toFixed(digits) : Number (esprima)"]
		]);
	};
	tests.testCommonJS9 = function() {
		var results = computeContentAssist(
			"var foo = require('first').First;\n" +
			"new foo().x.toF", "toF", new MockIndexer(
			[], {
				first: "var First = function() { this.x = 9 }\n" +
				       "exports = { First : First };"
			}));
		testProposals("toF", results, [
			["toFixed(digits)", "toFixed(digits) : Number (esprima)"]
		]);
	};
	
	tests.testCommonJS10 = function() {
		var results = computeContentAssist(
			"var a = require('first').a;\n" +
			"new a.First().x.toF", "toF", new MockIndexer(
			[], {
				first: "var Foo = function() { this.x = 9 }\n" +
				       "exports = { a : { First : Foo  } };"
			}));
		testProposals("toF", results, [
			["toFixed(digits)", "toFixed(digits) : Number (esprima)"]
		]);
	};

	tests.testCommonJS11 = function() {
		var results = computeContentAssist(
			"var a = require('first').a;\n" +
			"a.b.c.num.toF", "toF", new MockIndexer(
			[], {
				first:  "var c = { num : 8 };\n" +
						"var b = { c : c }\n" +
				        "exports = { a : { b : b } };"
			}));
		testProposals("toF", results, [
			["toFixed(digits)", "toFixed(digits) : Number (esprima)"]
		]);
	};


	//////////////////////////////////////////////////////////
	// tests for sync require function in AMD
	//////////////////////////////////////////////////////////
	tests.testAMDSyncRequire1 = function() {
		var results = computeContentAssist(
			"define(['first'], function() {\n"+
			"  var a = require('first').a;\n" +
			"  a.b.c.num.toF/**/\n" +
			"});", "toF", new MockIndexer(
			[], {
				first:  "define([], function() {\n" +
						"  var c = { num : 8 };\n" +
						"  var b = { c : c }\n" +
				        "  return { a : { b : b } };\n" +
				        "});"
			}));
		testProposals("toF", results, [
			["toFixed(digits)", "toFixed(digits) : Number (esprima)"]
		]);	
	};
	tests.testAMDSyncRequire2 = function() {
		var results = computeContentAssist(
			"define(['first'], function() {\n"+
			"  var a = require('first');\n" +
			"  a().toF/**/\n" +
			"});", "toF", new MockIndexer(
			[], {
				first:  "define([], function() {\n" +
				        "  return function() { return 9; };\n" +
				        "});"
			}));
		testProposals("toF", results, [
			["toFixed(digits)", "toFixed(digits) : Number (esprima)"]
		]);	
	};
	tests.testAMDSyncRequire3 = function() {
		var results = computeContentAssist(
			"define(['first'], function() {\n"+
			"  require('first')().toF/**/\n" +
			"});", "toF", new MockIndexer(
			[], {
				first:  "define([], function() {\n" +
				        "  return function() { return 9; };\n" +
				        "});"
			}));
		testProposals("toF", results, [
			["toFixed(digits)", "toFixed(digits) : Number (esprima)"]
		]);
	};
	
	tests.testCommonjsWrapped1 = function() {
		var results = computeContentAssist(
			"define(function(require, exports, module) {\n"+
			"  require('first').a.flart().toF/**/\n" +
			"});", "toF", new MockIndexer(
			[], {
				first:  "define(function(require, exports, module) {\n" +
						"  exports.a = { flart: function(a,b) { return 1; } }\n" +
						"});"
			}));
		testProposals("toF", results, [
			["toFixed(digits)", "toFixed(digits) : Number (esprima)"]
		]);
	};
	tests.testCommonjsWrapped2 = function() {
		var results = computeContentAssist(
			"  require('first').a.flart().toF/**/", "toF", new MockIndexer(
			[], {
				first:  "define(function(require, exports, module) {\n" +
						"  exports.a = { flart: function(a,b) { return 1; } }\n" +
						"});"
			}));
		testProposals("toF", results, [
			["toFixed(digits)", "toFixed(digits) : Number (esprima)"]
		]);
	};
	tests.testCommonjsWrapped3 = function() {
		var results = computeContentAssist(
			"define(function(require, exports, module) {\n"+
			"  require('first').a.flart().toF/**/\n" +
			"});", "toF", new MockIndexer(
			[], {
				first:  "  exports.a = { flart: function(a,b) { return 1; } }\n"
			}));
		testProposals("toF", results, [
			["toFixed(digits)", "toFixed(digits) : Number (esprima)"]
		]);
	};
	
	return tests;
});
