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
define(["./esprimaJsContentAssist", "orion/assert"], function(mEsprimaPlugin, assert) {
	
	//////////////////////////////////////////////////////////
	// helpers
	//////////////////////////////////////////////////////////
	var esprimaContentAssistant = new mEsprimaPlugin.EsprimaJavaScriptContentAssistProvider();
	
	function computeContentAssistAtEnd(contents, prefix) {
		if (!prefix) {
			prefix = "";
		}
		var offset = contents.indexOf("/**/");
		if (offset < 0) {
			offset = contents.length;
		}
		
		return esprimaContentAssistant.computeProposals(prefix, contents, {start: offset});
	}
	
	function testProposal(proposal, text, description) {
		assert.equal(proposal.proposal, text, "Invalid proposal text");
		if (description) {
			assert.equal(proposal.description, description, "Invalid proposal description");
		}
	}
	
	function testProposals(actualProposals, expectedProposals) {
//		console.log("Proposals:");
//		console.log(actualProposals);
		
		assert.equal(actualProposals.length, expectedProposals.length, 
			"Wrong number of proposals.  Expected:\n" + JSON.stringify(expectedProposals) +"\nActual:\n" + JSON.stringify(actualProposals));
			
		for (var i = 0; i < actualProposals.length; i++) {
			testProposal(actualProposals[i], expectedProposals[i][0], expectedProposals[i][1]);
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
		assert.equal(stringify(parsedProgram),"{type:ExpressionStatement,expression:{type:MemberExpression,object:{type:Identifier,name:foo}}}");
	};

	tests["test Content Assist Setup"] = function() {
		assert.ok(esprimaContentAssistant, "Found Esprima content assistant");
		assert.ok(esprimaContentAssistant.computeProposals, "Found proposal computer");
	};
	
	tests["test Empty Content Assist"] = function() {
		var results = computeContentAssistAtEnd("x", "x");
		assert.equal(results.length, 0);
	};
	
	// non-inferencing content assist
	tests["test Empty File Content Assist"] = function() {
		var results = computeContentAssistAtEnd("");
		testProposals(results, [
			["JSON", "JSON (property)"],
			["Math", "Math (property)"],
			["hasOwnProperty(property)", "hasOwnProperty(property) (function)"],
			["isPrototypeOf(object)", "isPrototypeOf(object) (function)"],
			["propertyIsEnumerable(property)", "propertyIsEnumerable(property) (function)"],
			["this", "this (property)"],
			["toLocaleString()", "toLocaleString() (function)"],
			["toString()", "toString() (function)"],
			["valueOf()", "valueOf() (function)"]
		]);
	};
	tests["test Single Var Content Assist"] = function() {
		var results = computeContentAssistAtEnd("var zzz = 9;\n");
		testProposals(results, [
			["JSON", "JSON (property)"],
			["Math", "Math (property)"],
			["hasOwnProperty(property)", "hasOwnProperty(property) (function)"],
			["isPrototypeOf(object)", "isPrototypeOf(object) (function)"],
			["propertyIsEnumerable(property)", "propertyIsEnumerable(property) (function)"],
			["this", "this (property)"],
			["toLocaleString()", "toLocaleString() (function)"],
			["toString()", "toString() (function)"],
			["valueOf()", "valueOf() (function)"],
			["zzz", "zzz (property)"]
		]);
	};
	tests["test Single Var Content Assist 2"] = function() {
		var results = computeContentAssistAtEnd("var zzz;\n");
		testProposals(results, [
			["JSON", "JSON (property)"],
			["Math", "Math (property)"],
			["hasOwnProperty(property)", "hasOwnProperty(property) (function)"],
			["isPrototypeOf(object)", "isPrototypeOf(object) (function)"],
			["propertyIsEnumerable(property)", "propertyIsEnumerable(property) (function)"],
			["this", "this (property)"],
			["toLocaleString()", "toLocaleString() (function)"],
			["toString()", "toString() (function)"],
			["valueOf()", "valueOf() (function)"],
			["zzz", "zzz (property)"]
		]);
	};
	tests["test multi var content assist 1"] = function() {
		var results = computeContentAssistAtEnd("var zzz;\nvar xxx, yyy;\n");
		testProposals(results, [
			["JSON", "JSON (property)"],
			["Math", "Math (property)"],
			["hasOwnProperty(property)", "hasOwnProperty(property) (function)"],
			["isPrototypeOf(object)", "isPrototypeOf(object) (function)"],
			["propertyIsEnumerable(property)", "propertyIsEnumerable(property) (function)"],
			["this", "this (property)"],
			["toLocaleString()", "toLocaleString() (function)"],
			["toString()", "toString() (function)"],
			["valueOf()", "valueOf() (function)"],
			["xxx", "xxx (property)"],
			["yyy", "yyy (property)"],
			["zzz", "zzz (property)"]
		]);
	};
	tests["test multi var content assist 2"] = function() {
		var results = computeContentAssistAtEnd("var zzz;\nvar zxxx, xxx, yyy;\nz","z");
		testProposals(results, [
			["zxxx", "zxxx (property)"],
			["zzz", "zzz (property)"]
		]);
	};
	tests["test single function content assist"] = function() {
		var results = computeContentAssistAtEnd("function fun(a, b, c) {}\n");
		testProposals(results, [
			["JSON", "JSON (property)"],
			["Math", "Math (property)"],
			["fun(a, b, c)", "fun(a, b, c) (function)"],
			["hasOwnProperty(property)", "hasOwnProperty(property) (function)"],
			["isPrototypeOf(object)", "isPrototypeOf(object) (function)"],
			["propertyIsEnumerable(property)", "propertyIsEnumerable(property) (function)"],
			["this", "this (property)"],
			["toLocaleString()", "toLocaleString() (function)"],
			["toString()", "toString() (function)"],
			["valueOf()", "valueOf() (function)"]
		]);
	};
	tests["test multi function content assist 1"] = function() {
		var results = computeContentAssistAtEnd("function fun(a, b, c) {}\nfunction other(a, b, c) {}\n");
		testProposals(results, [
			["JSON", "JSON (property)"],
			["Math", "Math (property)"],
			["fun(a, b, c)", "fun(a, b, c) (function)"],
			["hasOwnProperty(property)", "hasOwnProperty(property) (function)"],
			["isPrototypeOf(object)", "isPrototypeOf(object) (function)"],
			["other(a, b, c)", "other(a, b, c) (function)"],
			["propertyIsEnumerable(property)", "propertyIsEnumerable(property) (function)"],
			["this", "this (property)"],
			["toLocaleString()", "toLocaleString() (function)"],
			["toString()", "toString() (function)"],
			["valueOf()", "valueOf() (function)"]
		]);
	};
	tests["test scopes 1"] = function() {
		// only the outer foo is available
		var results = computeContentAssistAtEnd(
				"var foo;\nfunction other(a, b, c) {\nfunction inner() { var foo2; }\nf/**/}", "f");
		testProposals(results, [
			["foo", "foo (property)"]
		]);
	};
	tests["test scopes 2"] = function() {
		// the inner assignment should not affect the value of foo
		var results = computeContentAssistAtEnd("var foo;\n" +
				"var foo = 1;\nfunction other(a, b, c) {\nfunction inner() { foo2 = \"\"; }\nfoo.toF/**/}", "toF");
		testProposals(results, [
			["toFixed(digits)", "toFixed(digits) (function)"]
		]);
	};
	tests["test multi function content assist 2"] = function() {
		var results = computeContentAssistAtEnd("function fun(a, b, c) {}\nfunction other(a, b, c) {}\nf", "f");
		testProposals(results, [
			["fun(a, b, c)", "fun(a, b, c) (function)"]
		]);
	};
	tests["test in function 1"] = function() {
		var results = computeContentAssistAtEnd("function fun(a, b, c) {}\nfunction other(a, b, c) {/**/}", "");
		testProposals(results, [
			["JSON", "JSON (property)"],
			["Math", "Math (property)"],
			["a", "a (property)"],
			["arguments", "arguments (property)"],
			["b", "b (property)"],
			["c", "c (property)"],
			["fun(a, b, c)", "fun(a, b, c) (function)"],
			["hasOwnProperty(property)", "hasOwnProperty(property) (function)"],
			["isPrototypeOf(object)", "isPrototypeOf(object) (function)"],
			["other(a, b, c)", "other(a, b, c) (function)"],
			["propertyIsEnumerable(property)", "propertyIsEnumerable(property) (function)"],
			["this", "this (property)"],
			["toLocaleString()", "toLocaleString() (function)"],
			["toString()", "toString() (function)"],
			["valueOf()", "valueOf() (function)"]
		]);
	};
	tests["test in function 2"] = function() {
		var results = computeContentAssistAtEnd("function fun(a, b, c) {}\nfunction other(a, b, c) {\n/**/nuthin}", "");
		testProposals(results, [
			["JSON", "JSON (property)"],
			["Math", "Math (property)"],
			["a", "a (property)"],
			["arguments", "arguments (property)"],
			["b", "b (property)"],
			["c", "c (property)"],
			["fun(a, b, c)", "fun(a, b, c) (function)"],
			["hasOwnProperty(property)", "hasOwnProperty(property) (function)"],
			["isPrototypeOf(object)", "isPrototypeOf(object) (function)"],
			["other(a, b, c)", "other(a, b, c) (function)"],
			["propertyIsEnumerable(property)", "propertyIsEnumerable(property) (function)"],
			["this", "this (property)"],
			["toLocaleString()", "toLocaleString() (function)"],
			["toString()", "toString() (function)"],
			["valueOf()", "valueOf() (function)"]
		]);
	};
	tests["test in function 3"] = function() {
		var results = computeContentAssistAtEnd("function fun(a, b, c) {}\nfunction other(a, b, c) {f/**/}", "f");
		testProposals(results, [
			["fun(a, b, c)", "fun(a, b, c) (function)"]
		]);
	};
	tests["test in function 4"] = function() {
		var results = computeContentAssistAtEnd("function fun(a, b, c) {}\nfunction other(aa, ab, c) {a/**/}", "a");
		testProposals(results, [
			["aa", "aa (property)"],
			["ab", "ab (property)"],
			["arguments", "arguments (property)"]
		]);
	};
	tests["test in function 5"] = function() {
		// should not see 'aaa' since that is declared later
		var results = computeContentAssistAtEnd("function fun(a, b, c) {}\nfunction other(aa, ab, c) {var abb;\na/**/\nvar aaa}", "a");
		testProposals(results, [
			["aa", "aa (property)"],
			["ab", "ab (property)"],
			["abb", "abb (property)"],
			["arguments", "arguments (property)"]
		]);
	};
	tests["test in function 6"] = function() {
		// should not see 'aaa' since that is declared later
		var results = computeContentAssistAtEnd(
		"function fun(a, b, c) {\n" +
		"function other(aa, ab, c) {\n"+
		"var abb;\na/**/\nvar aaa\n}\n}", "a");
		testProposals(results, [
			["a", "a (property)"],
			["aa", "aa (property)"],
			["ab", "ab (property)"],
			["abb", "abb (property)"],
			// FIXADE Yikes!  getting arguments twice for nested function
			["arguments", "arguments (property)"],
			["arguments", "arguments (property)"]
		]);
	};
	tests["test in function 7"] = function() {
		// should not see 'aaa' since that is declared later
		var results = computeContentAssistAtEnd(
		"function fun(a, b, c) {/**/\n" +
		"function other(aa, ab, ac) {\n"+
		"var abb;\na\nvar aaa\n}\n}");
		testProposals(results, [
			["JSON", "JSON (property)"],
			["Math", "Math (property)"],
			["a", "a (property)"],
			["arguments", "arguments (property)"],
			["b", "b (property)"],
			["c", "c (property)"],
			["fun(a, b, c)", "fun(a, b, c) (function)"],
			["hasOwnProperty(property)", "hasOwnProperty(property) (function)"],
			["isPrototypeOf(object)", "isPrototypeOf(object) (function)"],
			["propertyIsEnumerable(property)", "propertyIsEnumerable(property) (function)"],
			["this", "this (property)"],
			["toLocaleString()", "toLocaleString() (function)"],
			["toString()", "toString() (function)"],
			["valueOf()", "valueOf() (function)"]
		]);
	};
	tests["test in function 8"] = function() {
		// should not see 'aaa' since that is declared later
		var results = computeContentAssistAtEnd(
		"function fun(a, b, c) {\n" +
		"function other(aa, ab, ac) {\n"+
		"var abb;\na\nvar aaa\n} /**/\n}");
		testProposals(results, [
			["JSON", "JSON (property)"],
			["Math", "Math (property)"],
			["a", "a (property)"],
			["arguments", "arguments (property)"],
			["b", "b (property)"],
			["c", "c (property)"],
			["fun(a, b, c)", "fun(a, b, c) (function)"],
			["hasOwnProperty(property)", "hasOwnProperty(property) (function)"],
			["isPrototypeOf(object)", "isPrototypeOf(object) (function)"],
			["other(aa, ab, ac)", "other(aa, ab, ac) (function)"],
			["propertyIsEnumerable(property)", "propertyIsEnumerable(property) (function)"],
			["this", "this (property)"],
			["toLocaleString()", "toLocaleString() (function)"],
			["toString()", "toString() (function)"],
			["valueOf()", "valueOf() (function)"]
		]);
	};
	
	
	// all inferencing based content assist tests here
	tests["test Object inferencing with Variable"] = function() {
		var results = computeContentAssistAtEnd("var t = {}\nt.h", "h");
		testProposals(results, [
			["hasOwnProperty(property)", "hasOwnProperty(property) (function)"]
		]);
	};
	tests["test Object Literal inferencing"] = function() {
		var results = computeContentAssistAtEnd("var t = { hhh : 1, hh2 : 8}\nt.h", "h");
		testProposals(results, [
			["hasOwnProperty(property)", "hasOwnProperty(property) (function)"],
			["hh2", "hh2 (property)"],
			["hhh", "hhh (property)"]
		]);
	};
	tests["test Simple String inferencing"] = function() {
		var results = computeContentAssistAtEnd("''.char", "char");
		testProposals(results, [
			["charAt(index)", "charAt(index) (function)"],
			["charCodeAt(index)", "charCodeAt(index) (function)"]
		]);
	};
	tests["test Simple Date inferencing"] = function() {
		var results = computeContentAssistAtEnd("new Date().setD", "setD");
		testProposals(results, [
			["setDay(dayOfWeek)", "setDay(dayOfWeek) (function)"]
		]);
	};
	tests["test Number inferencing with Variable"] = function() {
		var results = computeContentAssistAtEnd("var t = 1\nt.to", "to");
		testProposals(results, [
			["toExponential(digits)", "toExponential(digits) (function)"],
			["toFixed(digits)", "toFixed(digits) (function)"],
			["toLocaleString()", "toLocaleString() (function)"],
			["toPrecision(digits)", "toPrecision(digits) (function)"],
			["toString()", "toString() (function)"]
		]);
	};
	
	tests["test Data flow Object Literal inferencing"] = function() {
		var results = computeContentAssistAtEnd("var s = { hhh : 1, hh2 : 8}\nvar t = s;\nt.h", "h");
		testProposals(results, [
			["hasOwnProperty(property)", "hasOwnProperty(property) (function)"],
			["hh2", "hh2 (property)"],
			["hhh", "hhh (property)"]
		]);
	};
	tests["test Data flow inferencing 1"] = function() {
		var results = computeContentAssistAtEnd("var ttt = 9\nttt.toF", "toF");
		testProposals(results, [
			["toFixed(digits)", "toFixed(digits) (function)"]
		]);
	};
	tests["test Data flow inferencing 2"] = function() {
		var results = computeContentAssistAtEnd("ttt = 9\nttt.toF", "toF");
		testProposals(results, [
			["toFixed(digits)", "toFixed(digits) (function)"]
		]);
	};
	tests["test Data flow inferencing 2"] = function() {
		var results = computeContentAssistAtEnd("var ttt = \"\"\nttt = 9\nttt.toF", "toF");
		testProposals(results, [
			["toFixed(digits)", "toFixed(digits) (function)"]
		]);
	};
	
	tests["test Simple this"] = function() {
		var results = computeContentAssistAtEnd("var ssss = 4;\nthis.ss", "ss");
		testProposals(results, [
			["ssss", "ssss (property)"]
		]);
	};
	
	
	tests["test Object Literal inside"] = function() {
		var results = computeContentAssistAtEnd("var x = { the : 1, far : this.th/**/ };", "th");
		testProposals(results, [
			["the", "the (property)"]
		]);
	};
	tests["test Object Literal outside"] = function() {
		var results = computeContentAssistAtEnd("var x = { the : 1, far : 2 };\nx.th", "th");
		testProposals(results, [
			["the", "the (property)"]
		]);
	};
	tests["test Object Literal none"] = function() {
		var results = computeContentAssistAtEnd("var x = { the : 1, far : 2 };\nthis.th", "th");
		testProposals(results, [
		]);
	};
	tests["test Object Literal outside 2"] = function() {
		var results = computeContentAssistAtEnd("var x = { the : 1, far : 2 };\nvar who = x.th", "th");
		testProposals(results, [
			["the", "the (property)"]
		]);
	};
	tests["test Object Literal outside 3"] = function() {
		var results = computeContentAssistAtEnd("var x = { the : 1, far : 2 };\nwho(x.th/**/)", "th");
		testProposals(results, [
			["the", "the (property)"]
		]);
	};
	tests["test Object Literal outside 4"] = function() {
		var results = computeContentAssistAtEnd("var x = { the : 1, far : 2 };\nwho(yyy, x.th/**/)", "th");
		testProposals(results, [
			["the", "the (property)"]
		]);
	};
	tests["test this reference 1"] = function() {
		var results = computeContentAssistAtEnd("var xxxx;\nthis.x", "x");
		testProposals(results, [
			["xxxx", "xxxx (property)"]
		]);
	};
	tests["test binary expression 1"] = function() {
		var results = computeContentAssistAtEnd("(1+3).toF", "toF");
		testProposals(results, [
			["toFixed(digits)", "toFixed(digits) (function)"]
		]);
	};
	
	// not working since for loop is not storing slocs of var ii
	tests["test for loop 1"] = function() {
		var results = computeContentAssistAtEnd("for (var ii=0;i/**/<8;ii++) { ii }", "i");
		testProposals(results, [
			["ii", "ii (property)"],
			["isPrototypeOf(object)", "isPrototypeOf(object) (function)"]
		]);
	};
	tests["test for loop 2"] = function() {
		var results = computeContentAssistAtEnd("for (var ii=0;ii<8;i/**/++) { ii }", "i");
		testProposals(results, [
			["ii", "ii (property)"],
			["isPrototypeOf(object)", "isPrototypeOf(object) (function)"]
		]);
	};
	tests["test for loop 3"] = function() {
		var results = computeContentAssistAtEnd("for (var ii=0;ii<8;ii++) { i/**/ }", "i");
		testProposals(results, [
			["ii", "ii (property)"],
			["isPrototypeOf(object)", "isPrototypeOf(object) (function)"]
		]);
	};
	tests["test while loop 1"] = function() {
		var results = computeContentAssistAtEnd("var iii;\nwhile(ii/**/ === null) {\n}", "ii");
		testProposals(results, [
			["iii", "iii (property)"]
		]);
	};
	tests["test while loop 2"] = function() {
		var results = computeContentAssistAtEnd("var iii;\nwhile(this.ii/**/ === null) {\n}", "ii");
		testProposals(results, [
			["iii", "iii (property)"]
		]);
	};
	tests["test while loop 3"] = function() {
		var results = computeContentAssistAtEnd("var iii;\nwhile(iii === null) {this.ii/**/\n}", "ii");
		testProposals(results, [
			["iii", "iii (property)"]
		]);
	};
	tests["test catch clause 1"] = function() {
		var results = computeContentAssistAtEnd("try { } catch (eee) {e/**/  }", "e");
		testProposals(results, [
			["eee", "eee (property)"]
		]);
	};
	tests["test catch clause 2"] = function() {
		// the type of the catch variable is Error
		var results = computeContentAssistAtEnd("try { } catch (eee) {\neee.me/**/  }", "me");
		testProposals(results, [
			["message", "message (property)"]
		]);
	};
	
	
	tests["test get global var"] = function() {
		// should infer that we are referring to the globally defined xxx, not the param
		var results = computeContentAssistAtEnd("var xxx = 9;\nfunction fff(xxx) { this.xxx.toF/**/}", "toF");
		testProposals(results, [
			["toFixed(digits)", "toFixed(digits) (function)"]
		]);
	};
	
	tests["test get local var"] = function() {
		// should infer that we are referring to the locally defined xxx, not the global
		var results = computeContentAssistAtEnd("var xxx = 9;\nfunction fff(xxx) { xxx.toF/**/}", "toF");
		testProposals(results, [
		]);
	};

	tests["test Math 1"] = function() {
		var results = computeContentAssistAtEnd("Mat", "Mat");
		testProposals(results, [
			["Math", "Math (property)"]
		]);
	};
	tests["test Math 2"] = function() {
		var results = computeContentAssistAtEnd("this.Mat", "Mat");
		testProposals(results, [
			["Math", "Math (property)"]
		]);
	};
	tests["test Math 3"] = function() {
		// Math not available when this isn't the global this
		var results = computeContentAssistAtEnd("var ff = { f: this.Mat }", "Mat");
		testProposals(results, [
		]);
	};
	tests["test Math 4"] = function() {
		var results = computeContentAssistAtEnd("this.Math.E", "E");
		testProposals(results, [
			["E", "E (property)"]
		]);
	};
	tests["test JSON 4"] = function() {
		var results = computeContentAssistAtEnd("this.JSON.st", "st");
		testProposals(results, [
			["stringify(obj)", "stringify(obj) (function)"]
		]);
	};
	
	////////////////////////////
	// tests for broken syntax
	////////////////////////////

	tests["test broken after dot 1"] = function() {
		var results = computeContentAssistAtEnd("var ttt = { ooo:8};\nttt.", "");
		testProposals(results, [
			["hasOwnProperty(property)", "hasOwnProperty(property) (function)"],
			["isPrototypeOf(object)", "isPrototypeOf(object) (function)"],
			["ooo", "ooo (property)"],
			["propertyIsEnumerable(property)", "propertyIsEnumerable(property) (function)"],
//			["prototype", "prototype(property) (property)"],
			["toLocaleString()", "toLocaleString() (function)"],
			["toString()", "toString() (function)"],
			["valueOf()", "valueOf() (function)"]
		]);
	};
	
	// not working
//		tests["test broken after dot 2"] = function() {
//		var results = computeContentAssistAtEnd("var ttt = { ooo:8};\nif (ttt./**/) { ttt }", "");
//		testProposals(results, [
//			["hasOwnProperty(property)", "hasOwnProperty(property) (function)"],
//			["isPrototypeOf(object)", "isPrototypeOf(object) (function)"],
//			["ooo", "ooo (property)"],
//			["propertyIsEnumerable(property)", "propertyIsEnumerable(property) (function)"],
////			["prototype", "prototype(property) (property)"],
//			["toLocaleString()", "toLocaleString() (function)"],
//			["toString()", "toString() (function)"],
//			["valueOf()", "valueOf() (function)"]
//		]);
//	};

	// not working
//	tests["test broken after dot 3"] = function() {
//		var results = computeContentAssistAtEnd("var ttt = { ooo:8};function() { \nttt.}", "");
//		testProposals(results, [
//			["hasOwnProperty(property)", "hasOwnProperty(property) (function)"],
//			["isPrototypeOf(object)", "isPrototypeOf(object) (function)"],
//			["ooo", "ooo (property)"],
//			["propertyIsEnumerable(property)", "propertyIsEnumerable(property) (function)"],
////			["prototype", "prototype(property) (property)"],
//			["toLocaleString()", "toLocaleString() (function)"],
//			["toString()", "toString() (function)"],
//			["valueOf()", "valueOf() (function)"]
//		]);
//	};
	
	
	/*
	 yet to do:
	 1. with, if, for in, this, args in a call, function inside obj literal
	 2. better work on binary expressions
	 3. function/method return types vs functions themselves
	 3a. inferring the return type of a function
	 4, propertyized types (eg- array of string, function that returns number)
	 5. foo.bar = 8
	 6. add new properties after being created
	 7. Regex and math types
	 8. Need some way of distinguishing between top-level and not  Math, JSON, and the other object are only top level
	 9. Don't add proposals throughout, always add potentials to the scope and at the end compute them
	*/
	return tests;
});
