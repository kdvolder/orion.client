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
define(["plugins/esprimaPlugin/esprimaJsContentAssist", "orion/assert"], function(mEsprimaPlugin, assert) {
	
	//////////////////////////////////////////////////////////
	// helpers
	//////////////////////////////////////////////////////////
	var esprimaContentAssistant = new mEsprimaPlugin.EsprimaJavaScriptContentAssistProvider();
	
	function computeContentAssist(buffer, prefix, offset) {
		if (!prefix) {
			prefix = "";
		}
		if (!offset) {
			offset = buffer.indexOf("/**/");
			if (offset < 0) {
				offset = buffer.length;
			}
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

	function parse(contents) {
		return esprima.parse(contents,{
			range: false,
			loc: false,
			tolerant: true
		});
	}

	function assertNoErrors(ast) {
		assert.ok(ast.errors===null || ast.errors.length===0,
			'errors: '+ast.errors.length+'\n'+ast.errors);
	}

	function assertErrors(ast,expectedErrors) {
		var expectedErrorList = (expectedErrors instanceof Array ? expectedErrors: [expectedErrors]);
		var correctNumberOfErrors = ast.errors!==null && ast.errors.length===expectedErrorList.length;
		assert.ok(correctNumberOfErrors,'errors: '+ast.errors.length+'\n'+ast.errors);
		if (correctNumberOfErrors) {
			for (var e=0;e<expectedErrors.length;e++) {
				var expectedError = expectedErrorList[e];
				var actualError = ast.errors[e];
				assert.equal(actualError.lineNumber,expectedError.lineNumber,"checking line for message #"+(e+1)+": "+actualError);
				var actualMessage = actualError.message.replace(/Line [0-9]*: /,'');
				assert.equal(actualMessage,expectedError.message,"checking text for message #"+(e+1)+": "+actualError);
			}
		}
	}


	function stringify(parsedProgram) {
		var body = parsedProgram.body;
		if (body.length===1) {
			body=body[0];
		}
		var replacer = function(key,value) {
			if (key==='computed') {
				return;
			}
			return value;
		};
		return JSON.stringify(body,replacer).replace(/"/g,'');
	}

	function message(line, text) {
		return {
			lineNumber:line,
			message:text
		};
	}

	//////////////////////////////////////////////////////////
	// tests
	//////////////////////////////////////////////////////////

	var tests = {};

	tests.testEmpty = function() {};

	tests["test recovery basic parse"] = function() {
		var parsedProgram = parse("foo.bar");
		assertNoErrors(parsedProgram);
		assert.equal(stringify(parsedProgram),"{type:ExpressionStatement,expression:{type:MemberExpression,object:{type:Identifier,name:foo},property:{type:Identifier,name:bar}}}");
	};

	tests["test recovery - dot followed by EOF"] = function() {
		var parsedProgram = parse("foo.");
		assertErrors(parsedProgram,message(1,'Unexpected end of input'));
		assert.equal(stringify(parsedProgram),"{type:ExpressionStatement,expression:{type:MemberExpression,object:{type:Identifier,name:foo},property:null}}");
	};

	tests["test Content Assist Setup"] = function() {
		assert.ok(esprimaContentAssistant, "Found Esprima content assistant");
		assert.ok(esprimaContentAssistant.computeProposals, "Found proposal computer");
	};
	
	tests["test Empty Content Assist"] = function() {
		var results = computeContentAssist("x", "x");
		assert.equal(results.length, 0);
	};
	
	// non-inferencing content assist
	tests["test Empty File Content Assist"] = function() {
		var results = computeContentAssist("");
		testProposals("", results, [
			["Array([val])", "Array([val]) : Array (esprima)"],
			["Boolean([val])", "Boolean([val]) : Boolean (esprima)"],
			["Date([val])", "Date([val]) : Date (esprima)"],
			["Error([err])", "Error([err]) : Error (esprima)"],
			["Function()", "Function() : Function (esprima)"],
			["JSON", "JSON : JSON (esprima)"],
			["Math", "Math : Math (esprima)"],
			["Number([val])", "Number([val]) : Number (esprima)"],
			["Object([val])", "Object([val]) : Object (esprima)"],
			["RegExp([val])", "RegExp([val]) : RegExp (esprima)"],
			["decodeURI(uri)", "decodeURI(uri) : String (esprima)"],
			["encodeURI(uri)", "encodeURI(uri) : String (esprima)"],
			["eval(toEval)", "eval(toEval) : Object (esprima)"],
			["hasOwnProperty(property)", "hasOwnProperty(property) : boolean (esprima)"],
			["isPrototypeOf(object)", "isPrototypeOf(object) : boolean (esprima)"],
			["parseFloat(str, [radix])", "parseFloat(str, [radix]) : Number (esprima)"],
			["parseInt(str, [radix])", "parseInt(str, [radix]) : Number (esprima)"],
			["propertyIsEnumerable(property)", "propertyIsEnumerable(property) : boolean (esprima)"],
			["prototype", "prototype : Object (esprima)"],
			["this", "this : Global (esprima)"],
			["toLocaleString()", "toLocaleString() : String (esprima)"],
			["toString()", "toString() : String (esprima)"],
			["valueOf()", "valueOf() : Object (esprima)"]
		]);
	};
	tests["test Single Var Content Assist"] = function() {
		var results = computeContentAssist("var zzz = 9;\n");
		testProposals("", results, [
			["Array([val])", "Array([val]) : Array (esprima)"],
			["Boolean([val])", "Boolean([val]) : Boolean (esprima)"],
			["Date([val])", "Date([val]) : Date (esprima)"],
			["Error([err])", "Error([err]) : Error (esprima)"],
			["Function()", "Function() : Function (esprima)"],
			["JSON", "JSON : JSON (esprima)"],
			["Math", "Math : Math (esprima)"],
			["Number([val])", "Number([val]) : Number (esprima)"],
			["Object([val])", "Object([val]) : Object (esprima)"],
			["RegExp([val])", "RegExp([val]) : RegExp (esprima)"],
			["decodeURI(uri)", "decodeURI(uri) : String (esprima)"],
			["encodeURI(uri)", "encodeURI(uri) : String (esprima)"],
			["eval(toEval)", "eval(toEval) : Object (esprima)"],
			["hasOwnProperty(property)", "hasOwnProperty(property) : boolean (esprima)"],
			["isPrototypeOf(object)", "isPrototypeOf(object) : boolean (esprima)"],
			["parseFloat(str, [radix])", "parseFloat(str, [radix]) : Number (esprima)"],
			["parseInt(str, [radix])", "parseInt(str, [radix]) : Number (esprima)"],
			["propertyIsEnumerable(property)", "propertyIsEnumerable(property) : boolean (esprima)"],
			["prototype", "prototype : Object (esprima)"],
			["this", "this : Global (esprima)"],
			["toLocaleString()", "toLocaleString() : String (esprima)"],
			["toString()", "toString() : String (esprima)"],
			["valueOf()", "valueOf() : Object (esprima)"],
			["zzz", "zzz : Number (esprima)"]
		]);
	};
	tests["test Single Var Content Assist 2"] = function() {
		var results = computeContentAssist("var zzz;\n");
		testProposals("", results, [
			["Array([val])", "Array([val]) : Array (esprima)"],
			["Boolean([val])", "Boolean([val]) : Boolean (esprima)"],
			["Date([val])", "Date([val]) : Date (esprima)"],
			["Error([err])", "Error([err]) : Error (esprima)"],
			["Function()", "Function() : Function (esprima)"],
			["JSON", "JSON : JSON (esprima)"],
			["Math", "Math : Math (esprima)"],
			["Number([val])", "Number([val]) : Number (esprima)"],
			["Object([val])", "Object([val]) : Object (esprima)"],
			["RegExp([val])", "RegExp([val]) : RegExp (esprima)"],
			["decodeURI(uri)", "decodeURI(uri) : String (esprima)"],
			["encodeURI(uri)", "encodeURI(uri) : String (esprima)"],
			["eval(toEval)", "eval(toEval) : Object (esprima)"],
			["hasOwnProperty(property)", "hasOwnProperty(property) : boolean (esprima)"],
			["isPrototypeOf(object)", "isPrototypeOf(object) : boolean (esprima)"],
			["parseFloat(str, [radix])", "parseFloat(str, [radix]) : Number (esprima)"],
			["parseInt(str, [radix])", "parseInt(str, [radix]) : Number (esprima)"],
			["propertyIsEnumerable(property)", "propertyIsEnumerable(property) : boolean (esprima)"],
			["prototype", "prototype : Object (esprima)"],
			["this", "this : Global (esprima)"],
			["toLocaleString()", "toLocaleString() : String (esprima)"],
			["toString()", "toString() : String (esprima)"],
			["valueOf()", "valueOf() : Object (esprima)"],
			["zzz", "zzz : Object (esprima)"]
		]);
	};
	tests["test multi var content assist 1"] = function() {
		var results = computeContentAssist("var zzz;\nvar xxx, yyy;\n");
		testProposals("", results, [
			["Array([val])", "Array([val]) : Array (esprima)"],
			["Boolean([val])", "Boolean([val]) : Boolean (esprima)"],
			["Date([val])", "Date([val]) : Date (esprima)"],
			["Error([err])", "Error([err]) : Error (esprima)"],
			["Function()", "Function() : Function (esprima)"],
			["JSON", "JSON : JSON (esprima)"],
			["Math", "Math : Math (esprima)"],
			["Number([val])", "Number([val]) : Number (esprima)"],
			["Object([val])", "Object([val]) : Object (esprima)"],
			["RegExp([val])", "RegExp([val]) : RegExp (esprima)"],
			["decodeURI(uri)", "decodeURI(uri) : String (esprima)"],
			["encodeURI(uri)", "encodeURI(uri) : String (esprima)"],
			["eval(toEval)", "eval(toEval) : Object (esprima)"],
			["hasOwnProperty(property)", "hasOwnProperty(property) : boolean (esprima)"],
			["isPrototypeOf(object)", "isPrototypeOf(object) : boolean (esprima)"],
			["parseFloat(str, [radix])", "parseFloat(str, [radix]) : Number (esprima)"],
			["parseInt(str, [radix])", "parseInt(str, [radix]) : Number (esprima)"],
			["propertyIsEnumerable(property)", "propertyIsEnumerable(property) : boolean (esprima)"],
			["prototype", "prototype : Object (esprima)"],
			["this", "this : Global (esprima)"],
			["toLocaleString()", "toLocaleString() : String (esprima)"],
			["toString()", "toString() : String (esprima)"],
			["valueOf()", "valueOf() : Object (esprima)"],
			["xxx", "xxx : Object (esprima)"],
			["yyy", "yyy : Object (esprima)"],
			["zzz", "zzz : Object (esprima)"]
		]);
	};
	tests["test multi var content assist 2"] = function() {
		var results = computeContentAssist("var zzz;\nvar zxxx, xxx, yyy;\nz","z");
		testProposals("z", results, [
			["zxxx", "zxxx : Object (esprima)"],
			["zzz", "zzz : Object (esprima)"]
		]);
	};
	tests["test single function content assist"] = function() {
		var results = computeContentAssist("function fun(a, b, c) {}\n");
		testProposals("", results, [
			["Array([val])", "Array([val]) : Array (esprima)"],
			["Boolean([val])", "Boolean([val]) : Boolean (esprima)"],
			["Date([val])", "Date([val]) : Date (esprima)"],
			["Error([err])", "Error([err]) : Error (esprima)"],
			["Function()", "Function() : Function (esprima)"],
			["JSON", "JSON : JSON (esprima)"],
			["Math", "Math : Math (esprima)"],
			["Number([val])", "Number([val]) : Number (esprima)"],
			["Object([val])", "Object([val]) : Object (esprima)"],
			["RegExp([val])", "RegExp([val]) : RegExp (esprima)"],
			["decodeURI(uri)", "decodeURI(uri) : String (esprima)"],
			["encodeURI(uri)", "encodeURI(uri) : String (esprima)"],
			["eval(toEval)", "eval(toEval) : Object (esprima)"],
			["fun(a, b, c)", "fun(a, b, c) : Object (esprima)"],
			["hasOwnProperty(property)", "hasOwnProperty(property) : boolean (esprima)"],
			["isPrototypeOf(object)", "isPrototypeOf(object) : boolean (esprima)"],
			["parseFloat(str, [radix])", "parseFloat(str, [radix]) : Number (esprima)"],
			["parseInt(str, [radix])", "parseInt(str, [radix]) : Number (esprima)"],
			["propertyIsEnumerable(property)", "propertyIsEnumerable(property) : boolean (esprima)"],
			["prototype", "prototype : Object (esprima)"],
			["this", "this : Global (esprima)"],
			["toLocaleString()", "toLocaleString() : String (esprima)"],
			["toString()", "toString() : String (esprima)"],
			["valueOf()", "valueOf() : Object (esprima)"]
		]);
	};
	tests["test multi function content assist 1"] = function() {
		var results = computeContentAssist("function fun(a, b, c) {}\nfunction other(a, b, c) {}\n");
		testProposals("", results, [
			["Array([val])", "Array([val]) : Array (esprima)"],
			["Boolean([val])", "Boolean([val]) : Boolean (esprima)"],
			["Date([val])", "Date([val]) : Date (esprima)"],
			["Error([err])", "Error([err]) : Error (esprima)"],
			["Function()", "Function() : Function (esprima)"],
			["JSON", "JSON : JSON (esprima)"],
			["Math", "Math : Math (esprima)"],
			["Number([val])", "Number([val]) : Number (esprima)"],
			["Object([val])", "Object([val]) : Object (esprima)"],
			["RegExp([val])", "RegExp([val]) : RegExp (esprima)"],
			["decodeURI(uri)", "decodeURI(uri) : String (esprima)"],
			["encodeURI(uri)", "encodeURI(uri) : String (esprima)"],
			["eval(toEval)", "eval(toEval) : Object (esprima)"],
			["fun(a, b, c)", "fun(a, b, c) : Object (esprima)"],
			["hasOwnProperty(property)", "hasOwnProperty(property) : boolean (esprima)"],
			["isPrototypeOf(object)", "isPrototypeOf(object) : boolean (esprima)"],
			["other(a, b, c)", "other(a, b, c) : Object (esprima)"],
			["parseFloat(str, [radix])", "parseFloat(str, [radix]) : Number (esprima)"],
			["parseInt(str, [radix])", "parseInt(str, [radix]) : Number (esprima)"],
			["propertyIsEnumerable(property)", "propertyIsEnumerable(property) : boolean (esprima)"],
			["prototype", "prototype : Object (esprima)"],
			["this", "this : Global (esprima)"],
			["toLocaleString()", "toLocaleString() : String (esprima)"],
			["toString()", "toString() : String (esprima)"],
			["valueOf()", "valueOf() : Object (esprima)"]
		]);
	};
	tests["test scopes 1"] = function() {
		// only the outer foo is available
		var results = computeContentAssist(
				"var foo;\nfunction other(a, b, c) {\nfunction inner() { var foo2; }\nf/**/}", "f");
		testProposals("f", results, [
			["foo", "foo : Object (esprima)"]
		]);
	};
	tests["test scopes 2"] = function() {
		// the inner assignment should not affect the value of foo
		var results = computeContentAssist("var foo;\n" +
				"var foo = 1;\nfunction other(a, b, c) {\nfunction inner() { foo2 = \"\"; }\nfoo.toF/**/}", "toF");
		testProposals("toF", results, [
			["toFixed(digits)", "toFixed(digits) : Number (esprima)"]
		]);
	};
	tests["test multi function content assist 2"] = function() {
		var results = computeContentAssist("function fun(a, b, c) {}\nfunction other(a, b, c) {}\nf", "f");
		testProposals("f", results, [
			["fun(a, b, c)", "fun(a, b, c) : Object (esprima)"]
		]);
	};
	tests["test in function 1"] = function() {
		var results = computeContentAssist("function fun(a, b, c) {}\nfunction other(a, b, c) {/**/}", "");
		testProposals("", results, [
			["Array([val])", "Array([val]) : Array (esprima)"],
			["Boolean([val])", "Boolean([val]) : Boolean (esprima)"],
			["Date([val])", "Date([val]) : Date (esprima)"],
			["Error([err])", "Error([err]) : Error (esprima)"],
			["Function()", "Function() : Function (esprima)"],
			["JSON", "JSON : JSON (esprima)"],
			["Math", "Math : Math (esprima)"],
			["Number([val])", "Number([val]) : Number (esprima)"],
			["Object([val])", "Object([val]) : Object (esprima)"],
			["RegExp([val])", "RegExp([val]) : RegExp (esprima)"],
			["a", "a : {  } (esprima)"],
			["arguments", "arguments : Arguments (esprima)"],
			["b", "b : {  } (esprima)"],
			["c", "c : {  } (esprima)"],
			["decodeURI(uri)", "decodeURI(uri) : String (esprima)"],
			["encodeURI(uri)", "encodeURI(uri) : String (esprima)"],
			["eval(toEval)", "eval(toEval) : Object (esprima)"],
			["fun(a, b, c)", "fun(a, b, c) : Object (esprima)"],
			["hasOwnProperty(property)", "hasOwnProperty(property) : boolean (esprima)"],
			["isPrototypeOf(object)", "isPrototypeOf(object) : boolean (esprima)"],
			["other(a, b, c)", "other(a, b, c) : Object (esprima)"],
			["parseFloat(str, [radix])", "parseFloat(str, [radix]) : Number (esprima)"],
			["parseInt(str, [radix])", "parseInt(str, [radix]) : Number (esprima)"],
			["propertyIsEnumerable(property)", "propertyIsEnumerable(property) : boolean (esprima)"],
			["prototype", "prototype : Object (esprima)"],
			["this", "this : Global (esprima)"],
			["toLocaleString()", "toLocaleString() : String (esprima)"],
			["toString()", "toString() : String (esprima)"],
			["valueOf()", "valueOf() : Object (esprima)"]
		]);
	};
	tests["test in function 2"] = function() {
		var results = computeContentAssist("function fun(a, b, c) {}\nfunction other(a, b, c) {\n/**/nuthin}", "");
		testProposals("", results, [
			["Array([val])", "Array([val]) : Array (esprima)"],
			["Boolean([val])", "Boolean([val]) : Boolean (esprima)"],
			["Date([val])", "Date([val]) : Date (esprima)"],
			["Error([err])", "Error([err]) : Error (esprima)"],
			["Function()", "Function() : Function (esprima)"],
			["JSON", "JSON : JSON (esprima)"],
			["Math", "Math : Math (esprima)"],
			["Number([val])", "Number([val]) : Number (esprima)"],
			["Object([val])", "Object([val]) : Object (esprima)"],
			["RegExp([val])", "RegExp([val]) : RegExp (esprima)"],
			["a", "a : {  } (esprima)"],
			["arguments", "arguments : Arguments (esprima)"],
			["b", "b : {  } (esprima)"],
			["c", "c : {  } (esprima)"],
			["decodeURI(uri)", "decodeURI(uri) : String (esprima)"],
			["encodeURI(uri)", "encodeURI(uri) : String (esprima)"],
			["eval(toEval)", "eval(toEval) : Object (esprima)"],
			["fun(a, b, c)", "fun(a, b, c) : Object (esprima)"],
			["hasOwnProperty(property)", "hasOwnProperty(property) : boolean (esprima)"],
			["isPrototypeOf(object)", "isPrototypeOf(object) : boolean (esprima)"],
			["other(a, b, c)", "other(a, b, c) : Object (esprima)"],
			["parseFloat(str, [radix])", "parseFloat(str, [radix]) : Number (esprima)"],
			["parseInt(str, [radix])", "parseInt(str, [radix]) : Number (esprima)"],
			["propertyIsEnumerable(property)", "propertyIsEnumerable(property) : boolean (esprima)"],
			["prototype", "prototype : Object (esprima)"],
			["this", "this : Global (esprima)"],
			["toLocaleString()", "toLocaleString() : String (esprima)"],
			["toString()", "toString() : String (esprima)"],
			["valueOf()", "valueOf() : Object (esprima)"]
		]);
	};
	tests["test in function 3"] = function() {
		var results = computeContentAssist("function fun(a, b, c) {}\nfunction other(a, b, c) {f/**/}", "f");
		testProposals("f", results, [
			["fun(a, b, c)", "fun(a, b, c) : Object (esprima)"]
		]);
	};
	tests["test in function 4"] = function() {
		var results = computeContentAssist("function fun(a, b, c) {}\nfunction other(aa, ab, c) {a/**/}", "a");
		testProposals("a", results, [
			["aa", "aa : {  } (esprima)"],
			["ab", "ab : {  } (esprima)"],
			["arguments", "arguments : Arguments (esprima)"]
		]);
	};
	tests["test in function 5"] = function() {
		// should not see 'aaa' since that is declared later
		var results = computeContentAssist("function fun(a, b, c) {}\nfunction other(aa, ab, c) {var abb;\na/**/\nvar aaa}", "a");
		testProposals("a", results, [
			["aa", "aa : {  } (esprima)"],
			["ab", "ab : {  } (esprima)"],
			["abb", "abb : Object (esprima)"],
			["arguments", "arguments : Arguments (esprima)"]
		]);
	};
	tests["test in function 6"] = function() {
		// should not see 'aaa' since that is declared later
		var results = computeContentAssist(
		"function fun(a, b, c) {\n" +
		"function other(aa, ab, c) {\n"+
		"var abb;\na/**/\nvar aaa\n}\n}", "a");
		testProposals("a", results, [
			["a", "a : {  } (esprima)"],
			["aa", "aa : {  } (esprima)"],
			["ab", "ab : {  } (esprima)"],
			["abb", "abb : Object (esprima)"],
			// FIXADE Yikes!  getting arguments twice for nested function
			["arguments", "arguments : Arguments (esprima)"],
			["arguments", "arguments : Arguments (esprima)"]
		]);
	};
	tests["test in function 7"] = function() {
		// should not see 'aaa' since that is declared later
		var results = computeContentAssist(
		"function fun(a, b, c) {/**/\n" +
		"function other(aa, ab, ac) {\n"+
		"var abb;\na\nvar aaa\n}\n}");
		testProposals("", results, [
			["Array([val])", "Array([val]) : Array (esprima)"],
			["Boolean([val])", "Boolean([val]) : Boolean (esprima)"],
			["Date([val])", "Date([val]) : Date (esprima)"],
			["Error([err])", "Error([err]) : Error (esprima)"],
			["Function()", "Function() : Function (esprima)"],
			["JSON", "JSON : JSON (esprima)"],
			["Math", "Math : Math (esprima)"],
			["Number([val])", "Number([val]) : Number (esprima)"],
			["Object([val])", "Object([val]) : Object (esprima)"],
			["RegExp([val])", "RegExp([val]) : RegExp (esprima)"],
			["a", "a : {  } (esprima)"],
			["arguments", "arguments : Arguments (esprima)"],
			["b", "b : {  } (esprima)"],
			["c", "c : {  } (esprima)"],
			["decodeURI(uri)", "decodeURI(uri) : String (esprima)"],
			["encodeURI(uri)", "encodeURI(uri) : String (esprima)"],
			["eval(toEval)", "eval(toEval) : Object (esprima)"],
			["fun(a, b, c)", "fun(a, b, c) : Object (esprima)"],
			["hasOwnProperty(property)", "hasOwnProperty(property) : boolean (esprima)"],
			["isPrototypeOf(object)", "isPrototypeOf(object) : boolean (esprima)"],
			["parseFloat(str, [radix])", "parseFloat(str, [radix]) : Number (esprima)"],
			["parseInt(str, [radix])", "parseInt(str, [radix]) : Number (esprima)"],
			["propertyIsEnumerable(property)", "propertyIsEnumerable(property) : boolean (esprima)"],
			["prototype", "prototype : Object (esprima)"],
			["this", "this : Global (esprima)"],
			["toLocaleString()", "toLocaleString() : String (esprima)"],
			["toString()", "toString() : String (esprima)"],
			["valueOf()", "valueOf() : Object (esprima)"]
		]);
	};
	tests["test in function 8"] = function() {
		// should not see 'aaa' since that is declared later
		var results = computeContentAssist(
		"function fun(a, b, c) {\n" +
		"function other(aa, ab, ac) {\n"+
		"var abb;\na\nvar aaa\n} /**/\n}");
		testProposals("", results, [
			["Array([val])", "Array([val]) : Array (esprima)"],
			["Boolean([val])", "Boolean([val]) : Boolean (esprima)"],
			["Date([val])", "Date([val]) : Date (esprima)"],
			["Error([err])", "Error([err]) : Error (esprima)"],
			["Function()", "Function() : Function (esprima)"],
			["JSON", "JSON : JSON (esprima)"],
			["Math", "Math : Math (esprima)"],
			["Number([val])", "Number([val]) : Number (esprima)"],
			["Object([val])", "Object([val]) : Object (esprima)"],
			["RegExp([val])", "RegExp([val]) : RegExp (esprima)"],
			["a", "a : {  } (esprima)"],
			["arguments", "arguments : Arguments (esprima)"],
			["b", "b : {  } (esprima)"],
			["c", "c : {  } (esprima)"],
			["decodeURI(uri)", "decodeURI(uri) : String (esprima)"],
			["encodeURI(uri)", "encodeURI(uri) : String (esprima)"],
			["eval(toEval)", "eval(toEval) : Object (esprima)"],
			["fun(a, b, c)", "fun(a, b, c) : Object (esprima)"],
			["hasOwnProperty(property)", "hasOwnProperty(property) : boolean (esprima)"],
			["isPrototypeOf(object)", "isPrototypeOf(object) : boolean (esprima)"],
			["other(aa, ab, ac)", "other(aa, ab, ac) : Object (esprima)"],
			["parseFloat(str, [radix])", "parseFloat(str, [radix]) : Number (esprima)"],
			["parseInt(str, [radix])", "parseInt(str, [radix]) : Number (esprima)"],
			["propertyIsEnumerable(property)", "propertyIsEnumerable(property) : boolean (esprima)"],
			["prototype", "prototype : Object (esprima)"],
			["this", "this : Global (esprima)"],
			["toLocaleString()", "toLocaleString() : String (esprima)"],
			["toString()", "toString() : String (esprima)"],
			["valueOf()", "valueOf() : Object (esprima)"]
		]);
	};
	
	
	// all inferencing based content assist tests here
	tests["test Object inferencing with Variable"] = function() {
		var results = computeContentAssist("var t = {}\nt.h", "h");
		testProposals("h", results, [
			["hasOwnProperty(property)", "hasOwnProperty(property) : boolean (esprima)"]
		]);
	};
	tests["test Object Literal inferencing"] = function() {
		var results = computeContentAssist("var t = { hhh : 1, hh2 : 8}\nt.h", "h");
		testProposals("h", results, [
			["hasOwnProperty(property)", "hasOwnProperty(property) : boolean (esprima)"],
			["hh2", "hh2 : Number (esprima)"],
			["hhh", "hhh : Number (esprima)"]
		]);
	};
	tests["test Simple String inferencing"] = function() {
		var results = computeContentAssist("''.char", "char");
		testProposals("char", results, [
			["charAt(index)", "charAt(index) : String (esprima)"],
			["charCodeAt(index)", "charCodeAt(index) : Number (esprima)"]
		]);
	};
	tests["test Simple Date inferencing"] = function() {
		var results = computeContentAssist("new Date().setD", "setD");
		testProposals("setD", results, [
			["setDate(date)", "setDate(date) : Number (esprima)"],
			["setDay(dayOfWeek)", "setDay(dayOfWeek) : Number (esprima)"]
		]);
	};
	tests["test Number inferencing with Variable"] = function() {
		var results = computeContentAssist("var t = 1\nt.to", "to");
		testProposals("to", results, [
			["toExponential(digits)", "toExponential(digits) : Number (esprima)"],
			["toFixed(digits)", "toFixed(digits) : Number (esprima)"],
			["toLocaleString()", "toLocaleString() : String (esprima)"],
			["toPrecision(digits)", "toPrecision(digits) : Number (esprima)"],
			["toString()", "toString() : String (esprima)"]
		]);
	};
	
	tests["test Data flow Object Literal inferencing"] = function() {
		var results = computeContentAssist("var s = { hhh : 1, hh2 : 8}\nvar t = s;\nt.h", "h");
		testProposals("h", results, [
			["hasOwnProperty(property)", "hasOwnProperty(property) : boolean (esprima)"],
			["hh2", "hh2 : Number (esprima)"],
			["hhh", "hhh : Number (esprima)"]
		]);
	};
	tests["test Data flow inferencing 1"] = function() {
		var results = computeContentAssist("var ttt = 9\nttt.toF", "toF");
		testProposals("toF", results, [
			["toFixed(digits)", "toFixed(digits) : Number (esprima)"]
		]);
	};
	tests["test Data flow inferencing 2"] = function() {
		var results = computeContentAssist("ttt = 9\nttt.toF", "toF");
		testProposals("toF", results, [
			["toFixed(digits)", "toFixed(digits) : Number (esprima)"]
		]);
	};
	tests["test Data flow inferencing 3"] = function() {
		var results = computeContentAssist("var ttt = \"\"\nttt = 9\nttt.toF", "toF");
		testProposals("toF", results, [
			["toFixed(digits)", "toFixed(digits) : Number (esprima)"]
		]);
	};
	tests["test Data flow inferencing 4"] = function() {
		var results = computeContentAssist("var name = toString(property.key.value);\nname.co", "co");
		testProposals("co", results, [
			["concat(array)", "concat(array) : String (esprima)"]
		]);
	};
	
	tests["test Simple this"] = function() {
		var results = computeContentAssist("var ssss = 4;\nthis.ss", "ss");
		testProposals("ss", results, [
			["ssss", "ssss : Number (esprima)"]
		]);
	};
	
	tests["test Object Literal inside"] = function() {
		var results = computeContentAssist("var x = { the : 1, far : this.th/**/ };", "th");
		testProposals("th", results, [
			// type is 'Object' here, not number, since inside the object literal, we don't 
			// know the types of literal fields
			["the", "the : Object (esprima)"]
		]);
	};
	tests["test Object Literal outside"] = function() {
		var results = computeContentAssist("var x = { the : 1, far : 2 };\nx.th", "th");
		testProposals("th", results, [
			["the", "the : Number (esprima)"]
		]);
	};
	tests["test Object Literal none"] = function() {
		var results = computeContentAssist("var x = { the : 1, far : 2 };\nthis.th", "th");
		testProposals("th", results, [
		]);
	};
	tests["test Object Literal outside 2"] = function() {
		var results = computeContentAssist("var x = { the : 1, far : 2 };\nvar who = x.th", "th");
		testProposals("th", results, [
			["the", "the : Number (esprima)"]
		]);
	};
	tests["test Object Literal outside 3"] = function() {
		var results = computeContentAssist("var x = { the : 1, far : 2 };\nwho(x.th/**/)", "th");
		testProposals("th", results, [
			["the", "the : Number (esprima)"]
		]);
	};
	tests["test Object Literal outside 4"] = function() {
		var results = computeContentAssist("var x = { the : 1, far : 2 };\nwho(yyy, x.th/**/)", "th");
		testProposals("th", results, [
			["the", "the : Number (esprima)"]
		]);
	};
	tests["test this reference 1"] = function() {
		var results = computeContentAssist("var xxxx;\nthis.x", "x");
		testProposals("x", results, [
			["xxxx", "xxxx : Object (esprima)"]
		]);
	};
	tests["test binary expression 1"] = function() {
		var results = computeContentAssist("(1+3).toF", "toF");
		testProposals("toF", results, [
			["toFixed(digits)", "toFixed(digits) : Number (esprima)"]
		]);
	};
	
	// not working since for loop is not storing slocs of var ii
	tests["test for loop 1"] = function() {
		var results = computeContentAssist("for (var ii=0;i/**/<8;ii++) { ii }", "i");
		testProposals("i", results, [
			["ii", "ii : Number (esprima)"],
			["isPrototypeOf(object)", "isPrototypeOf(object) : boolean (esprima)"]
		]);
	};
	tests["test for loop 2"] = function() {
		var results = computeContentAssist("for (var ii=0;ii<8;i/**/++) { ii }", "i");
		testProposals("i", results, [
			["ii", "ii : Number (esprima)"],
			["isPrototypeOf(object)", "isPrototypeOf(object) : boolean (esprima)"]
		]);
	};
	tests["test for loop 3"] = function() {
		var results = computeContentAssist("for (var ii=0;ii<8;ii++) { i/**/ }", "i");
		testProposals("i", results, [
			["ii", "ii : Number (esprima)"],
			["isPrototypeOf(object)", "isPrototypeOf(object) : boolean (esprima)"]
		]);
	};
	tests["test while loop 1"] = function() {
		var results = computeContentAssist("var iii;\nwhile(ii/**/ === null) {\n}", "ii");
		testProposals("ii", results, [
			["iii", "iii : Object (esprima)"]
		]);
	};
	tests["test while loop 2"] = function() {
		var results = computeContentAssist("var iii;\nwhile(this.ii/**/ === null) {\n}", "ii");
		testProposals("ii", results, [
			["iii", "iii : Object (esprima)"]
		]);
	};
	tests["test while loop 3"] = function() {
		var results = computeContentAssist("var iii;\nwhile(iii === null) {this.ii/**/\n}", "ii");
		testProposals("ii", results, [
			["iii", "iii : Object (esprima)"]
		]);
	};
	tests["test catch clause 1"] = function() {
		var results = computeContentAssist("try { } catch (eee) {e/**/  }", "e");
		testProposals("e", results, [
			["eee", "eee : Error (esprima)"],
			["encodeURI(uri)", "encodeURI(uri) : String (esprima)"],
			["eval(toEval)", "eval(toEval) : Object (esprima)"]
		]);
	};
	tests["test catch clause 2"] = function() {
		// the type of the catch variable is Error
		var results = computeContentAssist("try { } catch (eee) {\neee.me/**/  }", "me");
		testProposals("me", results, [
			["message", "message : String (esprima)"]
		]);
	};
	
	
	tests["test get global var"] = function() {
		// should infer that we are referring to the globally defined xxx, not the param
		var results = computeContentAssist("var xxx = 9;\nfunction fff(xxx) { this.xxx.toF/**/}", "toF");
		testProposals("toF", results, [
			["toFixed(digits)", "toFixed(digits) : Number (esprima)"]
		]);
	};
	
	tests["test get local var"] = function() {
		// should infer that we are referring to the locally defined xxx, not the global
		var results = computeContentAssist("var xxx = 9;\nfunction fff(xxx) { xxx.toF/**/}", "toF");
		testProposals("toF", results, [
		]);
	};

	tests["test Math 1"] = function() {
		var results = computeContentAssist("Mat", "Mat");
		testProposals("Mat", results, [
			["Math", "Math : Math (esprima)"]
		]);
	};
	tests["test Math 2"] = function() {
		var results = computeContentAssist("this.Mat", "Mat");
		testProposals("Mat", results, [
			["Math", "Math : Math (esprima)"]
		]);
	};
	tests["test Math 3"] = function() {
		// Math not available when this isn't the global this
		var results = computeContentAssist("var ff = { f: this.Mat/**/ }", "Mat");
		testProposals("Mat", results, [
		]);
	};
	tests["test Math 4"] = function() {
		var results = computeContentAssist("this.Math.E", "E");
		testProposals("E", results, [
			["E", "E : Number (esprima)"]
		]);
	};
	tests["test JSON 4"] = function() {
		var results = computeContentAssist("this.JSON.st", "st");
		testProposals("st", results, [
			["stringify(obj)", "stringify(obj) : String (esprima)"]
		]);
	};
	tests["test multi-dot inferencing 1"] = function() {
		var results = computeContentAssist("var a = \"\";\na.charAt().charAt().charAt().ch", "ch");
		testProposals("ch", results, [
			["charAt(index)", "charAt(index) : String (esprima)"],
			["charCodeAt(index)", "charCodeAt(index) : Number (esprima)"]
		]);
	};
	tests["test multi-dot inferencing 2"] = function() {
		var results = computeContentAssist(
		"var zz = {};\nzz.zz = zz;\nzz.zz.zz.z", "z");
		testProposals("z", results, [
			["zz", "zz : { zz : { zz : {...} } } (esprima)"]
		]);
	};
	tests["test multi-dot inferencing 3"] = function() {
		var results = computeContentAssist(
		"var x = { yy : { } };\nx.yy.zz = 1;\nx.yy.z", "z");
		testProposals("z", results, [
			["zz", "zz : Number (esprima)"]
		]);
	};
	tests["test multi-dot inferencing 4"] = function() {
		var results = computeContentAssist(
		"var x = { yy : { } };\nx.yy.zz = 1;\nx.yy.zz.toF", "toF");
		testProposals("toF", results, [
			["toFixed(digits)", "toFixed(digits) : Number (esprima)"]
		]);
	};
	tests["test constructor 1"] = function() {
		var results = computeContentAssist(
		"function Fun() {\n	this.xxx = 9;\n	this.uuu = this.x/**/;}", "x");
		testProposals("x", results, [
			["xxx", "xxx : Number (esprima)"]
		]);
	};
	tests["test constructor 2"] = function() {
		var results = computeContentAssist(
		"function Fun() {	this.xxx = 9;	this.uuu = this.xxx; }\n" +
		"var y = new Fun();\n" +	
		"y.x", "x");
		testProposals("x", results, [
			["xxx", "xxx : Number (esprima)"]
		]);
	};
	tests["test constructor 3"] = function() {
		var results = computeContentAssist(
		"function Fun() {	this.xxx = 9;	this.uuu = this.xxx; }\n" +
		"var y = new Fun();\n" +
		"y.xxx.toF", "toF");
		testProposals("toF", results, [
			["toFixed(digits)", "toFixed(digits) : Number (esprima)"]
		]);
	};
	tests["test constructor 3"] = function() {
		var results = computeContentAssist(
		"function Fun() {	this.xxx = 9;	this.uuu = this.xxx; }\n" +
		"var y = new Fun();\n" +
		"y.uuu.toF", "toF");
		testProposals("toF", results, [
			["toFixed(digits)", "toFixed(digits) : Number (esprima)"]
		]);
	};
	
	tests["test constructor 4"] = function() {
		var results = computeContentAssist(
		"var Fun = function () {	this.xxx = 9;	this.uuu = this.xxx; }\n" +
		"var y = new Fun();\n" +
		"y.uuu.toF", "toF");
		testProposals("toF", results, [
			["toFixed(digits)", "toFixed(digits) : Number (esprima)"]
		]);
	};
	
	tests["test constructor 5"] = function() {
		var results = computeContentAssist(
		"var x = { Fun : function () { this.xxx = 9;	this.uuu = this.xxx; } }\n" +
		"var y = new x.Fun();\n" +
		"y.uuu.toF", "toF");
		testProposals("toF", results, [
			["toFixed(digits)", "toFixed(digits) : Number (esprima)"]
		]);
	};
	
	tests["test constructor 6"] = function() {
		var results = computeContentAssist(
		"var x = { Fun : function () { this.xxx = 9;	this.uuu = this.xxx; } }\n" +
		"var y = new x.Fun().uuu.toF", "toF");
		testProposals("toF", results, [
			["toFixed(digits)", "toFixed(digits) : Number (esprima)"]
		]);
	};
	
	tests["test constructor 7"] = function() {
		var results = computeContentAssist(
		"var Fun = function () {	this.xxx = 9;	this.uuu = this.xxx; }\n" +
		"var x = { Fun : Fun };\n" +
		"var y = new x.Fun();\n" +
		"y.uuu.toF", "toF");
		testProposals("toF", results, [
			["toFixed(digits)", "toFixed(digits) : Number (esprima)"]
		]);
	};
	
	tests["test constructor 8"] = function() {
		var results = computeContentAssist(
		"var FunOrig = function () {	this.xxx = 9;	this.uuu = this.xxx; }\n" +
		"var x = { Fun : FunOrig };\n" +
		"var y = new x.Fun();\n" +
		"y.uuu.toF", "toF");
		testProposals("toF", results, [
			["toFixed(digits)", "toFixed(digits) : Number (esprima)"]
		]);
	};
	
	// functions should not be available outside the scope that declares them
	tests["test constructor 9"] = function() {
		var results = computeContentAssist(
		"function outer() { function Inner() { }}\n" +
		"Inn", "Inn");
		testProposals("Inn", results, [
			// empty
		]);
	};
	
	// should be able to reference functions using qualified name
	tests["test constructor 10"] = function() {
		var results = computeContentAssist(
		"var outer = { Inner : function() { }}\n" +
		"outer.Inn", "Inn");
		testProposals("Inn", results, [
			["Inner()", "Inner() : Inner (esprima)"]
		]);
	};
	
	tests["test Function args 1"] = function() {
		var results = computeContentAssist(
		"var ttt, uuu;\nttt(/**/)");
		testProposals("", results, [
			["Array([val])", "Array([val]) : Array (esprima)"],
			["Boolean([val])", "Boolean([val]) : Boolean (esprima)"],
			["Date([val])", "Date([val]) : Date (esprima)"],
			["Error([err])", "Error([err]) : Error (esprima)"],
			["Function()", "Function() : Function (esprima)"],
			["JSON", "JSON : JSON (esprima)"],
			["Math", "Math : Math (esprima)"],
			["Number([val])", "Number([val]) : Number (esprima)"],
			["Object([val])", "Object([val]) : Object (esprima)"],
			["RegExp([val])", "RegExp([val]) : RegExp (esprima)"],
			["decodeURI(uri)", "decodeURI(uri) : String (esprima)"],
			["encodeURI(uri)", "encodeURI(uri) : String (esprima)"],
			["eval(toEval)", "eval(toEval) : Object (esprima)"],
			["hasOwnProperty(property)", "hasOwnProperty(property) : boolean (esprima)"],
			["isPrototypeOf(object)", "isPrototypeOf(object) : boolean (esprima)"],
			["parseFloat(str, [radix])", "parseFloat(str, [radix]) : Number (esprima)"],
			["parseInt(str, [radix])", "parseInt(str, [radix]) : Number (esprima)"],
			["propertyIsEnumerable(property)", "propertyIsEnumerable(property) : boolean (esprima)"],
			["prototype", "prototype : Object (esprima)"],
			["this", "this : Global (esprima)"],
			["toLocaleString()", "toLocaleString() : String (esprima)"],
			["toString()", "toString() : String (esprima)"],
			["ttt", "ttt : Object (esprima)"],
			["uuu", "uuu : Object (esprima)"],
			["valueOf()", "valueOf() : Object (esprima)"]
		]);
	};
	tests["test Function args 2"] = function() {
		var results = computeContentAssist(
		"var ttt, uuu;\nttt(ttt, /**/)");
		testProposals("", results, [
			["Array([val])", "Array([val]) : Array (esprima)"],
			["Boolean([val])", "Boolean([val]) : Boolean (esprima)"],
			["Date([val])", "Date([val]) : Date (esprima)"],
			["Error([err])", "Error([err]) : Error (esprima)"],
			["Function()", "Function() : Function (esprima)"],
			["JSON", "JSON : JSON (esprima)"],
			["Math", "Math : Math (esprima)"],
			["Number([val])", "Number([val]) : Number (esprima)"],
			["Object([val])", "Object([val]) : Object (esprima)"],
			["RegExp([val])", "RegExp([val]) : RegExp (esprima)"],
			["decodeURI(uri)", "decodeURI(uri) : String (esprima)"],
			["encodeURI(uri)", "encodeURI(uri) : String (esprima)"],
			["eval(toEval)", "eval(toEval) : Object (esprima)"],
			["hasOwnProperty(property)", "hasOwnProperty(property) : boolean (esprima)"],
			["isPrototypeOf(object)", "isPrototypeOf(object) : boolean (esprima)"],
			["parseFloat(str, [radix])", "parseFloat(str, [radix]) : Number (esprima)"],
			["parseInt(str, [radix])", "parseInt(str, [radix]) : Number (esprima)"],
			["propertyIsEnumerable(property)", "propertyIsEnumerable(property) : boolean (esprima)"],
			["prototype", "prototype : Object (esprima)"],
			["this", "this : Global (esprima)"],
			["toLocaleString()", "toLocaleString() : String (esprima)"],
			["toString()", "toString() : String (esprima)"],
			["ttt", "ttt : Object (esprima)"],
			["uuu", "uuu : Object (esprima)"],
			["valueOf()", "valueOf() : Object (esprima)"]
		]);
	};
	tests["test Function args 3"] = function() {
		var results = computeContentAssist(
		"var ttt, uuu;\nttt(ttt, /**/, uuu)");
		testProposals("", results, [
			["Array([val])", "Array([val]) : Array (esprima)"],
			["Boolean([val])", "Boolean([val]) : Boolean (esprima)"],
			["Date([val])", "Date([val]) : Date (esprima)"],
			["Error([err])", "Error([err]) : Error (esprima)"],
			["Function()", "Function() : Function (esprima)"],
			["JSON", "JSON : JSON (esprima)"],
			["Math", "Math : Math (esprima)"],
			["Number([val])", "Number([val]) : Number (esprima)"],
			["Object([val])", "Object([val]) : Object (esprima)"],
			["RegExp([val])", "RegExp([val]) : RegExp (esprima)"],
			["decodeURI(uri)", "decodeURI(uri) : String (esprima)"],
			["encodeURI(uri)", "encodeURI(uri) : String (esprima)"],
			["eval(toEval)", "eval(toEval) : Object (esprima)"],
			["hasOwnProperty(property)", "hasOwnProperty(property) : boolean (esprima)"],
			["isPrototypeOf(object)", "isPrototypeOf(object) : boolean (esprima)"],
			["parseFloat(str, [radix])", "parseFloat(str, [radix]) : Number (esprima)"],
			["parseInt(str, [radix])", "parseInt(str, [radix]) : Number (esprima)"],
			["propertyIsEnumerable(property)", "propertyIsEnumerable(property) : boolean (esprima)"],
			["prototype", "prototype : Object (esprima)"],
			["this", "this : Global (esprima)"],
			["toLocaleString()", "toLocaleString() : String (esprima)"],
			["toString()", "toString() : String (esprima)"],
			["ttt", "ttt : Object (esprima)"],
			["uuu", "uuu : Object (esprima)"],
			["valueOf()", "valueOf() : Object (esprima)"]
		]);
	};
	
	// FIXADE failing since we do not handle constructors that are not identifiers
//	tests["test constructor 5"] = function() {
//		var results = computeContentAssist(
//		"var obj = { Fun : function() {	this.xxx = 9;	this.uuu = this.xxx; } }\n" +
//		"var y = new obj.Fun();\n" +
//		"y.uuu.toF", "toF");
//		testProposals(results, [
//			["toFixed(digits)", "toFixed(digits) : Number (esprima)"]
//		]);
//	};
	tests["test constructor 6"] = function() {
		var results = computeContentAssist(
		"function Fun2() {\n" +
		"function Fun() {	this.xxx = 9;	this.uuu = this.xxx; }\n" +
		"var y = new Fun();\n" +
		"y.uuu.toF/**/}", "toF");
		testProposals("toF", results, [
			["toFixed(digits)", "toFixed(digits) : Number (esprima)"]
		]);
	};
	
	
	tests["test nested object expressions 1"] = function() {
		var results = computeContentAssist(
		"var ttt = { xxx : { yyy : { zzz : 1} } };\n" +
		"ttt.xxx.y", "y");
		testProposals("y", results, [
			["yyy", "yyy : { zzz : Number } (esprima)"]
		]);
	};
	tests["test nested object expressions 2"] = function() {
		var results = computeContentAssist(
		"var ttt = { xxx : { yyy : { zzz : 1} } };\n" +
		"ttt.xxx.yyy.z", "z");
		testProposals("z", results, [
			["zzz", "zzz : Number (esprima)"]
		]);
	};
	tests["test nested object expressions 3"] = function() {
		var results = computeContentAssist(
		"var ttt = { xxx : { yyy : { zzz : 1} } };\n" +
		"ttt.xxx.yyy.zzz.toF", "toF");
		testProposals("toF", results, [
			["toFixed(digits)", "toFixed(digits) : Number (esprima)"]
		]);
	};
	
	tests["test function expression 1"] = function() {
		var results = computeContentAssist(
		"var ttt = function(a, b, c) { };\ntt", "tt");
		testProposals("tt", results, [
			["ttt(a, b, c)", "ttt(a, b, c) : Object (esprima)"]
		]);
	};
	tests["test function expression 2"] = function() {
		var results = computeContentAssist(
		"ttt = function(a, b, c) { };\ntt", "tt");
		testProposals("tt", results, [
			["ttt(a, b, c)", "ttt(a, b, c) : Object (esprima)"]
		]);
	};
	tests["test function expression 3"] = function() {
		var results = computeContentAssist(
		"ttt = { rrr : function(a, b, c) { } };\nttt.rr", "rr");
		testProposals("rr", results, [
			["rrr(a, b, c)", "rrr(a, b, c) : Object (esprima)"]
		]);
	};
	tests["test function expression 4"] = function() {
		var results = computeContentAssist(
		"var ttt = function(a, b) { };\nvar hhh = ttt;\nhhh", "hhh");
		testProposals("hhh", results, [
			["hhh(a, b)", "hhh(a, b) : Object (esprima)"]
		]);
	};
	tests["test function expression 4a"] = function() {
		var results = computeContentAssist(
		"function ttt(a, b) { };\nvar hhh = ttt;\nhhh", "hhh");
		testProposals("hhh", results, [
			["hhh(a, b)", "hhh(a, b) : Object (esprima)"]
		]);
	};
	tests["test function expression 5"] = function() {
		var results = computeContentAssist(
		"var uuu = {	flart : function (a,b) { } };\nhhh = uuu.flart;\nhhh", "hhh");
		testProposals("hhh", results, [
			["hhh(a, b)", "hhh(a, b) : Object (esprima)"]
		]);
	};
	tests["test function expression 6"] = function() {
		var results = computeContentAssist(
		"var uuu = {	flart : function (a,b) { } };\nhhh = uuu.flart;\nhhh.app", "app");
		testProposals("app", results, [
			["apply(func, [argArray])", "apply(func, [argArray]) : Object (esprima)"]
		]);
	};
	
	tests["test globals 1"] = function() {
		var results = computeContentAssist("/*global faaa */\nfa", "fa");
		testProposals("fa", results, [
			["faaa", "faaa : {  } (esprima)"]
		]);
	};
	tests["test globals 2"] = function() {
		var results = computeContentAssist("/*global  \t\n faaa \t\t\n faaa2  */\nfa", "fa");
		testProposals("fa", results, [
			["faaa", "faaa : {  } (esprima)"],
			["faaa2", "faaa2 : {  } (esprima)"]
		]);
	};
	tests["test globals 3"] = function() {
		var results = computeContentAssist("/*global  \t\n faaa \t\t\n fass2  */\nvar t = 1;\nt.fa", "fa");
		testProposals("fa", results, [
		]);
	};
	
	////////////////////////////
	// tests for complex names
	////////////////////////////
	tests["test complex name 1"] = function() {
		var results = computeContentAssist("function Ttt() { }\nvar ttt = new Ttt();\ntt", "tt");
		testProposals("tt", results, [
			["ttt", "ttt : Ttt (esprima)"]
		]);
	};
	tests["test complex name 2"] = function() {
		var results = computeContentAssist("var Ttt = function() { };\nvar ttt = new Ttt();\ntt", "tt");
		testProposals("tt", results, [
			["ttt", "ttt : Ttt (esprima)"]
		]);
	};
	tests["test complex name 3"] = function() {
		var results = computeContentAssist("var ttt = { };\ntt", "tt");
		testProposals("tt", results, [
			["ttt", "ttt : {  } (esprima)"]
		]);
	};
	tests["test complex name 4"] = function() {
		var results = computeContentAssist("var ttt = { aa: 1, bb: 2 };\ntt", "tt");
		testProposals("tt", results, [
			["ttt", "ttt : { aa : Number, bb : Number } (esprima)"]
		]);
	};
	tests["test complex name 5"] = function() {
		var results = computeContentAssist("var ttt = { aa: 1, bb: 2 };\nttt.cc = 9;\ntt", "tt");
		testProposals("tt", results, [
			["ttt", "ttt : { aa : Number, bb : Number, cc : Number } (esprima)"]
		]);
	};
	
	////////////////////////////
	// tests for broken syntax
	////////////////////////////

	tests["test broken after dot 1"] = function() {
		var results = computeContentAssist("var ttt = { ooo:8};\nttt.", "");
		testProposals("", results, [
			["hasOwnProperty(property)", "hasOwnProperty(property) : boolean (esprima)"],
			["isPrototypeOf(object)", "isPrototypeOf(object) : boolean (esprima)"],
			["ooo", "ooo : Number (esprima)"],
			["propertyIsEnumerable(property)", "propertyIsEnumerable(property) : boolean (esprima)"],
			["prototype", "prototype : Object (esprima)"],
			["toLocaleString()", "toLocaleString() : String (esprima)"],
			["toString()", "toString() : String (esprima)"],
			["valueOf()", "valueOf() : Object (esprima)"]
		]);
	};
	
	tests["test broken after dot 2"] = function() {
		var results = computeContentAssist("var ttt = { ooo:8};\nif (ttt.) { ttt }", "", "var ttt = { ooo:8};\nif (ttt.".length);
		testProposals("", results, [
			["hasOwnProperty(property)", "hasOwnProperty(property) : boolean (esprima)"],
			["isPrototypeOf(object)", "isPrototypeOf(object) : boolean (esprima)"],
			["ooo", "ooo : Number (esprima)"],
			["propertyIsEnumerable(property)", "propertyIsEnumerable(property) : boolean (esprima)"],
			["prototype", "prototype : Object (esprima)"],
			["toLocaleString()", "toLocaleString() : String (esprima)"],
			["toString()", "toString() : String (esprima)"],
			["valueOf()", "valueOf() : Object (esprima)"]
		]);
	};
	tests["test broken after dot 3"] = function() {
		var results = computeContentAssist("var ttt = { ooo:this.};", "", "var ttt = { ooo:this.".length);
		testProposals("", results, [
			["hasOwnProperty(property)", "hasOwnProperty(property) : boolean (esprima)"],
			["isPrototypeOf(object)", "isPrototypeOf(object) : boolean (esprima)"],
			["ooo", "ooo : Object (esprima)"],
			["propertyIsEnumerable(property)", "propertyIsEnumerable(property) : boolean (esprima)"],
			["prototype", "prototype : Object (esprima)"],
			["toLocaleString()", "toLocaleString() : String (esprima)"],
			["toString()", "toString() : String (esprima)"],
			["valueOf()", "valueOf() : Object (esprima)"]
		]);
	};
	// same as above, except use /**/
	tests["test broken after dot 3a"] = function() {
		var results = computeContentAssist("var ttt = { ooo:this./**/};", "");
		testProposals("", results, [
			["hasOwnProperty(property)", "hasOwnProperty(property) : boolean (esprima)"],
			["isPrototypeOf(object)", "isPrototypeOf(object) : boolean (esprima)"],
			["ooo", "ooo : Object (esprima)"],
			["propertyIsEnumerable(property)", "propertyIsEnumerable(property) : boolean (esprima)"],
			["prototype", "prototype : Object (esprima)"],
			["toLocaleString()", "toLocaleString() : String (esprima)"],
			["toString()", "toString() : String (esprima)"],
			["valueOf()", "valueOf() : Object (esprima)"]
		]);
	};

	tests["test broken after dot 4"] = function() {
		var results = computeContentAssist("var ttt = { ooo:8};\nfunction ff() { \nttt.}", "", "var ttt = { ooo:8};\nfunction ff() { \nttt.".length);
		testProposals("", results, [
			["hasOwnProperty(property)", "hasOwnProperty(property) : boolean (esprima)"],
			["isPrototypeOf(object)", "isPrototypeOf(object) : boolean (esprima)"],
			["ooo", "ooo : Number (esprima)"],
			["propertyIsEnumerable(property)", "propertyIsEnumerable(property) : boolean (esprima)"],
			["prototype", "prototype : Object (esprima)"],
			["toLocaleString()", "toLocaleString() : String (esprima)"],
			["toString()", "toString() : String (esprima)"],
			["valueOf()", "valueOf() : Object (esprima)"]
		]);
	};
	// same as above, except use /**/
	tests["test broken after dot 4a"] = function() {
		var results = computeContentAssist("var ttt = { ooo:8};\nfunction ff() { \nttt./**/}", "");
		testProposals("", results, [
			["hasOwnProperty(property)", "hasOwnProperty(property) : boolean (esprima)"],
			["isPrototypeOf(object)", "isPrototypeOf(object) : boolean (esprima)"],
			["ooo", "ooo : Number (esprima)"],
			["propertyIsEnumerable(property)", "propertyIsEnumerable(property) : boolean (esprima)"],
			["prototype", "prototype : Object (esprima)"],
			["toLocaleString()", "toLocaleString() : String (esprima)"],
			["toString()", "toString() : String (esprima)"],
			["valueOf()", "valueOf() : Object (esprima)"]
		]);
	};
	
	tests["test broken after dot 5"] = function() {
		var results = computeContentAssist(
			"var first = {ooo:9};\n" +
			"first.\n" +
			"var jjj;", "",
	
			("var first = {ooo:9};\n" +
			"first.").length);

		testProposals("", results, [
			["hasOwnProperty(property)", "hasOwnProperty(property) : boolean (esprima)"],
			["isPrototypeOf(object)", "isPrototypeOf(object) : boolean (esprima)"],
			["ooo", "ooo : Number (esprima)"],
			["propertyIsEnumerable(property)", "propertyIsEnumerable(property) : boolean (esprima)"],
			["prototype", "prototype : Object (esprima)"],
			["toLocaleString()", "toLocaleString() : String (esprima)"],
			["toString()", "toString() : String (esprima)"],
			["valueOf()", "valueOf() : Object (esprima)"]
		]);
	};
	
	
	tests["test broken after dot 6"] = function() {
		var results = computeContentAssist(
			"var first = {ooo:9};\n" +
			"first.\n" +
			"if (x) { }", "",
	
			("var first = {ooo:9};\n" +
			"first.").length);

		testProposals("", results, [
			["hasOwnProperty(property)", "hasOwnProperty(property) : boolean (esprima)"],
			["isPrototypeOf(object)", "isPrototypeOf(object) : boolean (esprima)"],
			["ooo", "ooo : Number (esprima)"],
			["propertyIsEnumerable(property)", "propertyIsEnumerable(property) : boolean (esprima)"],
			["prototype", "prototype : Object (esprima)"],
			["toLocaleString()", "toLocaleString() : String (esprima)"],
			["toString()", "toString() : String (esprima)"],
			["valueOf()", "valueOf() : Object (esprima)"]
		]);
	};
	
	// test return types of various simple functions
	tests["test function return type 1"] = function() {
		var results = computeContentAssist(
			"var first = function() { return 9; };\nfirst().toF", "toF");
		testProposals("toF", results, [
			["toFixed(digits)", "toFixed(digits) : Number (esprima)"]
		]);
	};
	
	tests["test function return type 1a"] = function() {
		// complete on a function, not a number
		var results = computeContentAssist(
			"var first = function() { return 9; };\nfirst.arg", "arg");
		testProposals("arg", results, [
			["arguments", "arguments : Arguments (esprima)"]
		]);
	};
	
	tests["test function return type 2"] = function() {
		var results = computeContentAssist(
			"function first() { return 9; };\nfirst().toF", "toF");
		testProposals("toF", results, [
			["toFixed(digits)", "toFixed(digits) : Number (esprima)"]
		]);
	};
	
	tests["test function return type 3"] = function() {
		var results = computeContentAssist(
			"var obj = { first : function () { return 9; } };\nobj.first().toF", "toF");
		testProposals("toF", results, [
			["toFixed(digits)", "toFixed(digits) : Number (esprima)"]
		]);
	};
	
	tests["test function return type 4"] = function() {
		var results = computeContentAssist(
			"function first() { return { ff : 9 }; };\nfirst().ff.toF", "toF");
		testProposals("toF", results, [
			["toFixed(digits)", "toFixed(digits) : Number (esprima)"]
		]);
	};
	
	tests["test function return type 5"] = function() {
		var results = computeContentAssist(
			"function first() { return function() { return 9; }; };\nvar ff = first();\nff().toF", "toF");
		testProposals("toF", results, [
			["toFixed(digits)", "toFixed(digits) : Number (esprima)"]
		]);
	};
	
	tests["test function return type 6"] = function() {
		var results = computeContentAssist(
			"function first() { return function() { return 9; }; };\nfirst()().toF", "toF");
		testProposals("toF", results, [
			["toFixed(digits)", "toFixed(digits) : Number (esprima)"]
		]);
	};
	
	// now test different ways that functions can be constructed
	tests["test function return type if 1"] = function() {
		var results = computeContentAssist(
			"function first() { if(true) { return 8; } };\nfirst().toF", "toF");
		testProposals("toF", results, [
			["toFixed(digits)", "toFixed(digits) : Number (esprima)"]
		]);
	};
	
	tests["test function return type if 2"] = function() {
		// always choose the last return statement
		var results = computeContentAssist(
			"function first() { if(true) { return ''; } else  { return 8; } };\nfirst().toF", "toF");
		testProposals("toF", results, [
			["toFixed(digits)", "toFixed(digits) : Number (esprima)"]
		]);
	};
	
	tests["test function return type while"] = function() {
		// always choose the last return statement
		var results = computeContentAssist(
			"function first() { while(true) { return 1; } };\nfirst().toF", "toF");
		testProposals("toF", results, [
			["toFixed(digits)", "toFixed(digits) : Number (esprima)"]
		]);
	};
	
	tests["test function return type do/while"] = function() {
		// always choose the last return statement
		var results = computeContentAssist(
			"function first() { do { return 1; } while(true); };\nfirst().toF", "toF");
		testProposals("toF", results, [
			["toFixed(digits)", "toFixed(digits) : Number (esprima)"]
		]);
	};
	
	tests["test function return type for"] = function() {
		// always choose the last return statement
		var results = computeContentAssist(
			"function first() { for (var i; i < 10; i++) { return 1; } };\nfirst().toF", "toF");
		testProposals("toF", results, [
			["toFixed(digits)", "toFixed(digits) : Number (esprima)"]
		]);
	};
	
	tests["test function return type for in"] = function() {
		// always choose the last return statement
		var results = computeContentAssist(
			"function first() { for (var i in k) { return 1; } };\nfirst().toF", "toF");
		testProposals("toF", results, [
			["toFixed(digits)", "toFixed(digits) : Number (esprima)"]
		]);
	};
	
	tests["test function return type try 1"] = function() {
		// always choose the last return statement
		var results = computeContentAssist(
			"function first() { try { return 1; } catch(e) { } };\nfirst().toF", "toF");
		testProposals("toF", results, [
			["toFixed(digits)", "toFixed(digits) : Number (esprima)"]
		]);
	};
	
	tests["test function return type try 2"] = function() {
		// always choose the last return statement
		var results = computeContentAssist(
			"function first() { try { return 1; } catch(e) { } finally { } };\nfirst().toF", "toF");
		testProposals("toF", results, [
			["toFixed(digits)", "toFixed(digits) : Number (esprima)"]
		]);
	};
	
	tests["test function return type try 3"] = function() {
		// always choose the last return statement
		var results = computeContentAssist(
			"function first() { try { return ''; } catch(e) { return 9; } finally { } };\nfirst().toF", "toF");
		testProposals("toF", results, [
			["toFixed(digits)", "toFixed(digits) : Number (esprima)"]
		]);
	};
	
	tests["test function return type try 4"] = function() {
		// always choose the last return statement
		var results = computeContentAssist(
			"function first() { try { return ''; } catch(e) { return ''; } finally { return 9; } };\nfirst().toF", "toF");
		testProposals("toF", results, [
			["toFixed(digits)", "toFixed(digits) : Number (esprima)"]
		]);
	};
	
	tests["test function return type switch 1"] = function() {
		// always choose the last return statement
		var results = computeContentAssist(
			"function first() { switch (v) { case a: return 9; } };\nfirst().toF", "toF");
		testProposals("toF", results, [
			["toFixed(digits)", "toFixed(digits) : Number (esprima)"]
		]);
	};
	
	tests["test function return type switch 2"] = function() {
		// always choose the last return statement
		var results = computeContentAssist(
			"function first() { switch (v) { case b: return ''; case a: return 1; } };\nfirst().toF", "toF");
		testProposals("toF", results, [
			["toFixed(digits)", "toFixed(digits) : Number (esprima)"]
		]);
	};
	
	tests["test function return type switch 3"] = function() {
		// always choose the last return statement
		var results = computeContentAssist(
			"function first() { switch (v) { case b: return ''; default: return 1; } };\nfirst().toF", "toF");
		testProposals("toF", results, [
			["toFixed(digits)", "toFixed(digits) : Number (esprima)"]
		]);
	};
	
	tests["test function return type nested block 1"] = function() {
		// always choose the last return statement
		var results = computeContentAssist(
			"function first() { while(true) { a;\nb\n;return 9; } };\nfirst().toF", "toF");
		testProposals("toF", results, [
			["toFixed(digits)", "toFixed(digits) : Number (esprima)"]
		]);
	};
	
	tests["test function return type nest block 2"] = function() {
		// always choose the last return statement
		var results = computeContentAssist(
			"function first() { while(true) { while(false) { \n;return 9; } } };\nfirst().toF", "toF");
		testProposals("toF", results, [
			["toFixed(digits)", "toFixed(digits) : Number (esprima)"]
		]);
	};
	tests["test function return type obj literal 1"] = function() {
		var results = computeContentAssist(
			"function first() { return { a : 9, b : '' }; };\nfir", "fir");
		testProposals("fir", results, [
			["first()", "first() : { a : Number, b : String } (esprima)"]
		]);
	};
	
	// not sure I like this.  returning an object literal wrapped in a funtion looks no different from 
	// returning an object literal
	tests["test function return type obj literal 2"] = function() {
		var results = computeContentAssist(
			"function first () {" +
			"	return function () {\n" +
			"		var a = { a : 9, b : '' };\n" +
			"		return a;\n" +
			"	}\n" +
			"}\nfir", "fir");
		testProposals("fir", results, [
			["first()", "first() : { a : Number, b : String } (esprima)"]
		]);
	};
	tests["test function return type obj literal 3"] = function() {
		var results = computeContentAssist(
			"function first () {" +
			"	return function () {\n" +
			"		var a = { a : 9, b : '' };\n" +
			"		return a;\n" +
			"	}\n" +
			"}\nfirst().ar", "ar");
		testProposals("ar", results, [
			["arguments", "arguments : Arguments (esprima)"]
		]);
	};
	tests["test function return type obj literal 4"] = function() {
		var results = computeContentAssist(
			"function first () {" +
			"	return function () {\n" +
			"		var a = { aa : 9, b : '' };\n" +
			"		return a;\n" +
			"	}\n" +
			"}\nfirst()().a", "a");
		testProposals("a", results, [
			["aa", "aa : Number (esprima)"]
		]);
	};
	
	///////////////////////////////////////////////
	// Some tests for implicitly defined variables
	///////////////////////////////////////////////
	
	// should see xxx as an object
	tests["test implicit1"] = function() {
		var results = computeContentAssist(
			"xxx;\nxx", "xx");
		testProposals("xx", results, [
			["xxx", "xxx : {  } (esprima)"]
		]);
	};
	
	tests["test implicit2"] = function() {
		var results = computeContentAssist(
			"xxx.yyy = 0;\nxxx.yy", "yy");
		testProposals("yy", results, [
			["yyy", "yyy : Number (esprima)"]
		]);
	};
	
	tests["test implicit3"] = function() {
		var results = computeContentAssist(
			"xxx;\n xxx.yyy = 0;\nxxx.yy", "yy");
		testProposals("yy", results, [
			["yyy", "yyy : Number (esprima)"]
		]);
	};
	
	tests["test implicit4"] = function() {
		var results = computeContentAssist(
			"xxx = 0;\nxx", "xx");
		testProposals("xx", results, [
			["xxx", "xxx : Number (esprima)"]
		]);
	};
	
	// implicits are available in the global scope
	tests["test implicit5"] = function() {
		var results = computeContentAssist(
			"function inner() { xxx = 0; }\nxx", "xx");
		testProposals("xx", results, [
			["xxx", "xxx : Number (esprima)"]
		]);
	};
	
	// implicits are available in the global scope
	tests["test implicit6"] = function() {
		var results = computeContentAssist(
			"var obj = { foo : function inner() { xxx = 0; } }\nxx", "xx");
		testProposals("xx", results, [
			["xxx", "xxx : Number (esprima)"]
		]);
	};
	
	// should not see an implicit if it comes after the invocation location
	tests["test implicit7"] = function() {
		var results = computeContentAssist(
			"xx/**/\nxxx", "xx");
		testProposals("xx", results, [
		]);
	};
	// should not see an implicit if it is defined at the location of content assists
	tests["test implicit8"] = function() {
		var results = computeContentAssist(
			"var xxx;\nvar obj = { foo : function inner() { xxx = 0; } }\nxx", "xx");
		testProposals("xx", results, [
			["xxx", "xxx : Number (esprima)"]
		]);
	};
	
	
	// not really an implicit variable, but
	tests["test implicit9"] = function() {
		var results = computeContentAssist(
			"xxx", "xxx");
		testProposals("xxx", results, [
		]);
	};
	
	
	///////////////////////////////////////////////
	// Binary and unary expressions
	///////////////////////////////////////////////
	tests["test binary expr1"] = function() {
		var results = computeContentAssist(
			"(1 + 2).toF", "toF");
		testProposals("toF", results, [
			["toFixed(digits)", "toFixed(digits) : Number (esprima)"]
		]);
	};
	tests["test binary expr2"] = function() {
		var results = computeContentAssist(
			"(1 + '').char", "char");
		testProposals("char", results, [
			["charAt(index)", "charAt(index) : String (esprima)"],
			["charCodeAt(index)", "charCodeAt(index) : Number (esprima)"]
		]);
	};
	tests["test binary expr3"] = function() {
		var results = computeContentAssist(
			"('' + 2).char", "char");
		testProposals("char", results, [
			["charAt(index)", "charAt(index) : String (esprima)"],
			["charCodeAt(index)", "charCodeAt(index) : Number (esprima)"]
		]);
	};
	tests["test binary expr4"] = function() {
		var results = computeContentAssist(
			"('' + hucairz).char", "char");
		testProposals("char", results, [
			["charAt(index)", "charAt(index) : String (esprima)"],
			["charCodeAt(index)", "charCodeAt(index) : Number (esprima)"]
		]);
	};
	tests["test binary expr5"] = function() {
		var results = computeContentAssist(
			"(hucairz + hucairz).toF", "toF");
		testProposals("toF", results, [
			["toFixed(digits)", "toFixed(digits) : Number (esprima)"]
		]);
	};
	tests["test binary expr6"] = function() {
		var results = computeContentAssist(
			"(hucairz - hucairz).toF", "toF");
		testProposals("toF", results, [
			["toFixed(digits)", "toFixed(digits) : Number (esprima)"]
		]);
	};
	tests["test binary expr7"] = function() {
		var results = computeContentAssist(
			"('' - '').toF", "toF");
		testProposals("toF", results, [
			["toFixed(digits)", "toFixed(digits) : Number (esprima)"]
		]);
	};
	tests["test binary expr8"] = function() {
		var results = computeContentAssist(
			"('' & '').toF", "toF");
		testProposals("toF", results, [
			["toFixed(digits)", "toFixed(digits) : Number (esprima)"]
		]);
	};
	tests["test binary expr9"] = function() {
		var results = computeContentAssist(
			"({ a : 9 } && '').a.toF", "toF");
		testProposals("toF", results, [
			["toFixed(digits)", "toFixed(digits) : Number (esprima)"]
		]);
	};
	tests["test binary expr10"] = function() {
		var results = computeContentAssist(
			"({ a : 9 } || '').a.toF", "toF");
		testProposals("toF", results, [
			["toFixed(digits)", "toFixed(digits) : Number (esprima)"]
		]);
	};
	tests["test binary expr11"] = function() {
		var results = computeContentAssist(
			"var aaa = function() { return hucairz || hucairz; }\naa", "aa");
		testProposals("aa", results, [
			["aaa()", "aaa() : {  } (esprima)"]
		]);
	};
	tests["test binary expr12"] = function() {
		var results = computeContentAssist(
			"var aaa = function() { return hucairz | hucairz; }\naa", "aa");
		testProposals("aa", results, [
			["aaa()", "aaa() : Number (esprima)"]
		]);
	};
	tests["test binary expr12"] = function() {
		var results = computeContentAssist(
			"var aaa = function() { return hucairz == hucairz; }\naa", "aa");
		testProposals("aa", results, [
			["aaa()", "aaa() : Boolean (esprima)"]
		]);
	};

	tests["test unary expr1"] = function() {
		var results = computeContentAssist(
			"(x += y).toF", "toF");
		testProposals("toF", results, [
			["toFixed(digits)", "toFixed(digits) : Number (esprima)"]
		]);
	};
	tests["test unary expr2"] = function() {
		var results = computeContentAssist(
			"(x += 1).toF", "toF");
		testProposals("toF", results, [
			["toFixed(digits)", "toFixed(digits) : Number (esprima)"]
		]);
	};
	tests["test unary expr3"] = function() {
		var results = computeContentAssist(
			"var x = '';\n(x += 1).char", "char");
		testProposals("char", results, [
			["charAt(index)", "charAt(index) : String (esprima)"],
			["charCodeAt(index)", "charCodeAt(index) : Number (esprima)"]
		]);
	};
	tests["test unary expr4"] = function() {
		var results = computeContentAssist(
			"var aaa = function() { return !hucairz; }\naa", "aa");
		testProposals("aa", results, [
			["aaa()", "aaa() : Boolean (esprima)"]
		]);
	};


	
	/*
	 yet to do:
	 1. with, function inside obj literal
	 2. parameterized arrays
	*/
	return tests;
});
