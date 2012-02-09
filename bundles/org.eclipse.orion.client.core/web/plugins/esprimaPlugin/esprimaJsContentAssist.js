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

/*global define require eclipse esprima window console inTest*/
var esprimaContentAssistant = function() {

	/**
	 * A prototype of that contains the common built-in types
	 */
	var Types = function() {
		/**
		 * Properties common to all objects - ECMA 262, section 15.2.4.
		 */
		this.Object = [
			{name: "toString", args:[], type:"String"}, 
			{name: "toLocaleString", args:[], type:"String"}, 
			{name: "valueOf", args:[], type:"Object"}, 
			{name: "hasOwnProperty", args: ["property"], type:"boolean"},
			{name: "isPrototypeOf", args: ["Object"], type:"boolean"},
			{name: "propertyIsEnumerable", args: ["property"], type:"boolean"}
		];

		/**
		 * Properties common to all Strings - ECMA 262, section 15.5.4
		 */
		this.String = [
			{name: "charAt", args: ["index"], type:"String"},
			{name: "charCodeAt", args: ["index"], type:"Number"},
			{name: "concat", args: ["array"], type:"String"},
			{name: "indexOf", args: ["searchString", "[position]"], type:"Number"},
			{name: "lastIndexOf", args: ["searchString", "[position]"], type:"Number"},
			{name: "length", type:"Number"},
			{name: "localeCompare", args: ["Object"], type:"Number"},
			{name: "match", args: ["regexp"], type:"boolean"},
			{name: "replace", args: ["searchValue", "replaceValue"], type:"String"},
			{name: "search", args: ["regexp"], type:"String"},
			{name: "slice", args: ["start", "end"], type:"String"},
			{name: "split", args: ["separator", "[limit]"], type:"Array"},
			{name: "substring", args: ["start", "[end]"], type:"String"},
			{name: "toLowerCase", args:[], type:"String"},
			{name: "toLocaleLowerCase", args:[], type:"String"},
			{name: "toUpperCase", args:[], type:"String"},
			{name: "toLocaleUpperCase", args:[], type:"String"},
			{name: "trim", args:[], type:"String"},
			{name: "prototype", type:"Object"}
		];
		
		/**
		 * Properties common to all arrays.  may be incomplete
		 */
		this.Array = [
			{name: "length", type:"Number" },
			{name: "sort", args: [], type:"Array" },
			{name: "toString", args: [], type:"String" },
			{name: "concat", args: ["left", "right"], type:"Array" },
			{name: "slice", args: ["start", "end"], type:"Array" },
			{name: "prototype", type:"Object"}
		];
		
		/**
		 * Properties common to all dates.  may be incomplete
		 */
		this.Date = [
			{name: "getDay", args: [], type:"Number" },
			{name: "getFullYear", args: [], type:"Number" },
			{name: "getHours", args: [], type:"Number" },
			{name: "getMinutes", args: [], type:"Number" },
			{name: "setTime", args: ["millis"] },
			{name: "setDay", args: ["dayOfWeek"] },
			{name: "setFullYear", args: ["year"] },
			{name: "setHours", args: ["hour"] },
			{name: "setMinutes", args: ["minutes"] },
			{name: "prototype", type:"Object"}
		];
		
		this.Boolean = [
			{name: "prototype", type:"Object"}
		];
		
		this.Function = [
			{name: "prototype", type:"Object"},
			{name: "apply", args: ["func", "[args]"], type:"Object"},
			{name: "arguments", type:"Arguments"},
			{name: "bind", args: []},
			{name: "call", args: ["func", "arg"], type:"Object"},
			{name: "caller", type:"Function"},
			{name: "length", type:"Number"},
			{name: "name", type:"String"}
		];
		
		this.Number = [
			{name: "prototype", type:"Object"},
			{name: "toExponential", args:["digits"], type:"Number"}, 
			{name: "toFixed", args:["digits"], type:"Number"}, 
			{name: "toPrecision", args:["digits"], type:"Number"}
			// do we want to include NaN, MAX_VALUE, etc?
		];

		
		this.Arguments = [
			{name: "prototype", type:"Object"},
			{name: "callee", type:"Function"},
			{name: "length", type:"Number"}
		];
		
		this.RegExp = [
			{name: "prototype", type:"Object"},
			{name: "g", type:"Object"},
			{name: "i", type:"Object"},
			{name: "gi", type:"Object"},
			{name: "m", type:"Object"},
			{name: "exec", args:["str"], type:"Array"}, 
			{name: "test", args:["str"], type:"Array"}
		];
		
		this.Math = [
			{name: "prototype", type:"Object"},

			// properties
			{name: "E", type:"Number"},
			{name: "LN2", type:"Number"},
			{name: "LN10", type:"Number"},
			{name: "LOG2E", type:"Number"},
			{name: "LOG10E", type:"Number"},
			{name: "PI", type:"Number"},
			{name: "SQRT1_2", type:"Number"},
			{name: "SQRT2", type:"Number"},
			
			// Methods
			{name: "abs", args: ["val"], type:"Number"},
			{name: "acos", args: ["val"], type:"Number"},
			{name: "asin", args: ["val"], type:"Number"},
			{name: "atan", args: ["val"], type:"Number"},
			{name: "atan2", args: ["val1", "val2"], type:"Number"},
			{name: "ceil", args: ["val"], type:"Number"},
			{name: "cos", args: ["val"], type:"Number"},
			{name: "exp", args: ["val"], type:"Number"},
			{name: "floor", args: ["val"], type:"Number"},
			{name: "log", args: ["val"], type:"Number"},
			{name: "max", args: ["val1", "val2"], type:"Number"},
			{name: "min", args: ["val1", "val2"], type:"Number"},
			{name: "pow", args: ["x", "y"], type:"Number"},
			{name: "random", args: [], type:"Number"},
			{name: "round", args: ["val"], type:"Number"},
			{name: "sin", args: ["val"], type:"Number"},
			{name: "sqrt", args: ["val"], type:"Number"},
			{name: "tan", args: ["val"], type:"Number"}		
		];
	};

	/**
	 * Generic AST visitor.  Visits all children in source order, if they have a range property.  Children with
	 * no range property are visited first.
	 * 
	 * @param node The AST node to visit
	 * @param data any extra data (is this strictly necessary, or should it be folded into the operation?).
	 * @param operation function(node, data) an operation on the AST node and the data.  Return falsy if
	 * the visit should no longer continue. Return truthy to continue.
	 * @param postoperation (optional) function(node, data) an operation that is exectuted after visiting the current node's children.
	 * will only be invoked if operation returns true for the current node
	 */
	function visit(node, data, operation, postoperation) {
		var i, key, child, children;
		if (operation(node, data, true)) {
			// gather children to visit
			children = [];
			for (key in node) {
				if (key !== "range") {
					child = node[key];
					if (child instanceof Array) {
						for (i = 0; i < child.length; i++) {
							if (child[i] && child[i].hasOwnProperty("type")) {
								children.push(child[i]);
							} else {
								// might be key-value pair of an object expression
								// don't visit the key since it doesn't have an sloc
								// and it is handle later by inferencing
								if (child[i].hasOwnProperty("value")) {
									children.push(child[i].value);
								}
							}
						}
					} else {
						if (child && child.hasOwnProperty("type")) {
							children.push(child);
						}
					}
				}
			}
			
			if (children.length > 0) {
				// sort children by source location
				children.sort(function(left, right) {
					if (left.range && right.range) {
						return left.range[0] - right.range[0];	
					} else if (left.range) {
						return 1;
					} else if (right.range) {
						return -1;
					} else {
						return 0;
					}
				});
				
				// visit children in order
				for (i = 0; i < children.length; i++) {
					visit(children[i], data, operation, postoperation);
				}
			}
			if (postoperation) {
				postoperation(node, data, false);
			}
		}
	}

	/**
	 * Convert an array of parameters into a string and also compute linked editing positions
	 * @return { completion, positions }
	 */
	function calculateFunctionProposal(name, params, offset) {
		if (!params || params.length === 0) {
			return {completion: name + "()", positions:[]};
		}
		var positions = [];
		var completion = name + '(';
		var plen = params.length;
		for (var p = 0; p < plen; p++) {
			if (p > 0) {
				completion += ', ';
			}
			var argName = params[p].name ? params[p].name : params[p];
			positions.push({offset:offset+completion.length+1, length: argName.length});
			completion += argName;
		}
		completion += ')';
		return {completion: completion, positions: positions};
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
	 * @return "top" if we are at a start of a new expression fragment (eg- at an empty line, 
	 * or a new parameter).  "member" if we are after a dot in a member expression.  false otherwise
	 */
	function shouldVisit(root, offset) {
		/**
		 * A visitor that finds the parent stack at the given location
		 */ 
		var findParent = function(node, parents, isInitialVisit) {
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
			visit(root, parents, findParent, findParent);
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
				return "member";
			} else if (parent.type === "VariableDeclarator" && (!parent.init || isBefore(offset, parent.init.range))) {
				// the name of a variable declaration
				return false;
			} else if ((parent.type === "FunctionDeclaration" || parent.type === "FunctionExpression") && 
					isBefore(offset, parent.body.range)) {
				// a function declaration
				return false;
			}
			
		}
		return "top";
	}	

	function addInferredProposals(inferredType, data) {
		var res, i, proto;
		var properties = data.types[inferredType];
		for (i = 0; i < properties.length; i++) {
			if (properties[i].args) {
				if (properties[i].name === "prototype") {
					proto = properties[i].type;
				}
				res = calculateFunctionProposal(properties[i].name, properties[i].args, data.offset - data.prefix.length);
				data.proposals.push({ 
					proposal: res.completion, 
					description: res.completion + " (function, inferred)", 
					positions: res.positions, 
					escapePosition: data.offset + res.completion.length 
				});
			} else {
				data.proposals.push({ 
					proposal: properties[i].name,
					description: properties[i].name + " (property, inferred)"
				});
			}
		}
		
		// walk up the prototype hierarchy
		if (proto) {
			addInferredProposals(proto, data);
		}
	}
	
		/**
	 * Determines if the offset is inside this member expression, but after the '.' and before the 
	 * start of the property.
	 * eg, the following returns true:
	 *   foo   .^bar	 
	 *   foo   .  ^ bar
	 * The following returns false:
	 *   foo   ^.  bar
	 *   foo   .  b^ar
	 */
	function afterDot(offset, memberExpr, contents) {
		// only do the work if we are in between the 
		if (!inRange(offset, memberExpr.range) ||
			inRange(offset, memberExpr.object.range) ||
			inRange(offset, memberExpr.property.range)) {
			return false;
		}
		
		var dotLoc = memberExpr.object.range[1];
		while (contents.charAt(dotLoc) !== "." && dotLoc < memberExpr.property.range[0]) {
			dotLoc++;
		}
		
		if (contents.charAt(dotLoc) !== ".") {
			return false;
		}
		
		return dotLoc < offset;
	}
	
	/**
	 * Visits the AST and collects all of the AST proposals
	 * @param node the AST node to visit
	 * @param data {offset, prefix, proposals [{propsal, description, positions, escapePosition}], allNames {name:type}} the data for the visitor.
	 */
	function proposalCollector(node, data) {
		var type = node.type;
		var res, name;
		// do a range check
		if (type === "BlockStatement" && !inRange(data.offset, node.range)) {
			// out of range
			return false;
		} else if (type === "FunctionDeclaration" && data.completionKind === "top") {
			name = node.id.name;
			var params = node.params;
			if (name.indexOf(data.prefix) === 0) {
				res = calculateFunctionProposal(node.id.name, params, data.offset - data.prefix.length);
				data.proposals.push({ 
					proposal: res.completion, 
					description: res.completion + " (function)", 
					positions: res.positions, 
					escapePosition: data.offset + res.completion.length 
				});
			}
			// only add parameters if we are completing inside the function
			if (params && params.length > 0 && inRange(data.offset, node.range)) {
				var plen = params.length;
				for (var p = 0; p < plen; p++) {
					name = params[p].name;
					if (name.indexOf(data.prefix) === 0) {
						data.proposals.push({ proposal: name, description: name + " (parameter of " + node.id.name + ")"});
					}
				}
			}
		} else if (type === "VariableDeclarator" && isAfter(data.offset, node.range) && data.completionKind === "top") {
			// although legal to reference before being declared, don't include in list
			name = node.id.name;
			if (name.indexOf(data.prefix) === 0) {
				data.proposals.push({ proposal: node.id.name, description: node.id.name + " (variable)"});
			}
		} else if (type === "MemberExpression" && data.completionKind === "member" &&
				(inRange(data.offset, node.property.range) || afterDot(data.offset, node, data.contents))) {
			var inferredType = data.allNames[node.object.name];
			if (inferredType && data.types[inferredType]) {
				addInferredProposals(inferredType, data);
			}
		} else if (type === "VariableDeclaration" && isBefore(data.offset, node.range)) {
			// must do this check since "VariableDeclarator"s do not seem to have their range set correctly
			return false;
		}
		return true;
	}
	
	var objCount = 0;
	
	/**
	 * called as the post operation for the proposalCollector visitor.
	 */
	function doInfer(node, data) {
		var type = node.type;
		// now do the inference. might have to be in the post op
		if (type === 'Identifier' && data.allNames[node.name]) {
			// case where we have already seen the variable
			node.inferredType = data.allNames[node.name];
		} else if (type === "VariableDeclarator") {
			if (node.init) {
				data.allNames[node.id.name] = node.init.inferredType;
			} else {
				data.allNames[node.id.name] = "Object";
			}
		} else if (type === "NewExpression") {
			node.inferredType = node.callee.name;
		} else if (type === "AssignmentExpression" && node.left.type === 'Identifier') {
			// only handle simple assignements, eg- x = y; and not x.y = z;
			data.allNames[node.left.name] = node.right.inferredType;
		} else if (type === "Literal") {
			var oftype = (typeof node.value);
			node.inferredType = oftype[0].toUpperCase() + oftype.substring(1, oftype.length);
		} else if (type === "ArrayExpression") {
			node.inferredType = "Array";
		} else if (type === "ObjectExpression") {
			// for object literals, create a new object type so that we can stuff new properties into it.
			var newTypeName = "Object~"+ objCount++;
			var newTypeProperties = [{name:"prototype", type: "Object"}];
			for (var i = 0; i < node.properties.length; i++) {
				var property = node.properties[i];
				// only remember if the property is an identifier
				if (property.key && property.key.name) {
					newTypeProperties.push(
						{ name: property.key.name, 
						  type: property.value.inferredType });  
				}
			}
			data.types[newTypeName] = newTypeProperties;
			node.inferredType = newTypeName;
		} else if (type === "MemberExpression") {
			node.inferredType = node.object.inferredType[node.property.id];
		} else if (type === "BinaryExpression") {
			if (node.operator === "+" || node.operator === "-" || node.operator === "/" || node.operator === "*") {
				// assume number for now
				// rules are really much more complicated
				node.inferredType = "Number";
			}
		} else if (type === "UpdsteExpression") {
			node.inferredType = "Number";
		}
		
		if (!node.inferredType) {
			node.inferredType = "Object";
		}
		return true;
	}

	function parse(contents) {
		var parsedProgram = esprima.parse(contents, {
			range: true,
			tolerant: true
		});
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
				var offset = selection.start;
				var completionKind = shouldVisit(root, offset);
				if (completionKind) {
					// need to use a copy of types since we make changes to it.
					var myTypes = new Types();
					visit(root, { 
						proposals: proposals, 
						offset: offset, 
						prefix: prefix, 
						allNames: {Math: "Math"}, 
						types:myTypes,
						contents:buffer,
						completionKind:completionKind
					}, proposalCollector, doInfer);
					proposals.sort(function(l,r) {
						if (l.description < r.description) {
							return -1;
						} else if (r.description < l.description) {
							return 1;
						} else {
							return 0;
						}
					});
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


	try {
		// --- registration logic for new content assist provider
		var provider = new eclipse.PluginProvider();
		provider.registerServiceProvider("orion.edit.contentAssist", proposalProvider, {
			contentType: ["text.javascript"],
			name: "Esprima based JavaScript content assist",
			id: "orion.edit.contentassist.esprima"
		});
		provider.connect();
	} catch (e) {
		if (inTest) {
			// testing outside of Orion...can ignore
		} else {
			throw (e);
		}
	}
	return proposalProvider;
};
window.onload = esprimaContentAssistant; 