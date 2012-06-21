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
	 * The Definition class refers to the declaration of an identifier.
	 * The start and end are locations in the source code.
	 * Path is a URL corresponding to the document where the definition occurs.
	 * If range is undefined, then the definition refers to the entire document
	 * Range is a two element array with the start and end values 
	 * (Exactly the same range field as is used in Esprima)
	 * If the document is undefined, then the definition is in the current document.
	 */
	var Definition = function(typeName, range, path) {
		this.typeName = typeName;
		this.range = range;
		this.path = path;
	};

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
		// FIXADE move this list of initial properties to the prototype so we don't
		// have to keep on reinitializing them
		this.Global = {
			decodeURI : new Definition("?String:uri"),			
			encodeURI : new Definition("?String:uri"),			
			'eval' : new Definition("?Object:toEval"),
			parseInt : new Definition("?Number:str,[radix]"),
			parseFloat : new Definition("?Number:str,[radix]"),
			"this": new Definition("Global"),  
			Math: new Definition("Math"),
			JSON: new Definition("JSON"),
			Object: new Definition("?Object:[val]"),
			Function: new Definition("?Function:"),
			Array: new Definition("?Array:[val]"),
			Boolean: new Definition("?Boolean:[val]"),
			Number: new Definition("?Number:[val]"),
			Date: new Definition("?Date:[val]"),
			RegExp: new Definition("?RegExp:[val]"),
			Error: new Definition("?Error:[err]"),
			$$proto : new Definition("Object")

			// not included since not meant to be referenced directly
			// NaN
			// Infinity
			// isNaN
			// isFinite
			// EvalError, RangeError, ReferenceError, SyntaxError, TypeError, URIError 
			
			// not included since too boring to use...maybe consider for later			
			// decodeURIComponent
			// encodeURIComponent
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
			$_$prototype : new Definition("Object"),
			$_$toString: new Definition("?String:"),
			$_$toLocaleString : new Definition("?String:"),
			$_$valueOf: new Definition("?Object:"),
			$_$hasOwnProperty: new Definition("?boolean:property"),
			$_$isPrototypeOf: new Definition("?boolean:object"),
			$_$propertyIsEnumerable: new Definition("?boolean:property")
		},
		
		/**
		 * See 15.3.4 Properties of the Function Prototype Object
		 */
		Function : {
			$$isBuiltin: true,
			apply : new Definition("?Object:func,[argArray]"),
			"arguments" : new Definition("Arguments"),
			bind : new Definition("?Object:func,[args...]"),
			call : new Definition("?Object:func,[args...]"),
			caller : new Definition("Function"),
			length : new Definition("Number"),
			name : new Definition("String"),
			$$proto : new Definition("Object")
		},

		/**
		 * See 15.4.4 Properties of the Array Prototype Object
		 */
		Array : {
			$$isBuiltin: true,

			concat : new Definition("?Array:first,[rest...]"),
			join : new Definition("?String:separator"),
			length : new Definition("Number"),
			pop : new Definition("?Object:"),
			push : new Definition("?Object:[vals...]"),
			reverse : new Definition("?Array:"),
			shift : new Definition("?Object:"),
			slice : new Definition("?Array:start,deleteCount,[items...]"),
			splice : new Definition("?Array:start,end"),
			sort : new Definition("?Array:[sorter]"),
			unshift : new Definition("?Number:[items...]"),
			indexOf : new Definition("?Number:searchElement,[fromIndex]"),
			lastIndexOf : new Definition("?Number:searchElement,[fromIndex]"),
			every : new Definition("?Boolean:callbackFn,[thisArg]"),
			some : new Definition("?Boolean:callbackFn,[thisArg]"),
			forEach : new Definition("?Object:callbackFn,[thisArg]"),  // should return 
			map : new Definition("?Array:callbackFn,[thisArg]"),
			filter : new Definition("?Array:callbackFn,[thisArg]"),
			reduce : new Definition("?Array:callbackFn,[initialValue]"),
			reduceRight : new Definition("?Array:callbackFn,[initialValue]"),
			$$proto : new Definition("Object")
		},
		
		/**
		 * See 15.5.4 Properties of the String Prototype Object
		 */
		String : {
			$$isBuiltin: true,
			charAt : new Definition("?String:index"),
			charCodeAt : new Definition("?Number:index"),
			concat : new Definition("?String:array"),
			indexOf : new Definition("?Number:searchString"),
			lastIndexOf : new Definition("?Number:searchString"),
			length : new Definition("Number"),
			localeCompare : new Definition("?Number:Object"),
			match : new Definition("?Boolean:regexp"),
			replace : new Definition("?String:searchValue,replaceValue"),
			search : new Definition("?String:regexp"),
			slice : new Definition("?String:start,end"),
			split : new Definition("?Array:separator,[limit]"),  // Array of string
			substring : new Definition("?String:start,end"),
			toLocaleUpperCase : new Definition("?String:"),
			toLowerCase : new Definition("?String:"),
			toLocaleLowerCase : new Definition("?String:"),
			toUpperCase : new Definition("?String:"),
			trim : new Definition("?String:"),

			$$proto : new Definition("Object")
		},
		
		/**
		 * See 15.6.4 Properties of the Boolean Prototype Object
		 */
		Boolean : {
			$$isBuiltin: true,
			$$proto : new Definition("Object")
		},
		
		/**
		 * See 15.7.4 Properties of the Number Prototype Object
		 */
		Number : {
			$$isBuiltin: true,
			toExponential : new Definition("?Number:digits"),
			toFixed : new Definition("?Number:digits"),
			toPrecision : new Definition("?Number:digits"),
			// do we want to include NaN, MAX_VALUE, etc?	
		
			$$proto : new Definition("Object")
		},
		
		/**
		 * See 15.8.1 15.8.2 Properties and functions of the Math Object
		 * Note that this object is not used as a prototype to define other objects
		 */
		Math : {
			$$isBuiltin: true,
		
			// properties
			E : new Definition("Number"),
			LN2 : new Definition("Number"),
			LN10 : new Definition("Number"),
			LOG2E : new Definition("Number"),
			LOG10E : new Definition("Number"),
			PI : new Definition("Number"),
			SQRT1_2 : new Definition("Number"),
			SQRT2 : new Definition("Number"),
		
			// Methods
			abs : new Definition("?Number:val"),
			acos : new Definition("?Number:val"),
			asin : new Definition("?Number:val"),
			atan : new Definition("?Number:val"),
			atan2 : new Definition("?Number:val1,val2"),
			ceil : new Definition("?Number:val"),
			cos : new Definition("?Number:val"),
			exp : new Definition("?Number:val"),
			floor : new Definition("?Number:val"),
			log : new Definition("?Number:val"),
			max : new Definition("?Number:val1,val2"),
			min : new Definition("?Number:val1,val2"),
			pow : new Definition("?Number:x,y"),
			random : new Definition("?Number:"),
			round : new Definition("?Number:val"),
			sin : new Definition("?Number:val"),
			sqrt : new Definition("?Number:val"),
			tan : new Definition("?Number:val"),
			$$proto : new Definition("Object")
		},

		
		/**
		 * See 15.9.5 Properties of the Date Prototype Object
		 */
		Date : {
			$$isBuiltin: true,
			toDateString : new Definition("?String:"),
			toTimeString : new Definition("?String:"),
			toUTCString : new Definition("?String:"),
			toISOString : new Definition("?String:"),
			toJSON : new Definition("?Object:key"),
			toLocaleDateString : new Definition("?String:"),
			toLocaleTimeString : new Definition("?String:"),
			
			getTime : new Definition("?Number:"),
			getTimezoneOffset : new Definition("?Number:"),

			getDay : new Definition("?Number:"),
			getUTCDay : new Definition("?Number:"),
			getFullYear : new Definition("?Number:"),
			getUTCFullYear : new Definition("?Number:"),
			getHours : new Definition("?Number:"),
			getUTCHours : new Definition("?Number:"),
			getMinutes : new Definition("?Number:"),
			getUTCMinutes : new Definition("?Number:"),
			getSeconds : new Definition("?Number:"),
			getUTCSeconds : new Definition("?Number:"),
			getMilliseconds : new Definition("?Number:"),
			getUTCMilliseconds : new Definition("?Number:"),
			getMonth : new Definition("?Number:"),
			getUTCMonth : new Definition("?Number:"),
			getDate : new Definition("?Number:"),
			getUTCDate : new Definition("?Number:"),
			
			setTime : new Definition("?Number:"),
			setTimezoneOffset : new Definition("?Number:"),

			setDay : new Definition("?Number:dayOfWeek"),
			setUTCDay : new Definition("?Number:dayOfWeek"),
			setFullYear : new Definition("?Number:year,[month],[date]"),
			setUTCFullYear : new Definition("?Number:year,[month],[date]"),
			setHours : new Definition("?Number:hour,[min],[sec],[ms]"),
			setUTCHours : new Definition("?Number:hour,[min],[sec],[ms]"),
			setMinutes : new Definition("?Number:min,[sec],[ms]"),
			setUTCMinutes : new Definition("?Number:min,[sec],[ms]"),
			setSeconds : new Definition("?Number:sec,[ms]"),
			setUTCSeconds : new Definition("?Number:sec,[ms]"),
			setMilliseconds : new Definition("?Number:ms"),
			setUTCMilliseconds : new Definition("?Number:ms"),
			setMonth : new Definition("?Number:month,[date]"),
			setUTCMonth : new Definition("?Number:month,[date]"),
			setDate : new Definition("?Number:date"),
			setUTCDate : new Definition("?Number:gate"),
			
			$$proto : new Definition("Object")
		},
		
		/**
		 * See 15.10.6 Properties of the RexExp Prototype Object
		 */
		RegExp : {
			$$isBuiltin: true,
			g : new Definition("Object"),
			i : new Definition("Object"),
			gi : new Definition("Object"),
			m : new Definition("Object"),
			source : new Definition("String"),
			global : new Definition("Boolean"),
			ignoreCase : new Definition("Boolean"),
			multiline : new Definition("Boolean"),
			lastIndex : new Definition("Boolean"),
			
			exec : new Definition("?Array:str"),
			test : new Definition("?Boolean:str"),
			
			$$proto : new Definition("Object")
		},
		
		/**
		 * See 15.11.4 Properties of the Error Prototype Object
		 * We don't distinguish between kinds of errors
		 */
		Error : {
			$$isBuiltin: true,
			name : new Definition("String"),
			message : new Definition("String"),
			stack : new Definition("String"),
			$$proto : new Definition("Object")
		},

		/**
		 * See 10.6 Arguments Object
		 */
		Arguments : {
			$$isBuiltin: true,
			callee : new Definition("Function"),
			length : new Definition("Number"),
			
			$$proto : new Definition("Object")
		},

		/**
		 * See 15.12.2 and 15.12.3 Properties of the JSON Object
		 */
		JSON : {
			$$isBuiltin: true,

			parse : new Definition("?Object:str"),
			stringify : new Definition("?String:obj"),
			$$proto : new Definition("Object")
		}
	};
	
	return {
		Types : Types,
		Definition : Definition
	};
});