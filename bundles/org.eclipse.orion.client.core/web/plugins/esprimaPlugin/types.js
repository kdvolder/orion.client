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

/*global define */
define("plugins/esprimaPlugin/types", [], function() {

	/**
	 * A prototype that contains the common built-in types
	 * Types that begin with '?' are functions.  The values after the ':' are the 
	 * argument names.
	 */
	var Types = function() {
	
		// From ecma script manual 262 section 15
		// the global object
		// this object can be touched by clients
		// and so must not be in the prototype
		// the global 'this'
		// FIXADE move this list of initial properties to the proto type so we don't
		// have to keep on reinitializing them
		this.Global = {
			decodeURI : "?String:uri",			
			encodeURI : "?String:uri",			
			eval : "?Object:toEval",
			parseInt : "?Number:str,[radix]",
			parseFloat : "?Number:str,[radix]",
			"this": "Global",  
			Math: "Math",
			JSON: "JSON",
			Object: "?Object:[val]",
			Function: "?Function:",
			Array: "?Array:[val]",
			Boolean: "?Boolean:[val]",
			Number: "?Number:[val]",
			Date: "?Date:[val]",
			RegExp: "?RegExp:[val]",
			Error: "?Error:[err]",
			$$proto : "Object"

			// not included since not meant to be referenced directly
			// NaN
			// Infinity
			// isNaN
			// isFinite
			// decodeURIComponent
			// encodeURIComponent
			// EvalError, RangeError, ReferenceError, SyntaxError, TypeError, URIError 
			
		};
		
		var initialGlobalProperties = [];
		for (var prop in this.Global) {
			if (this.Global.hasOwnProperty(prop)) {
				initialGlobalProperties.push(prop);
			}
		}
		
		
		this.clearDefaultGlobal = function() {
			for (var i = 0; i < initialGlobalProperties.length; i++) {
				delete this.Global[initialGlobalProperties[i]];
			}
		};
	};

	/**
	 * Populate the Types object with built-in types.  These are not meant to be changed through the inferencing process
	 * This uses the built in types as defined in the ECMA script reference manual 262.  Available at
	 * http://www.ecma-international.org/publications/files/ECMA-ST/Ecma-262.pdf section 15.
	 */
	Types.prototype = {

		/**
		 * See 15.2.4 Properties of the Object Prototype Object
		 */
		Object : {
			$$isBuiltin: true,
			// Can't use the real propoerty name here because would override the real methods of that name
			$_$prototype : "Object",
			$_$toString: "?String:",
			$_$toLocaleString : "?String:",
			$_$valueOf: "?Object:",
			$_$hasOwnProperty: "?boolean:property",
			$_$isPrototypeOf: "?boolean:object",
			$_$propertyIsEnumerable: "?boolean:property"
		},
		
		/**
		 * See 15.3.4 Properties of the Function Prototype Object
		 */
		Function : {
			$$isBuiltin: true,
			apply : "?Object:func,[argArray]",
			"arguments" : "Arguments",
			bind : "?Object:func,[args...]",
			call : "?Object:func,[args...]",
			caller : "Function",
			length : "Number",
			name : "String",
			$$proto : "Object"
		},

		/**
		 * See 15.4.4 Properties of the Array Prototype Object
		 */
		Array : {
			$$isBuiltin: true,

			concat : "?Array:first,[rest...]",
			join : "?String:separator",
			length : "Number",
			pop : "?Object:",
			push : "?Object:[vals...]",
			reverse : "?Array:",
			shift : "?Object:",
			slice : "?Array:start,deleteCount,[items...]",
			splice : "?Array:start,end",
			sort : "?Array:[sorter]",
			unshift : "?Number:[items...]",
			indexOf : "?Number:searchElement,[fromIndex]",
			lastIndexOf : "?Number:searchElement,[fromIndex]",
			every : "?Boolean:callbackFn,[thisArg]",
			some : "?Boolean:callbackFn,[thisArg]",
			forEach : "?Object:callbackFn,[thisArg]",  // should return 
			map : "?Array:callbackFn,[thisArg]",
			filter : "?Array:callbackFn,[thisArg]",
			reduce : "?Array:callbackFn,[initialValue]",
			reduceRight : "?Array:callbackFn,[initialValue]",
			$$proto : "Object"
		},
		
		/**
		 * See 15.5.4 Properties of the String Prototype Object
		 */
		String : {
			$$isBuiltin: true,
			charAt : "?String:index",
			charCodeAt : "?Number:index",
			concat : "?String:array",
			indexOf : "?Number:searchString",
			lastIndexOf : "?Number:searchString",
			length : "Number",
			localeCompare : "?Number:Object",
			match : "?Boolean:regexp",
			replace : "?String:searchValue,replaceValue",
			search : "?String:regexp",
			slice : "?String:start,end",
			split : "?Array:separator,[limit]",  // Array of string
			substring : "?String:start,end",
			toLocaleUpperCase : "?String:",
			toLowerCase : "?String:",
			toLocaleLowerCase : "?String:",
			toUpperCase : "?String:",
			trim : "?String:",

			$$proto : "Object"
		},
		
		/**
		 * See 15.6.4 Properties of the Boolean Prototype Object
		 */
		Boolean : {
			$$isBuiltin: true,
			$$proto : "Object"
		},
		
		/**
		 * See 15.7.4 Properties of the Number Prototype Object
		 */
		Number : {
			$$isBuiltin: true,
			toExponential : "?Number:digits",
			toFixed : "?Number:digits",
			toPrecision : "?Number:digits",
			// do we want to include NaN, MAX_VALUE, etc?	
		
			$$proto : "Object"
		},
		
		/**
		 * See 15.8.1 15.8.2 Properties and functions of the Math Object
		 * Note that this object is not used as a prototype to define other objects
		 */
		Math : {
			$$isBuiltin: true,
		
			// properties
			E : "Number",
			LN2 : "Number",
			LN10 : "Number",
			LOG2E : "Number",
			LOG10E : "Number",
			PI : "Number",
			SQRT1_2 : "Number",
			SQRT2 : "Number",
		
			// Methods
			abs : "?Number:val",
			acos : "?Number:val",
			asin : "?Number:val",
			atan : "?Number:val",
			atan2 : "?Number:val1,val2",
			ceil : "?Number:val",
			cos : "?Number:val",
			exp : "?Number:val",
			floor : "?Number:val",
			log : "?Number:val",
			max : "?Number:val1,val2",
			min : "?Number:val1,val2",
			pow : "?Number:x,y",
			random : "?Number:",
			round : "?Number:val",
			sin : "?Number:val",
			sqrt : "?Number:val",
			tan : "?Number:val",
			$$proto : "Object"
		},

		
		/**
		 * See 15.9.5 Properties of the Date Prototype Object
		 */
		Date : {
			$$isBuiltin: true,
			toDateString : "?String:",
			toTimeString : "?String:",
			toUTCString : "?String:",
			toISOString : "?String:",
			toJSON : "?Object:key",
			toLocaleDateString : "?String:",
			toLocaleTimeString : "?String:",
			
			getTime : "?Number:",
			getTimezoneOffset : "?Number:",

			getDay : "?Number:",
			getUTCDay : "?Number:",
			getFullYear : "?Number:",
			getUTCFullYear : "?Number:",
			getHours : "?Number:",
			getUTCHours : "?Number:",
			getMinutes : "?Number:",
			getUTCMinutes : "?Number:",
			getSeconds : "?Number:",
			getUTCSeconds : "?Number:",
			getMilliseconds : "?Number:",
			getUTCMilliseconds : "?Number:",
			getMonth : "?Number:",
			getUTCMonth : "?Number:",
			getDate : "?Number:",
			getUTCDate : "?Number:",
			
			setTime : "?Number:",
			setTimezoneOffset : "?Number:",

			setDay : "?Number:dayOfWeek",
			setUTCDay : "?Number:dayOfWeek",
			setFullYear : "?Number:year,[month],[date]",
			setUTCFullYear : "?Number:year,[month],[date]",
			setHours : "?Number:hour,[min],[sec],[ms]",
			setUTCHours : "?Number:hour,[min],[sec],[ms]",
			setMinutes : "?Number:min,[sec],[ms]",
			setUTCMinutes : "?Number:min,[sec],[ms]",
			setSeconds : "?Number:sec,[ms]",
			setUTCSeconds : "?Number:sec,[ms]",
			setMilliseconds : "?Number:ms",
			setUTCMilliseconds : "?Number:ms",
			setMonth : "?Number:month,[date]",
			setUTCMonth : "?Number:month,[date]",
			setDate : "?Number:date",
			setUTCDate : "?Number:gate",
			
			$$proto : "Object"
		},
		
		/**
		 * See 15.10.6 Properties of the RexExp Prototype Object
		 */
		RegExp : {
			$$isBuiltin: true,
			g : "Object",
			i : "Object",
			gi : "Object",
			m : "Object",
			source : "String",
			global : "Boolean",
			ignoreCase : "Boolean",
			multiline : "Boolean",
			lastIndex : "Boolean",
			
			exec : "?Array:str",
			test : "?Boolean:str",
			
			$$proto : "Object"
		},
		
		/**
		 * See 15.11.4 Properties of the Error Prototype Object
		 * We don't distinguish between kinds of errors
		 */
		Error : {
			$$isBuiltin: true,
			name : "String",
			message : "String",
			stack : "String",
			$$proto : "Object"
		},

		/**
		 * See 10.6 Arguments Object
		 */
		Arguments : {
			$$isBuiltin: true,
			callee : "Function",
			length : "Number",
			
			$$proto : "Object"
		},

		/**
		 * See 15.12.2 and 15.12.3 Properties of the JSON Object
		 */
		JSON : {
			$$isBuiltin: true,

			parse : "?Object:str",
			stringify : "?String:obj",
			$$proto : "Object"
		}
	};
	
	
	return {
		Types : Types
	};
});