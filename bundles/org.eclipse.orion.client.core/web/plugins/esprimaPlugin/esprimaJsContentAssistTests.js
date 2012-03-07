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
	
	function computeContentAssist(contents, prefix, offset) {
		if (!prefix) {
			prefix = "";
		}
		if (!offset) {
			offset = contents.indexOf("/**/");
			if (offset < 0) {
				offset = contents.length;
			}
		}		
		return esprimaContentAssistant.computeProposals(prefix, contents, {offset: offset});
	}
	
	function testProposal(proposal, text, description) {
		assert.equal(proposal.proposal, text, "Invalid proposal text");
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
	
	function testProposals(actualProposals, expectedProposals) {
//		console.log("Proposals:");
//		console.log(actualProposals);
		
		assert.equal(actualProposals.length, expectedProposals.length, 
			"Wrong number of proposals.  Expected:\n" + stringifyExpected(expectedProposals) +"\nActual:\n" + stringifyActual(actualProposals));
			
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
		testProposals(results, [
			["JSON", "JSON : JSON (esprima)"],
			["Math", "Math : Math (esprima)"],
			["hasOwnProperty(property)", "hasOwnProperty(property) : boolean (esprima)"],
			["isPrototypeOf(object)", "isPrototypeOf(object) : boolean (esprima)"],
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
		testProposals(results, [
			["JSON", "JSON : JSON (esprima)"],
			["Math", "Math : Math (esprima)"],
			["hasOwnProperty(property)", "hasOwnProperty(property) : boolean (esprima)"],
			["isPrototypeOf(object)", "isPrototypeOf(object) : boolean (esprima)"],
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
		testProposals(results, [
			["JSON", "JSON : JSON (esprima)"],
			["Math", "Math : Math (esprima)"],
			["hasOwnProperty(property)", "hasOwnProperty(property) : boolean (esprima)"],
			["isPrototypeOf(object)", "isPrototypeOf(object) : boolean (esprima)"],
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
		testProposals(results, [
			["JSON", "JSON : JSON (esprima)"],
			["Math", "Math : Math (esprima)"],
			["hasOwnProperty(property)", "hasOwnProperty(property) : boolean (esprima)"],
			["isPrototypeOf(object)", "isPrototypeOf(object) : boolean (esprima)"],
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
		testProposals(results, [
			["zxxx", "zxxx : Object (esprima)"],
			["zzz", "zzz : Object (esprima)"]
		]);
	};
	tests["test single function content assist"] = function() {
		var results = computeContentAssist("function fun(a, b, c) {}\n");
		testProposals(results, [
			["JSON", "JSON : JSON (esprima)"],
			["Math", "Math : Math (esprima)"],
			["fun(a, b, c)", "fun(a, b, c) : Object (esprima)"],
			["hasOwnProperty(property)", "hasOwnProperty(property) : boolean (esprima)"],
			["isPrototypeOf(object)", "isPrototypeOf(object) : boolean (esprima)"],
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
		testProposals(results, [
			["JSON", "JSON : JSON (esprima)"],
			["Math", "Math : Math (esprima)"],
			["fun(a, b, c)", "fun(a, b, c) : Object (esprima)"],
			["hasOwnProperty(property)", "hasOwnProperty(property) : boolean (esprima)"],
			["isPrototypeOf(object)", "isPrototypeOf(object) : boolean (esprima)"],
			["other(a, b, c)", "other(a, b, c) : Object (esprima)"],
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
		testProposals(results, [
			["foo", "foo : Object (esprima)"]
		]);
	};
	tests["test scopes 2"] = function() {
		// the inner assignment should not affect the value of foo
		var results = computeContentAssist("var foo;\n" +
				"var foo = 1;\nfunction other(a, b, c) {\nfunction inner() { foo2 = \"\"; }\nfoo.toF/**/}", "toF");
		testProposals(results, [
			["toFixed(digits)", "toFixed(digits) : Number (esprima)"]
		]);
	};
	tests["test multi function content assist 2"] = function() {
		var results = computeContentAssist("function fun(a, b, c) {}\nfunction other(a, b, c) {}\nf", "f");
		testProposals(results, [
			["fun(a, b, c)", "fun(a, b, c) : Object (esprima)"]
		]);
	};
	tests["test in function 1"] = function() {
		var results = computeContentAssist("function fun(a, b, c) {}\nfunction other(a, b, c) {/**/}", "");
		testProposals(results, [
			["JSON", "JSON : JSON (esprima)"],
			["Math", "Math : Math (esprima)"],
			["a", "a : Object (esprima)"],
			["arguments", "arguments : Arguments (esprima)"],
			["b", "b : Object (esprima)"],
			["c", "c : Object (esprima)"],
			["fun(a, b, c)", "fun(a, b, c) : Object (esprima)"],
			["hasOwnProperty(property)", "hasOwnProperty(property) : boolean (esprima)"],
			["isPrototypeOf(object)", "isPrototypeOf(object) : boolean (esprima)"],
			["other(a, b, c)", "other(a, b, c) : Object (esprima)"],
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
		testProposals(results, [
			["JSON", "JSON : JSON (esprima)"],
			["Math", "Math : Math (esprima)"],
			["a", "a : Object (esprima)"],
			["arguments", "arguments : Arguments (esprima)"],
			["b", "b : Object (esprima)"],
			["c", "c : Object (esprima)"],
			["fun(a, b, c)", "fun(a, b, c) : Object (esprima)"],
			["hasOwnProperty(property)", "hasOwnProperty(property) : boolean (esprima)"],
			["isPrototypeOf(object)", "isPrototypeOf(object) : boolean (esprima)"],
			["other(a, b, c)", "other(a, b, c) : Object (esprima)"],
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
		testProposals(results, [
			["fun(a, b, c)", "fun(a, b, c) : Object (esprima)"]
		]);
	};
	tests["test in function 4"] = function() {
		var results = computeContentAssist("function fun(a, b, c) {}\nfunction other(aa, ab, c) {a/**/}", "a");
		testProposals(results, [
			["aa", "aa : Object (esprima)"],
			["ab", "ab : Object (esprima)"],
			["arguments", "arguments : Arguments (esprima)"]
		]);
	};
	tests["test in function 5"] = function() {
		// should not see 'aaa' since that is declared later
		var results = computeContentAssist("function fun(a, b, c) {}\nfunction other(aa, ab, c) {var abb;\na/**/\nvar aaa}", "a");
		testProposals(results, [
			["aa", "aa : Object (esprima)"],
			["ab", "ab : Object (esprima)"],
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
		testProposals(results, [
			["a", "a : Object (esprima)"],
			["aa", "aa : Object (esprima)"],
			["ab", "ab : Object (esprima)"],
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
		testProposals(results, [
			["JSON", "JSON : JSON (esprima)"],
			["Math", "Math : Math (esprima)"],
			["a", "a : Object (esprima)"],
			["arguments", "arguments : Arguments (esprima)"],
			["b", "b : Object (esprima)"],
			["c", "c : Object (esprima)"],
			["fun(a, b, c)", "fun(a, b, c) : Object (esprima)"],
			["hasOwnProperty(property)", "hasOwnProperty(property) : boolean (esprima)"],
			["isPrototypeOf(object)", "isPrototypeOf(object) : boolean (esprima)"],
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
		testProposals(results, [
			["JSON", "JSON : JSON (esprima)"],
			["Math", "Math : Math (esprima)"],
			["a", "a : Object (esprima)"],
			["arguments", "arguments : Arguments (esprima)"],
			["b", "b : Object (esprima)"],
			["c", "c : Object (esprima)"],
			["fun(a, b, c)", "fun(a, b, c) : Object (esprima)"],
			["hasOwnProperty(property)", "hasOwnProperty(property) : boolean (esprima)"],
			["isPrototypeOf(object)", "isPrototypeOf(object) : boolean (esprima)"],
			["other(aa, ab, ac)", "other(aa, ab, ac) : Object (esprima)"],
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
		testProposals(results, [
			["hasOwnProperty(property)", "hasOwnProperty(property) : boolean (esprima)"]
		]);
	};
	tests["test Object Literal inferencing"] = function() {
		var results = computeContentAssist("var t = { hhh : 1, hh2 : 8}\nt.h", "h");
		testProposals(results, [
			["hasOwnProperty(property)", "hasOwnProperty(property) : boolean (esprima)"],
			["hh2", "hh2 : Number (esprima)"],
			["hhh", "hhh : Number (esprima)"]
		]);
	};
	tests["test Simple String inferencing"] = function() {
		var results = computeContentAssist("''.char", "char");
		testProposals(results, [
			["charAt(index)", "charAt(index) : String (esprima)"],
			["charCodeAt(index)", "charCodeAt(index) : Number (esprima)"]
		]);
	};
	tests["test Simple Date inferencing"] = function() {
		var results = computeContentAssist("new Date().setD", "setD");
		testProposals(results, [
			["setDay(dayOfWeek)", "setDay(dayOfWeek) : Number (esprima)"]
		]);
	};
	tests["test Number inferencing with Variable"] = function() {
		var results = computeContentAssist("var t = 1\nt.to", "to");
		testProposals(results, [
			["toExponential(digits)", "toExponential(digits) : Number (esprima)"],
			["toFixed(digits)", "toFixed(digits) : Number (esprima)"],
			["toLocaleString()", "toLocaleString() : String (esprima)"],
			["toPrecision(digits)", "toPrecision(digits) : Number (esprima)"],
			["toString()", "toString() : String (esprima)"]
		]);
	};
	
	tests["test Data flow Object Literal inferencing"] = function() {
		var results = computeContentAssist("var s = { hhh : 1, hh2 : 8}\nvar t = s;\nt.h", "h");
		testProposals(results, [
			["hasOwnProperty(property)", "hasOwnProperty(property) : boolean (esprima)"],
			["hh2", "hh2 : Number (esprima)"],
			["hhh", "hhh : Number (esprima)"]
		]);
	};
	tests["test Data flow inferencing 1"] = function() {
		var results = computeContentAssist("var ttt = 9\nttt.toF", "toF");
		testProposals(results, [
			["toFixed(digits)", "toFixed(digits) : Number (esprima)"]
		]);
	};
	tests["test Data flow inferencing 2"] = function() {
		var results = computeContentAssist("ttt = 9\nttt.toF", "toF");
		testProposals(results, [
			["toFixed(digits)", "toFixed(digits) : Number (esprima)"]
		]);
	};
	tests["test Data flow inferencing 3"] = function() {
		var results = computeContentAssist("var ttt = \"\"\nttt = 9\nttt.toF", "toF");
		testProposals(results, [
			["toFixed(digits)", "toFixed(digits) : Number (esprima)"]
		]);
	};
	tests["test Data flow inferencing 4"] = function() {
		var results = computeContentAssist("var name = toString(property.key.value);\nname.co", "co");
		testProposals(results, [
			["concat(array)", "concat(array) : String (esprima)"]
		]);
	};
	
	tests["test Simple this"] = function() {
		var results = computeContentAssist("var ssss = 4;\nthis.ss", "ss");
		testProposals(results, [
			["ssss", "ssss : Number (esprima)"]
		]);
	};
	
	tests["test Object Literal inside"] = function() {
		var results = computeContentAssist("var x = { the : 1, far : this.th/**/ };", "th");
		testProposals(results, [
			// type is 'Object' here, not number, since inside the object literal, we don't 
			// know the types of literal fields
			["the", "the : Object (esprima)"]
		]);
	};
	tests["test Object Literal outside"] = function() {
		var results = computeContentAssist("var x = { the : 1, far : 2 };\nx.th", "th");
		testProposals(results, [
			["the", "the : Number (esprima)"]
		]);
	};
	tests["test Object Literal none"] = function() {
		var results = computeContentAssist("var x = { the : 1, far : 2 };\nthis.th", "th");
		testProposals(results, [
		]);
	};
	tests["test Object Literal outside 2"] = function() {
		var results = computeContentAssist("var x = { the : 1, far : 2 };\nvar who = x.th", "th");
		testProposals(results, [
			["the", "the : Number (esprima)"]
		]);
	};
	tests["test Object Literal outside 3"] = function() {
		var results = computeContentAssist("var x = { the : 1, far : 2 };\nwho(x.th/**/)", "th");
		testProposals(results, [
			["the", "the : Number (esprima)"]
		]);
	};
	tests["test Object Literal outside 4"] = function() {
		var results = computeContentAssist("var x = { the : 1, far : 2 };\nwho(yyy, x.th/**/)", "th");
		testProposals(results, [
			["the", "the : Number (esprima)"]
		]);
	};
	tests["test this reference 1"] = function() {
		var results = computeContentAssist("var xxxx;\nthis.x", "x");
		testProposals(results, [
			["xxxx", "xxxx : Object (esprima)"]
		]);
	};
	tests["test binary expression 1"] = function() {
		var results = computeContentAssist("(1+3).toF", "toF");
		testProposals(results, [
			["toFixed(digits)", "toFixed(digits) : Number (esprima)"]
		]);
	};
	
	// not working since for loop is not storing slocs of var ii
	tests["test for loop 1"] = function() {
		var results = computeContentAssist("for (var ii=0;i/**/<8;ii++) { ii }", "i");
		testProposals(results, [
			["ii", "ii : Number (esprima)"],
			["isPrototypeOf(object)", "isPrototypeOf(object) : boolean (esprima)"]
		]);
	};
	tests["test for loop 2"] = function() {
		var results = computeContentAssist("for (var ii=0;ii<8;i/**/++) { ii }", "i");
		testProposals(results, [
			["ii", "ii : Number (esprima)"],
			["isPrototypeOf(object)", "isPrototypeOf(object) : boolean (esprima)"]
		]);
	};
	tests["test for loop 3"] = function() {
		var results = computeContentAssist("for (var ii=0;ii<8;ii++) { i/**/ }", "i");
		testProposals(results, [
			["ii", "ii : Number (esprima)"],
			["isPrototypeOf(object)", "isPrototypeOf(object) : boolean (esprima)"]
		]);
	};
	tests["test while loop 1"] = function() {
		var results = computeContentAssist("var iii;\nwhile(ii/**/ === null) {\n}", "ii");
		testProposals(results, [
			["iii", "iii : Object (esprima)"]
		]);
	};
	tests["test while loop 2"] = function() {
		var results = computeContentAssist("var iii;\nwhile(this.ii/**/ === null) {\n}", "ii");
		testProposals(results, [
			["iii", "iii : Object (esprima)"]
		]);
	};
	tests["test while loop 3"] = function() {
		var results = computeContentAssist("var iii;\nwhile(iii === null) {this.ii/**/\n}", "ii");
		testProposals(results, [
			["iii", "iii : Object (esprima)"]
		]);
	};
	tests["test catch clause 1"] = function() {
		var results = computeContentAssist("try { } catch (eee) {e/**/  }", "e");
		testProposals(results, [
			["eee", "eee : Error (esprima)"]
		]);
	};
	tests["test catch clause 2"] = function() {
		// the type of the catch variable is Error
		var results = computeContentAssist("try { } catch (eee) {\neee.me/**/  }", "me");
		testProposals(results, [
			["message", "message : String (esprima)"]
		]);
	};
	
	
	tests["test get global var"] = function() {
		// should infer that we are referring to the globally defined xxx, not the param
		var results = computeContentAssist("var xxx = 9;\nfunction fff(xxx) { this.xxx.toF/**/}", "toF");
		testProposals(results, [
			["toFixed(digits)", "toFixed(digits) : Number (esprima)"]
		]);
	};
	
	tests["test get local var"] = function() {
		// should infer that we are referring to the locally defined xxx, not the global
		var results = computeContentAssist("var xxx = 9;\nfunction fff(xxx) { xxx.toF/**/}", "toF");
		testProposals(results, [
		]);
	};

	tests["test Math 1"] = function() {
		var results = computeContentAssist("Mat", "Mat");
		testProposals(results, [
			["Math", "Math : Math (esprima)"]
		]);
	};
	tests["test Math 2"] = function() {
		var results = computeContentAssist("this.Mat", "Mat");
		testProposals(results, [
			["Math", "Math : Math (esprima)"]
		]);
	};
	tests["test Math 3"] = function() {
		// Math not available when this isn't the global this
		var results = computeContentAssist("var ff = { f: this.Mat/**/ }", "Mat");
		testProposals(results, [
		]);
	};
	tests["test Math 4"] = function() {
		var results = computeContentAssist("this.Math.E", "E");
		testProposals(results, [
			["E", "E : Number (esprima)"]
		]);
	};
	tests["test JSON 4"] = function() {
		var results = computeContentAssist("this.JSON.st", "st");
		testProposals(results, [
			["stringify(obj)", "stringify(obj) : String (esprima)"]
		]);
	};
	tests["test multi-dot inferencing 1"] = function() {
		var results = computeContentAssist("var a = \"\";\na.charAt().charAt().charAt().ch", "ch");
		testProposals(results, [
			["charAt(index)", "charAt(index) : String (esprima)"],
			["charCodeAt(index)", "charCodeAt(index) : Number (esprima)"]
		]);
	};
	tests["test multi-dot inferencing 2"] = function() {
		var results = computeContentAssist(
		"var zz = {};\nzz.zz = zz;\nzz.zz.zz.z", "z");
		testProposals(results, [
			["zz", "zz : { zz } (esprima)"]
		]);
	};
	tests["test multi-dot inferencing 3"] = function() {
		var results = computeContentAssist(
		"var x = { yy : { } };\nx.yy.zz = 1;\nx.yy.z", "z");
		testProposals(results, [
			["zz", "zz : Number (esprima)"]
		]);
	};
	tests["test multi-dot inferencing 4"] = function() {
		var results = computeContentAssist(
		"var x = { yy : { } };\nx.yy.zz = 1;\nx.yy.zz.toF", "toF");
		testProposals(results, [
			["toFixed(digits)", "toFixed(digits) : Number (esprima)"]
		]);
	};
	tests["test constructor 1"] = function() {
		var results = computeContentAssist(
		"function Fun() {\n	this.xxx = 9;\n	this.uuu = this.x/**/;}", "x");
		testProposals(results, [
			["xxx", "xxx : Number (esprima)"]
		]);
	};
	tests["test constructor 2"] = function() {
		var results = computeContentAssist(
		"function Fun() {	this.xxx = 9;	this.uuu = this.xxx; }\n" +
		"var y = new Fun();\n" +	
		"y.x", "x");
		testProposals(results, [
			["xxx", "xxx : Number (esprima)"]
		]);
	};
	tests["test constructor 3"] = function() {
		var results = computeContentAssist(
		"function Fun() {	this.xxx = 9;	this.uuu = this.xxx; }\n" +
		"var y = new Fun();\n" +
		"y.xxx.toF", "toF");
		testProposals(results, [
			["toFixed(digits)", "toFixed(digits) : Number (esprima)"]
		]);
	};
	tests["test constructor 3"] = function() {
		var results = computeContentAssist(
		"function Fun() {	this.xxx = 9;	this.uuu = this.xxx; }\n" +
		"var y = new Fun();\n" +
		"y.uuu.toF", "toF");
		testProposals(results, [
			["toFixed(digits)", "toFixed(digits) : Number (esprima)"]
		]);
	};
	
	tests["test constructor 4"] = function() {
		var results = computeContentAssist(
		"var Fun = function () {	this.xxx = 9;	this.uuu = this.xxx; }\n" +
		"var y = new Fun();\n" +
		"y.uuu.toF", "toF");
		testProposals(results, [
			["toFixed(digits)", "toFixed(digits) : Number (esprima)"]
		]);
	};
	
	tests["test Function args 1"] = function() {
		var results = computeContentAssist(
		"var ttt, uuu;\nttt(/**/)");
		testProposals(results, [
			["JSON", "JSON : JSON (esprima)"],
			["Math", "Math : Math (esprima)"],
			["hasOwnProperty(property)", "hasOwnProperty(property) : boolean (esprima)"],
			["isPrototypeOf(object)", "isPrototypeOf(object) : boolean (esprima)"],
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
		testProposals(results, [
			["JSON", "JSON : JSON (esprima)"],
			["Math", "Math : Math (esprima)"],
			["hasOwnProperty(property)", "hasOwnProperty(property) : boolean (esprima)"],
			["isPrototypeOf(object)", "isPrototypeOf(object) : boolean (esprima)"],
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
		testProposals(results, [
			["JSON", "JSON : JSON (esprima)"],
			["Math", "Math : Math (esprima)"],
			["hasOwnProperty(property)", "hasOwnProperty(property) : boolean (esprima)"],
			["isPrototypeOf(object)", "isPrototypeOf(object) : boolean (esprima)"],
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
		testProposals(results, [
			["toFixed(digits)", "toFixed(digits) : Number (esprima)"]
		]);
	};
	
	
	tests["test nested object expressions 1"] = function() {
		var results = computeContentAssist(
		"var ttt = { xxx : { yyy : { zzz : 1} } };\n" +
		"ttt.xxx.y", "y");
		testProposals(results, [
			["yyy", "yyy : { zzz } (esprima)"]
		]);
	};
	tests["test nested object expressions 2"] = function() {
		var results = computeContentAssist(
		"var ttt = { xxx : { yyy : { zzz : 1} } };\n" +
		"ttt.xxx.yyy.z", "z");
		testProposals(results, [
			["zzz", "zzz : Number (esprima)"]
		]);
	};
	tests["test nested object expressions 3"] = function() {
		var results = computeContentAssist(
		"var ttt = { xxx : { yyy : { zzz : 1} } };\n" +
		"ttt.xxx.yyy.zzz.toF", "toF");
		testProposals(results, [
			["toFixed(digits)", "toFixed(digits) : Number (esprima)"]
		]);
	};
	
	tests["test function expression 1"] = function() {
		var results = computeContentAssist(
		"var ttt = function(a, b, c) { };\ntt", "tt");
		testProposals(results, [
			["ttt(a, b, c)", "ttt(a, b, c) : Object (esprima)"]
		]);
	};
	tests["test function expression 2"] = function() {
		var results = computeContentAssist(
		"ttt = function(a, b, c) { };\ntt", "tt");
		testProposals(results, [
			["ttt(a, b, c)", "ttt(a, b, c) : Object (esprima)"]
		]);
	};
	tests["test function expression 3"] = function() {
		var results = computeContentAssist(
		"ttt = { rrr : function(a, b, c) { } };\nttt.rr", "rr");
		testProposals(results, [
			["rrr(a, b, c)", "rrr(a, b, c) : Object (esprima)"]
		]);
	};
	tests["test function expression 4"] = function() {
		var results = computeContentAssist(
		"var ttt = function(a, b) { };\nvar hhh = ttt;\nhhh", "hhh");
		testProposals(results, [
			["hhh(a, b)", "hhh(a, b) : Object (esprima)"]
		]);
	};
	tests["test function expression 4a"] = function() {
		var results = computeContentAssist(
		"function ttt(a, b) { };\nvar hhh = ttt;\nhhh", "hhh");
		testProposals(results, [
			["hhh(a, b)", "hhh(a, b) : Object (esprima)"]
		]);
	};
	tests["test function expression 5"] = function() {
		var results = computeContentAssist(
		"var uuu = {	flart : function (a,b) { } };\nhhh = uuu.flart;\nhhh", "hhh");
		testProposals(results, [
			["hhh(a, b)", "hhh(a, b) : Object (esprima)"]
		]);
	};
	tests["test function expression 6"] = function() {
		var results = computeContentAssist(
		"var uuu = {	flart : function (a,b) { } };\nhhh = uuu.flart;\nhhh.app", "app");
		testProposals(results, [
			["apply(func, [args])", "apply(func, [args]) : Object (esprima)"]
		]);
	};
	
	tests["test globals 1"] = function() {
		var results = computeContentAssist("/*global faaa */\nfa", "fa");
		testProposals(results, [
			["faaa", "faaa : Object (esprima)"]
		]);
	};
	tests["test globals 2"] = function() {
		var results = computeContentAssist("/*global  \t\n faaa \t\t\n faaa2  */\nfa", "fa");
		testProposals(results, [
			["faaa", "faaa : Object (esprima)"],
			["faaa2", "faaa2 : Object (esprima)"]
		]);
	};
	tests["test globals 3"] = function() {
		var results = computeContentAssist("/*global  \t\n faaa \t\t\n fass2  */\nvar t = 1;\nt.fa", "fa");
		testProposals(results, [
		]);
	};
	
	////////////////////////////
	// tests for complex names
	////////////////////////////
	tests["test complexx name 1"] = function() {
		var results = computeContentAssist("function Ttt() { }\nvar ttt = new Ttt();\ntt", "tt");
		testProposals(results, [
			["ttt", "ttt : Ttt (esprima)"]
		]);
	};
	tests["test complexx name 2"] = function() {
		var results = computeContentAssist("var Ttt = function() { };\nvar ttt = new Ttt();\ntt", "tt");
		testProposals(results, [
			["ttt", "ttt : Ttt (esprima)"]
		]);
	};
	tests["test complexx name 3"] = function() {
		var results = computeContentAssist("var ttt = { };\ntt", "tt");
		testProposals(results, [
			["ttt", "ttt : { } (esprima)"]
		]);
	};
	tests["test complexx name 4"] = function() {
		var results = computeContentAssist("var ttt = { aa: 1, bb: 2 };\ntt", "tt");
		testProposals(results, [
			["ttt", "ttt : { aa bb } (esprima)"]
		]);
	};
	tests["test complexx name 5"] = function() {
		var results = computeContentAssist("var ttt = { aa: 1, bb: 2 };\nttt.cc = 9;\ntt", "tt");
		testProposals(results, [
			["ttt", "ttt : { aa bb cc } (esprima)"]
		]);
	};
	
	////////////////////////////
	// tests for broken syntax
	////////////////////////////

	tests["test broken after dot 1"] = function() {
		var results = computeContentAssist("var ttt = { ooo:8};\nttt.", "");
		testProposals(results, [
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
		testProposals(results, [
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
		testProposals(results, [
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
		testProposals(results, [
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
		testProposals(results, [
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
		testProposals(results, [
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

		testProposals(results, [
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

		testProposals(results, [
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
	
	/*
	 yet to do:
	 1. with, function inside obj literal
	 *  nested object literal suppport, correct typing of object literal keys
	 *  function argument types
	 3. function/method return types vs functions themselves
	 4. inferring the return type of a function
	 5. parameterized types (eg- array of string, function that returns number)
	 *  function expressions
	*/
	return tests;
});
