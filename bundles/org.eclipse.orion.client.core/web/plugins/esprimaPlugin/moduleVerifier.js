/*******************************************************************************
 * @license
 * Copyright (c) 2012 Contributors
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 *
 * Contributors:
 *     Andrew Eisenberg (vmware) - initial api and implementation
 *******************************************************************************/

/*global define*/
define(["plugins/esprimaPlugin/esprimaVisitor"], function(mVisitor) {


	function lookForMissingAsyncCall(call, indexer) {
		// array is either 0 or 1 arg
		// for each elt of array, is it resolvable?
		
		var args = call["arguments"];
		if (args) {
			var arrayElts;
			var constArg;
			for (var i = 0; i < Math.min(args.length, 2); i++) {
				if (args[i].type === "ArrayExpression") {
					arrayElts = args[i].elements;
				} else if (args[i].type === 'Literal') {
					constArg = args[i];
				}
			}
			if (!arrayElts && constArg) {
				arrayElts = [ constArg ];
			}
			
			if (arrayElts) {
				var missing = [];
				for (i = 0; i < arrayElts.length; i++) {
					if (arrayElts[i].type === "Literal" && typeof arrayElts[i].value === "string") {
						if (!indexer.hasDependency(arrayElts[i].value)) {
							// module is unresolvable report it.
							// FIXADE shou;d be saving this in an array but not because I'm too lazt
							missing.push({
								description : "Cannot find module '" + arrayElts[i].value + "'",
								line : arrayElts[i].loc.start.line,
								severity : "error",
								start : arrayElts[i].loc.start.column+2,
								end : arrayElts[i].loc.end.column+1
							});
						}
					}
				}
				if (missing.length > 0) {
					return missing;
				}
			}
		}
		return null;
	}
	
	function lookForMissingSyncCall(call, indexer) {
		// not yet
	}
	
	/**
	 * This module defines a module verifier that checks for unresolvable modules
	 */
	 function checkModules(buffer, indexer) {
		var root = mVisitor.parse(buffer, { range: false, loc: true });
				
		var operation = function(node, missingModules) {
			// look for methods called define or require
			var maybeMissing;
			
			if (node.type === "CallExpression") {
				if (node.callee.name === "define") {
					maybeMissing = lookForMissingAsyncCall(node, indexer);
					if (maybeMissing) {
						missingModules.push(maybeMissing);
					}
				} else if (node.callee.name === "require") {
					maybeMissing = lookForMissingAsyncCall(node, indexer);
					if (maybeMissing) {
						missingModules.push(maybeMissing);
					} else {
						maybeMissing = lookForMissingSyncCall(node, indexer);
						if (maybeMissing) {
							missingModules.push(maybeMissing);
						}
					}
				}
			}
			return true;
		};
		
		// missingModules = [{start, end, message}...]
		var missingModules = [];
		mVisitor.visit(root, missingModules, operation);
		
		var flattenedMissing = [];
		for (var i = 0; i < missingModules.length; i++) {
			flattenedMissing = flattenedMissing.concat(missingModules[i]);
		}
		
		return flattenedMissing;
	 }
	 
	return {
		checkModules : checkModules
	};
	
});