/*******************************************************************************
 * @license
 * Copyright (c) 2012 Contributors
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 *
 * Contributors:
 *     Andy Clement (vmware) - initial API and implementation
 *     Andrew Eisenberg (vmware) - implemented visitor pattern
 *******************************************************************************/

/*global define require eclipse esprima window console*/
window.onload = function() {

	/**
	 * Generic AST visitor.
	 * @param node The AST node to visit
	 * @param data any extra data (is this strictly necessary, or should it be folded into the operation?).
	 * @param operation function(node, data) an operation on the AST node and the data.  Return falsy if
	 * the visit should no longer continue. Return truthy to continue.
	 * @param postoperation (optional) function(node, data) an operation that is exectuted after visiting the current node's children.
	 * will only be invoked if operation returns true for the current node
	 */
	function visit(node, data, operation, postoperation) {
		if (operation(node, data, true)) {
			for (var key in node) {
				if (key !== "range") {
					var child = node[key];
					if (child instanceof Array) {
						for (var i = 0; i < child.length; i++) {
							if (child[i] && child[i].hasOwnProperty("type")) {
								visit(child[i], data, operation, postoperation);
							}
						}
					} else {
						if (child && child.hasOwnProperty("type")) {
							visit(child, data, operation, postoperation);
						}
					}
				}
			}
			if (postoperation) {
				postoperation(node, data, false);
			}
		}
	}

	/**
	 * Convert an array of parameters into a string form.
	 */

	function toParamString(params) {
		if (!params || params.length === 0) {
			return "()";
		}
		var pstring = '(';
		var plen = params.length;
		for (var p = 0; p < plen; p++) {
			if (p > 0) {
				pstring += ',';
			}
			var name = params[p].name;
			pstring += name;
		}
		pstring += ')';
		return pstring;
	}


	function inRange(offset, range) {
		return range[0] <= offset && range[1] >= offset;
	}
	/**
	 * checks that offset is before the range
	 */
	function isBefore(offset, range) {
		if (!range) {
			return true;
		}
		return offset < range[0];
	}
	
	/**
	 * checks that offset is after the range
	 */
	function isAfter(offset, range) {
		if (!range) {
			return true;
		}
		return offset > range[0];
	}
	
	/**
	 * return true if we are at a location where proposing something makes sense.  False otherwise.
	 */
	function shouldVisit(root, offset) {
		/**
		 * A visitor that finds the parent stack at the given location
		 */ 
		var findParentStack = function(node, parents, isInitialVisit) {
			if (!isInitialVisit) {
				parents.pop();
				return false;
			}
			
			if (node.range && inRange(offset, node.range)) {
				if (node.type === "Identifier") {
					throw "done";
				}
				parents.push(node);
				if ((node.type === "FunctionDeclaration" || node.type === "FunctionExpression") && 
						isBefore(offset, node.body.range)) {
					// completion occurs on the word "function"
					throw "done";
				}
				return true;
			} else {
				return false;
			}
		};
		var parents = [];
		try {
			visit(root, parents, findParentStack, findParentStack);
		} catch (done) {
			if (done !== "done") {
				// a real error
				throw(done);
			}
		}

		if (parents && parents.length) {
			var parent = parents.pop();
			if (parent.type === "MemberExpression" && inRange(offset, parent.property.range)) {
				// on the right hand side of a property, eg: foo.b^
				return false;
			} else if (parent.type === "VariableDeclarator" && (!parent.init || isBefore(offset, parent.init.range))) {
				// the name of a variable declaration
				return false;
			} else if ((parent.type === "FunctionDeclaration" || parent.type === "FunctionExpression") && 
					isBefore(offset, parent.body.range)) {
				return false;
			}
			
		}
		return true;
	}	
	
	
	// things to keep track of:
	// proposals is an object.  each property corresponds to a variable name.  each value is a proposal.
	// proposal (identifier (maybe same as proposal), kind(function or variable), proposal*, description*, proposals (the object that describes the proposals available to this object))
	// types object with key as the type name and value is proposals
	

	/**
	 * Visits the AST and collects all of the AST proposals
	 */
	function proposalCollector(node, data) {
		var type = node.type;
		// do a range check
		if (type === "BlockStatement" && !inRange(data.offset, node.range)) {
			// out of range
			return false;
		} else if (type === "FunctionDeclaration") {
			var params = node.params;
			var fn = node.id.name + toParamString(params);
			data.proposals.push({ proposal: fn, description: fn + " (function)"});
			
			// ony add parameters if we are completing inside the function
			if (params && params.length > 0 && inRange(data.offset, node.range)) {
				var plen = params.length;
				for (var p = 0; p < plen; p++) {
					data.proposals.push({ proposal: params[p].name, description: params[p].name + " (parameter of " + node.id.name + ")"});
				}
			}
		} else if (type === "VariableDeclarator" && isAfter(data.offset, node.range)) {
			// although legal to reference before being declared, don't include in list
			data.proposals.push({ proposal: node.id.name, description: node.id.name + " (variable)"});
		} else if (type === "VariableDeclaration" && isBefore(data.offset, node.range)) {
			// must do this check since "VariableDeclarator"s do not seem to have their range set correctly
			return false;
		}
		return true;
	}

	function parse(contents) {
		var parsedProgram = esprima.parse(contents, {
			range: true
		});
		// to get range nodes (start/end position elements) and comments (at the end of the ast), use this:
		// (although not sure comments bit is behaving at the moment)
		//	    var parsedProgram = esprima.parse(contents,{range:true,comments:true});
		//	    var linebreaks = computeLinebreaks(contents);
		//	    return {ast:parsedProgram,linebreaks:linebreaks};
		return parsedProgram;
	}

	/**
	 * removes any duplicate proposals
	 * @param proposals array of sorted proposals
	 * @return array of proposals, still sorted, and with all duplicates removed
	 */
	function squash(proposals) {
		var newProposals = [], len = proposals.length, i, prevProposal = null;
		for (i = 0; i < len; i++) {
			if (proposals[i] !== prevProposal) {
				newProposals.push(proposals[i]);
				prevProposal = proposals[i];
			}
		}
		return newProposals;
	}

	/**
	 * Main entry point to provider
	 */
	var proposalProvider = {
		computeProposals: function(prefix, buffer, selection) {
			try {
				var proposals = [];
				var root = parse(buffer);
				var offset = selection.start-1;
				if (shouldVisit(root, offset)) {
					visit(root, { proposals: proposals, offset: offset}, proposalCollector);
					proposals.sort();
					proposals = squash(proposals);
				}
				return proposals;
			} catch (e) {
				// log error and throw error up
				if (console && console.log) {
					console.log(e.message);
					console.log(e.stack);
				}
				throw (e);
			}
		}
	};


	// --- registration logic for new content assist provider
	var provider = new eclipse.PluginProvider();
	provider.registerServiceProvider("orion.edit.contentAssist", proposalProvider, {
		contentType: ["text.javascript"],
		name: "Esprima based JavaScript content assist",
		id: "orion.edit.contentassist.esprima"
	});
	provider.connect();
};