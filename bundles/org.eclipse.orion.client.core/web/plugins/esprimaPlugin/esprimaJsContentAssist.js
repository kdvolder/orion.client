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
		this.Object = {
			// Urrrgh...can't use the real name here because would override the real methods of that name
			$$toString: "String",
			$$toLocaleString : "String",
			$$valueOf: "Object",
			$$hasOwnProperty: "boolean",
			$$isPrototypeOf: "boolean",
			$$propertyIsEnumerable: "boolean",
			
			$$args : {
				$$toString: [],
				$$toLocaleString: [],
				$$hasOwnProperty: ["property"],
				$$isPrototypeOf: ["object"],
				$$propertyIsEnumerable: ["property"]
			}
		};
		
		/**
		 * Properties common to all Strings - ECMA 262, section 15.5.4
		 */
		this.String = {
			charAt : "String",
			charCodeAt : "Number",
			concat : "String",
			indexOf : "Number",
			lastIndexOf : "Number",
			length : "Number",
			localeCompare : "Number",
			match : "Boolean",
			replace : "String",
			search : "String",
			slice : "String",
			split : "Array",  // Array of string
			substring : "String",
			toLocaleUpperCase : "String",
			toLowerCase : "String",
			toUpperCase : "String",
			trim : "String",
			$$args : {
				charAt : ["index"],
				charCodeAt : ["index"],
				concat : ["array"],
				indexOf : ["searchString"],
				lastIndexOf : ["searchString"],
				localeCompare : ["object"],
				match : ["regexp"],
				replace : ["searchValue", "replaceValue"],
				search : ["regexp"],
				slice : ["start", "end"],
				split : ["separator", "[limit]"],
				substring : ["start", "[end]"],
				toLowerCase : [],
				toUpperCase : [],
				toLocaleUpperCase : [],
				trim : []
			},
			"$$prototype" : "Object"
		};
		
		/**
		 * Properties common to all arrays.  may be incomplete
		 */
		this.Array = {
			length : "Number",
			sort : "Array",
			concat : "Array",
			slice : "Array",
			$$prototype : "Object",
			$$args : {
				sort : ["[sorter]"],
				concat : ["left", "right"],
				slice : ["start", "end"]
			}
		};
		
		/**
		 * Properties common to all dates.  may be incomplete
		 */
		this.Date = {
			getDay : "Number",
			getFullYear : "Number",
			getHours : "Number",
			getMinutes : "Number",
			setDay : null,
			setFullYear : null,
			setHours : null,
			setMinutes : null,
			setTime : null,
			$$prototype : "Object",
			$$args : {
				getDay : [],
				getFullYear : [],
				getHours : [],
				getMinutes : [],
				setDay : ["dayOfWeek"],
				setFullYear : ["year"],
				setHours : ["hour"],
				setMinutes : ["minute"],
				setTime : ["millis"]
			}
		};
		
		this.Boolean = {
			$$prototype : "Object",
			$$args : {}
		};
		
		this.Number = {
			toExponential : "Number",
			toFixed : "Number",
			toPrecision : "Number",
			// do we want to include NaN, MAX_VALUE, etc?	
		
			$$prototype : "Object",
			$$args : {
				toExponential : ["digits"],
				toFixed : ["digits"],
				toPrecision : ["digits"]
			}
		};
		
		// must refactor this part for the new format
//		this.Function = [
//			{name: "prototype", type:"Object"},
//			{name: "apply", args: ["func", "[args]"], type:"Object"},
//			{name: "arguments", type:"Arguments"},
//			{name: "bind", args: []},
//			{name: "call", args: ["func", "arg"], type:"Object"},
//			{name: "caller", type:"Function"},
//			{name: "length", type:"Number"},
//			{name: "name", type:"String"}
//		];
//		
//		
//		
//		
//		this.Arguments = [
//			{name: "prototype", type:"Object"},
//			{name: "callee", type:"Function"},
//			{name: "length", type:"Number"}
//		];
//		
//		this.RegExp = [
//			{name: "prototype", type:"Object"},
//			{name: "g", type:"Object"},
//			{name: "i", type:"Object"},
//			{name: "gi", type:"Object"},
//			{name: "m", type:"Object"},
//			{name: "exec", args:["str"], type:"Array"}, 
//			{name: "test", args:["str"], type:"Array"}
//		];
//		
//		this.Math = [
//			{name: "prototype", type:"Object"},
//		
//			// properties
//			{name: "E", type:"Number"},
//			{name: "LN2", type:"Number"},
//			{name: "LN10", type:"Number"},
//			{name: "LOG2E", type:"Number"},
//			{name: "LOG10E", type:"Number"},
//			{name: "PI", type:"Number"},
//			{name: "SQRT1_2", type:"Number"},
//			{name: "SQRT2", type:"Number"},
//			
//			// Methods
//			{name: "abs", args: ["val"], type:"Number"},
//			{name: "acos", args: ["val"], type:"Number"},
//			{name: "asin", args: ["val"], type:"Number"},
//			{name: "atan", args: ["val"], type:"Number"},
//			{name: "atan2", args: ["val1", "val2"], type:"Number"},
//			{name: "ceil", args: ["val"], type:"Number"},
//			{name: "cos", args: ["val"], type:"Number"},
//			{name: "exp", args: ["val"], type:"Number"},
//			{name: "floor", args: ["val"], type:"Number"},
//			{name: "log", args: ["val"], type:"Number"},
//			{name: "max", args: ["val1", "val2"], type:"Number"},
//			{name: "min", args: ["val1", "val2"], type:"Number"},
//			{name: "pow", args: ["x", "y"], type:"Number"},
//			{name: "random", args: [], type:"Number"},
//			{name: "round", args: ["val"], type:"Number"},
//			{name: "sin", args: ["val"], type:"Number"},
//			{name: "sqrt", args: ["val"], type:"Number"},
//			{name: "tan", args: ["val"], type:"Number"}		
//		];
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
							} else if (key === "properties") {
								// might be key-value pair of an object expression
								// don't visit the key since it doesn't have an sloc
								// and it is handle later by inferencing
								if (child[i].hasOwnProperty("key") && child[i].hasOwnProperty("value")) {
									children.push(child[i].key);
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
	 * This function takes the current AST node and does the first inferencing step for it.
	 * @param node the AST node to visit
	 * @param data the data for the visitor.  See computeProposals below for full description of contents
	 */
	function proposalCollector(node, data) {
		var type = node.type, currentType = data.currentType, types = data.types, 
				oftype, name, i, property, newTypeName;
		
		if (type === "BlockStatement" && !inRange(data.offset, node.range)) {
			// out of range
			return false;
		} else if (type === "VariableDeclaration" && isBefore(data.offset, node.range)) {
			// must do this check since "VariableDeclarator"s do not seem to have their range set correctly
			return false;
		}
		
		if (type === "Program" || type === "BlockStatement") {
			node.inferredType = data.newScope();
		} else if (type === 'Identifier') {
			name = node.name;
			if (types[currentType][name]) {
				// name already exists
				node.inferredType = types[currentType][name];
			} else {
				// If name doesn't already exist, then just add it to the current type.
				// FIXADE  Is this what we want?  Doing this here will add any otherwise unknown property 
				// to the list of known properties if it is referenced.  Probably OK, but this has the side effect
				// of also including any half-formed property that exists as a prefix to the content assist invocation.
				node.inferredType = "Object";
				types[currentType][name] = "Object";
			}
		} else if (type === "ExpressionStatement" || type === "ReturnStatement") {
			data.resetCurrentType();
		
		} else if (type === "NewExpression") {
			node.inferredType = node.callee.name;
		} else if (type === "Literal") {
			oftype = (typeof node.value);
			node.inferredType = oftype[0].toUpperCase() + oftype.substring(1, oftype.length);
		} else if (type === "ArrayExpression") {
			node.inferredType = "Array";
		} else if (type === "ObjectExpression") {
			// for object literals, create a new object type so that we can stuff new properties into it.
			// we might be able to do better by walking into the object and inferring each RHS of a 
			// key-value pair
			newTypeName = data.newObject();
			for (i = 0; i < node.properties.length; i++) {
				property = node.properties[i];
				// only remember if the property is an identifier
				if (property.key && property.key.name) {
					// FIXADE not correct, we should be inferring inside the object, 
					// but that is for later
					data.addOrSetVariable(property.key.name, "Object");
				}
			}
			node.inferredType = newTypeName;
		} else if (type === "BinaryExpression") {
			if (node.operator === "+" || node.operator === "-" || node.operator === "/" || 
					node.operator === "*") {
				// assume number for now
				// rules are really much more complicated
				node.inferredType = "Number";
			}
		} else if (type === "UpdsteExpression" || type === "UnaryExpression") {
			// assume number for now.  actual rules are much more complicated
			node.inferredType = "Number";
		} else if (type === "FunctionDeclaration") {
			data.resetCurrentType();

			var params = [];
			for (i = 0; i < node.params.length; i++) {
				params[i] = node.params[i].name;
			}
			data.addOrSetFunction(node.id.name, params, "Function");
		} else if (type === "VariableDeclarator" || type === "VariableDeclaration") {
			data.resetCurrentType();
		} else if (type === "ThisExpression") {
			node.inferredType = types[currentType]["this"];
//			node.currentType = node.inferredType;
		}
		return true;
	}
	
	/**
	 * called as the post operation for the proposalCollector visitor.
	 * Finishes off the inferencing and adds all proposals
	 */
	function proposalCollectorPostOp(node, data) {
		var type = node.type, name, params, res, plen, i, inferredType;
		
		if (type === "Program" || type === "BlockStatement") {
			data.popScope();
			
		} else if (type === "ExpressionStatement" || type === "ReturnStatement") {
			data.resetCurrentType();
			
		} if (type === "MemberExpression") {
			if (data.completionKind === "member" &&
					(inRange(data.offset, node.property.range) || afterDot(data.offset, node, data.contents))) {
				// completion on a property of a member expression
				// currentType is the inferred type of the object expression
				data.computeInferredProposals(node.object.inferredType);
			}
			node.inferredType = node.property.inferredType;
			data.currentType = node.inferredType;
			
		} else if (type === "CallExpression") {
			node.inferredType = node.callee.inferredType;
			data.currentType = node.inferredType;
		} else if (type === "ObjectExpression") {
			data.popScope();
		} else if (type === "FunctionDeclaration" && isAfter(data.offset, node.range) && 
				data.completionKind === "top") {
			// Add function proposal only if completion offset is after this function declaration
			name = node.id.name;
			params = node.params;
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
				plen = params.length;
				for (i = 0; i < plen; i++) {
					name = params[i].name;
					if (name.indexOf(data.prefix) === 0) {
						data.proposals.push({ proposal: name, description: name + " (parameter of " + node.id.name + ")"});
					}
				}
			}
			// can we do better than function?			
			node.inferredType = "Function";
			data.currentType = "Function";
			
		} else if (type === "VariableDeclarator") {
			if (isAfter(data.offset, node.range) && data.completionKind === "top") {
				// although legal to reference before being declared, don't include in list
				name = node.id.name;
				if (name.indexOf(data.prefix) === 0) {
					data.proposals.push({ proposal: node.id.name, description: node.id.name + " (variable)"});
				}
			}
			if (node.init) {
				inferredType = node.init.inferredType;
			} else {
				inferredType = "Object";
			}
			node.inferredType = inferredType;
			data.addOrSetVariable(node.id.name, inferredType);
			data.currentType = inferredType;

		} else if (type === "AssignmentExpression" && node.left.type === 'Identifier') {
			// only handle simple assignements, eg- x = y; and not x.y = z;
			// we can do better by walking the tree
			inferredType = node.right.inferredType;
			node.inferredType = inferredType;
			data.addOrSetVariable(node.left.name, inferredType);
			data.currentType = inferredType;
		}
		
		if (!node.inferredType) {
			node.inferredType = "Object";
		}
	}

	function parse(contents) {
		var parsedProgram = esprima.parse(contents, {
			range: true,
			tolerant: true
		});
		return parsedProgram;
	}

	/**
	 * Main entry point to provider
	 */
	var proposalProvider = {
		computeProposals: function(prefix, buffer, selection) {
			try {
				var root = parse(buffer);
				var completionKind = shouldVisit(root, selection.start);
				if (completionKind) {
					var data = {
						/** a counter used for creating unique names for object literals and scopes */
						typeCount : 0,
						/** an array of proposals generated */
						proposals: [], 
						/** the offset of content assist invocation */
						offset: selection.start, 
						/** the prefix of the invocation */
						prefix: prefix, 
						/** Each element is the type of the current scope, which is a key into the types array */
						typeStack: ["Object"],
						/** the type of the expression most recently evaluated */
						currentType: "Object",  // always points to the top of the type stack
						/** a map of all the types and their properties currently known */
						types:new Types(),
						/** the entire contents being completed on */
						contents:buffer,
						/** "member" or "top"  if Member, completion occurs after a dotted member expression.  if top, completion occurs as the start of a new expression */
						completionKind:completionKind,
						newName: function() {
							return "Object~"+ this.typeCount++;
						},
						/** Creates a new empty scope and returns the name */
						newScope: function() {
							var newScopeName = this.newName();
							this.types[newScopeName] = {
								$$prototype : this.currentType,
								$$args : {}
							};
							this.typeStack.push(newScopeName);
							this.currentType = newScopeName;
							// must add a new 'this' for use inside of the object
							this.addOrSetVariable("this", newScopeName);
							return newScopeName;
						},
						
						/** Creates a new empty object scope and returns the name */
						newObject: function() {
							var newObjectName = this.newName();
							this.types[newObjectName] = {
								$$prototype : "Object",
								$$args : {}
							};
							this.typeStack.push(newObjectName);
							this.currentType = newObjectName;
							// add a new 'this' for use inside of the object
							this.addOrSetVariable("this", newObjectName);
							return newObjectName;
						},
						
						/** removes the current scope */
						popScope: function() {
							var oldScope = this.typeStack.pop();
							this.currentType = this.typeStack[this.typeStack.length -1];
							// Can't delete old scope since it may have been assigned somewhere
							// but must remove "this" when outside of the scope
							this.addOrSetFunction("this", null);
							return oldScope;
						},
						
						resetCurrentType : function() {
							this.currentType = this.typeStack[this.typeStack.length -1];
							return this.currentType;
						},
						
						/** adds the name to the current type/scope */
						addOrSetVariable : function(name, type) {
							this.types[this.currentType][name] = type;
						},
						
						/** adds the name and args (array of strings) with the given return type to the current type */
						addOrSetFunction : function(name, args, type) {
							this.types[this.currentType][name] = type;
							this.types[this.currentType].$$args[name] = args;
						},
						
						/** looks up the name in the hierarchy */
						lookupName : function(name) {
							var innerLookup = function(name, type) {
								var res = type[name];
								if (res) {
									return res;
								} else {
									var proto = type.$$prototype;
									if (proto) {
										return innerLookup(name, proto);
									}
									return null;
								}
							};
							return innerLookup(name, this.currentType);
						},
						
						computeInferredProposals : function(currentType) {
							var prop, propName, proto, res, functionArgs, type = this.types[currentType];
							proto = type.$$prototype;
							
							for (prop in type) {
								if (type.hasOwnProperty(prop)) {
									if (prop === "$$prototype" || prop === "$$args") {
										continue;
									}
									if (!proto && prop.indexOf("$$") === 0) {
										// no prototype that means we must decode the property name
										propName = prop.substring(2);
									} else {
										propName = prop;
									}
									if (propName === "this" && this.completionKind === "member") {
										// don't show "this" proposals for non-top-level locations
										// (eg- this.this is wrong)
										continue;
									}
									if (propName.indexOf(this.prefix) === 0) {
										functionArgs = type.$$args[prop];
										if (functionArgs) {
											res = calculateFunctionProposal(propName, 
													functionArgs, data.offset - data.prefix.length);
											data.proposals.push({ 
												proposal: res.completion, 
												description: res.completion + " (function)", 
												positions: res.positions, 
												escapePosition: data.offset + res.completion.length 
											});
										} else {
											data.proposals.push({ 
												proposal: propName,
												description: propName + " (property)"
											});
										}
									}
								}
							}
							// walk up the prototype hierarchy
							if (proto) {
								this.computeInferredProposals(proto);
							}
						}
					};
					// need to use a copy of types since we make changes to it.
					visit(root, data, proposalCollector, proposalCollectorPostOp);
					data.proposals.sort(function(l,r) {
						if (l.description < r.description) {
							return -1;
						} else if (r.description < l.description) {
							return 1;
						} else {
							return 0;
						}
					});
					return data.proposals;
				} else {
					// invalid completion location
					return {};
				}
			} catch (e) {
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