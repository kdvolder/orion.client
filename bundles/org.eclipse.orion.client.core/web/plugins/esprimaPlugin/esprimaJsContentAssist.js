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

/*global define require eclipse esprima window console inTest localStorage*/
define("plugins/esprimaPlugin/esprimaJsContentAssist", ["plugins/esprimaPlugin/esprimaVisitor", "plugins/esprimaPlugin/types", "plugins/esprimaPlugin/esprima"], 
		function(mVisitor, mTypes) {

	/**
	 * finds the right-most segment of a dotted MemberExpression
	 * if it is an identifier, or null otherwise
	 */
	function findRightMost(node) {
		if (!node) {
			return null;
		}
		if (node.type === "Identifier") {
			return node;
		} else if (node.type === "MemberExpression") {
			return findRightMost(node.property);
		} else {
			return null;
		}
	}
	
	/**
	 * Convert an array of parameters into a string and also compute linked editing positions
	 * @param name name of the function
	 * @param type the type of the function using the following structure '?Type:arg1,arg2,...'
	 * @param offset offset
	 * @return { completion, positions }
	 */
	function calculateFunctionProposal(name, type, offset) {
		var paramsOffset = type.lastIndexOf(":"), paramsStr, params;
		paramsStr = paramsOffset > 0 ? type.substring(paramsOffset+1) : "";
		params = paramsStr.split(",");
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
			var argName;
			if (typeof params[p] === "string") {
				// need this because jslintworker.js augments the String prototype with a name() function
				// don't want confusion
				argName = params[p];
			} else if (params[p].name) {
				argName = params[p].name();
			} else {
				argName = params[p];
			}
			positions.push({offset:offset+completion.length+1, length: argName.length});
			completion += argName;
		}
		completion += ')';
		return {completion: completion, positions: positions};
	}
	
	/**
	 * checks that offset overlaps with the given range
	 * Since esprima ranges are zero-based, inclusive of 
	 * the first char and exclusive of the last char, must
	 * use a +1 at the end.
	 * eg- (^ is the line start)
	 *       ^x    ---> range[0,0]
	 *       ^  xx ---> range[2,3]
	 */
	function inRange(offset, range) {
		return range[0] <= offset && range[1]+1 >= offset;
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
		return offset > range[1];
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
		// check for broken AST
		var end;
		if (memberExpr.property) {
			end = memberExpr.property.range[0];
		} else {
			// no property expression, use the end of the memberExpr as the end to look at
			// in this case assume that the member expression ends just after the dot
			// this allows content assist invocations to work on the member expression when there
			// is no property
			end = memberExpr.range[1] + 2;
		}
		// we are not considered "afeter" the dot if the offset
		// overlaps with the property expression or if the offset is 
		// after the end of the member expression
		if (!inRange(offset, memberExpr.range) ||
			inRange(offset, memberExpr.object.range) ||
			offset > end) {
			return false;
		}
		
		var dotLoc = memberExpr.object.range[1];
		while (contents.charAt(dotLoc) !== "." && dotLoc < end) {
			dotLoc++;
		}
		
		if (contents.charAt(dotLoc) !== ".") {
			return false;
		}
		
		return dotLoc < offset;
	}
	
	/**
	 * @return "top" if we are at a start of a new expression fragment (eg- at an empty line, 
	 * or a new parameter).  "member" if we are after a dot in a member expression.  false otherwise
	 */
	function shouldVisit(root, offset, prefix, contents) {
		/**
		 * A visitor that finds the parent stack at the given location
		 * @param node the AST node being visited
		 * @param parents stack of parent nodes for the current node
		 * @param isInitialVisit true iff this is the first visit of the node, false if this is
		 *   the end visit of the node
		 */ 
		var findParent = function(node, parents, isInitialVisit) {
			// extras prop is where we stuff everything that we have added
			if (!node.extras) {
				node.extras = {};
			}
			
			if (!isInitialVisit) {
			
				// if we have reached the end of an inRange block expression then 
				// this means we are completing on an empty expression
				if (node.type === "Program" || (node.type === "BlockStatement") &&
						inRange(offset, node.range)) {
					throw "done";
				}
			
				parents.pop();
				// return value is ignored
				return false;
			}
			
			// the program node is always in range even if the range numbers do not line up
			if ((node.range && inRange(offset, node.range)) || node.type === "Program") {
				if (node.type === "Identifier") {
					throw "done";
				}
				parents.push(node);
				if ((node.type === "FunctionDeclaration" || node.type === "FunctionExpression") && 
						node.nody && isBefore(offset, node.body.range)) {
					// completion occurs on the word "function"
					throw "done";
				}
				// special case where we are completing immediately after a '.' 
				if (node.type === "MemberExpression" && !node.property && afterDot(offset, node, contents)) {
					throw "done";
				}
				return true;
			} else {
				return false;
			}
		};
		var parents = [];
		try {
			mVisitor.visit(root, parents, findParent, findParent);
		} catch (done) {
			if (done !== "done") {
				// a real error
				throw(done);
			}
		}

		if (parents && parents.length) {
			var parent = parents.pop();
			if (parent.type === "MemberExpression") {
				if (parent.property && inRange(offset, parent.property.range)) {
					// on the right hand side of a property, eg: foo.b^
					return "member";
				} else if (inRange(offset, parent.range) && afterDot(offset, parent, contents)) {
					// on the right hand side of a dot with no text after, eg: foo.^
					return "member";
				}
			} else if (parent.type === "Program" || parent.type === "BlockStatement") {
				// completion at a new expression
				if (!prefix) {
				}
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
	 * finds the final return statement of a function declaration
	 * @param node an ast statement node
	 * @return the lexically last ReturnStatment AST node if there is one, else
	 * null if there is no return statement
	 */
	function findReturn(node) {
		if (!node) {
			return null;
		}
		var type = node.type, maybe, i, last;
		// since we are finding the last return statement, start from the end
		switch(type) {
		case "BlockStatement":
			if (node.body && node.body.length > 0) {
				last = node.body[node.body.length-1];
				if (last.type === "ReturnStatement") {
					return last;
				} else {
					return findReturn(last);
				}
			}
			return null;
		case "WhileStatement": 
		case "DoWhileStatement":
		case "ForStatement":
		case "ForInStatement":
		case "CatchClause":
			
			return findReturn(node.body);
		case "IfStatement":
			maybe = findReturn(node.alternate);
			if (!maybe) {
				maybe = findReturn(node.consequent);
			}
			return maybe;
		case "TryStatement":
			maybe = findReturn(node.finalizer);
			var handlers = node.handlers;
			if (!maybe && handlers) {
				// start from the last handler
				for (i = handlers.length-1; i >= 0; i--) {
					maybe = findReturn(handlers[i]);
					if (maybe) {
						break;
					}
				}
			}
			if (!maybe) {
				maybe = findReturn(node.block);
			}
			return maybe;
		case "SwitchStatement":
			var cases = node.cases;
			if (cases) {
				// start from the last handler
				for (i = cases.length-1; i >= 0; i--) {
					maybe = findReturn(cases[i]);
					if (maybe) {
						break;
					}
				}
			}
			return maybe;
		case "SwitchCase":
			if (node.consequent && node.consequent.length > 0) {
				last = node.consequent[node.consequent.length-1];
				if (last.type === "ReturnStatement") {
					return last;
				} else {
					return findReturn(last);
				}
			}
			return null;
			
		case "ReturnStatement":
			return node;
		default:
			// don't visit nested functions
			// expression statements, variable declarations,
			// or any other kind of node
			return null;
		} 
	}
	
	/**
	 * updates a function type to include a new return type.
	 * function types are specified like this: ?returnType:[arg-n...]
	 * return type is the name of the return type, arg-n is the name of
	 * the nth argument.
	 */
	function updateReturnType(originalFunctionType, newReturnType) {
		if (! originalFunctionType || originalFunctionType.charAt(0) !== "?") {
			// not a valid function type
			return newReturnType;
		}
		
		var end = originalFunctionType.lastIndexOf(":");
		if (!end) {
			// not a valid function type
			return newReturnType;
		}
		return "?" + newReturnType + originalFunctionType.substring(end);
	}
	/**
	 * checks to see if this file looks like an AMD module
	 * Assumes that there are one or more calls to define at the top level
	 * and the first statement is a define call
	 * @return true iff there is a top-level call to 'define'
	 */
	function checkForAMD(node) {
		var body = node.body;
		if (body && body.length >= 1 && body[0]) {
			if (body[0].type === "ExpressionStatement" && 
				body[0].expression &&
				body[0].expression.type === "CallExpression" && 
				body[0].expression.callee.name === "define") {
				
				// found it.
				return body[0].expression;
			}
		}
		return null;
	}
	/**
	 * checks to see if this file looks like a wrapped commonjs module
	 * Assumes that there are one or more calls to define at the top level
	 * and the first statement is a define call
	 * @return true iff there is a top-level call to 'define'
	 */
	function checkForCommonjs(node) {
		var body = node.body;
		if (body && body.length >= 1) {
			for (var i = 0; i < body.length; i++) {
				if (body[i] && 
					body[i].type === "ExpressionStatement" && 
					body[i].expression &&
					body[i].expression.type === "CallExpression" && 
					body[i].expression.callee.name === "define") {
					
					var callee = body[i].expression;
					if (callee["arguments"] && 
						callee["arguments"].length === 1 && 
						callee["arguments"][0].type === "FunctionExpression" &&
						callee["arguments"][0].params.length === 3) {
						
						var params = callee["arguments"][0].params;
						if (params[0].name === "require" &&
							params[1].name === "exports" &&
							params[2].name === "module") {

							// found it.
							return body[i].expression;
						}
					}
				}
			}
		}
		return null;
	}
	
	/**
	 * if this method call ast node is a call to require with a single string constant 
	 * argument, then look that constant up in the indexer to get a summary
	 * if a summary is found, then apply it to the current scope
	 */
	function extractRequireModule(call, env) {
		if (!env.indexer) {
			return;	
		}
		if (call.type === "CallExpression" && call.callee.type === "Identifier" && 
			call.callee.name === "require" && call["arguments"].length === 1) {
		
			var arg = call["arguments"][0];
			if (arg.type === "Literal" && typeof arg.value === "string") {
				// we're in business
				var summary = env.indexer.retrieveSummary(arg.value);
				if (summary) {
					var typeName;
					var mergeTypeName;
					if (typeof summary.provided === "string") {
						typeName = summary.provided;
						mergeTypeName = env.scope();
					} else {
						// module provides a composite type
						// must create a type to add the summary to
						mergeTypeName = typeName = env.newScope();
						env.popScope();
					}
					env.mergeSummary(summary, mergeTypeName);
					return typeName;
				}
			}
		}
		
		return;
	}
	
	/**
	 * if the type passed in is a function type, extracts the return type
	 * otherwise returns as is
	 */
	function extractReturnType(fnType) {
		if (fnType.charAt(0) === '?') {
			var typeEnd = fnType.lastIndexOf(':');
			typeEnd = typeEnd >0 ? typeEnd : fnType.length;
			fnType = fnType.substring(1,typeEnd);
		}
		return fnType;	
	}
	
	/**
	 * checks to see if this function is a module definition
	 * and if so returns an array of module definitions
	 * 
	 * if this is not a module definition, then just return an array of Object for each type
	 */
	function findModuleDefinitions(fnode, env) {
		var paramTypes = [], params = fnode.params, i;
		if (params.length > 0) {
			if (!fnode.extras) {
				fnode.extras = {};
			}
			if (env.indexer && fnode.extras.amdDefn) {
				var args = fnode.extras.amdDefn["arguments"]; 
				// the function definition must be the last argument of the call to define or require
				if (args.length > 1 && args[args.length-1] === fnode) {
					// the module names could be the first or second argument
					var moduleNames = null;
					if (args.length === 3 && args[0].type === "Literal" && args[1].type === "ArrayExpression") {
						moduleNames = args[1].elements;
					} else if (args.length === 2 && args[0].type === "ArrayExpression") {
						moduleNames = args[0].elements;
					}
					if (moduleNames) {
						for (i = 0; i < params.length; i++) {
							if (i < moduleNames.length && moduleNames[i].type === "Literal") {
								// resolve the module name from the indexer
								var summary = env.indexer.retrieveSummary(moduleNames[i].value);
								if (summary) {
									var typeName;
									var mergeTypeName;
									if (typeof summary.provided === "string") {
										typeName = summary.provided;
										mergeTypeName = env.scope();
									} else {
										// module provides a composite type
										// must create a type to add the summary to
										mergeTypeName = typeName = env.newScope();
										env.popScope();
									}
									env.mergeSummary(summary, mergeTypeName);
									paramTypes.push(typeName);
								} else {
									paramTypes.push(env.newFleetingObject());
								}
							} else {
								paramTypes.push("Object");
							}
						}
					}
				}
			}
		}
		if (paramTypes.length === 0) {
			for (i = 0; i < params.length; i++) {
				paramTypes.push(env.newFleetingObject());
			}
		}
		return paramTypes;
	}

	/**
	 * This function takes the current AST node and does the first inferencing step for it.
	 * @param node the AST node to visit
	 * @param env the context for the visitor.  See computeProposals below for full description of contents
	 */
	function inferencer(node, env) {
		var type = node.type, oftype, name, i, property, params, newTypeName;
		
		// extras prop is where we stuff everything that we have added
		if (!node.extras) {
			node.extras = {};
		}

		
		// FIXADE Do we still want to do this?
		if (type === "VariableDeclaration" && isBefore(env.offset, node.range)) {
			// must do this check since "VariableDeclarator"s do not have their range set correctly in the version of esprima being used now
			return false;
		}
		
		switch(type) {
		case "Program":
			// check for module kind
			env.commonjsModule = checkForCommonjs(node);
			if (!env.commonjsModule) {
				// can't be both amd and commonjs
				env.amdModule = checkForAMD(node);
			}
			break;
		case "BlockStatement":
			node.extras.inferredType = env.newScope();
			break;
		case "Literal":
			oftype = (typeof node.value);
			node.extras.inferredType = oftype[0].toUpperCase() + oftype.substring(1, oftype.length);
			break;
		case "ArrayExpression":
			node.extras.inferredType = "Array";
			break;
		case "ObjectExpression":
			// for object literals, create a new object type so that we can stuff new properties into it.
			// we might be able to do better by walking into the object and inferring each RHS of a 
			// key-value pair
			newTypeName = env.newObject(null, node.range);
			node.extras.inferredType = newTypeName;
			for (i = 0; i < node.properties.length; i++) {
				property = node.properties[i];
				// only remember if the property is an identifier
				if (property.key && property.key.name) {
					// first just add as an object property.
					// after finishing the ObjectExpression, go and update 
					// all of the variables to reflect their final inferred type
					// FIXADE should we use a generated type instead of Object?
					env.addVariable(property.key.name, node, "Object", property.key.range);
					if (!property.key.extras) {
						property.key.extras = {};
					}
					// remember that this is the LHS so that we don't add the identifier to global scope
					property.key.extras.isLHS = true;
					
					if (property.value.type === "FunctionExpression") {
						if (!property.value.extras) {
							property.value.extras = {};
						}
						// RHS is a function, remember the name in case it is a constructor
						property.value.extras.fname = property.key.name;
					}
				}
			}
			break;
		case "FunctionDeclaration":
		case "FunctionExpression":
			
			var nameRange;
			if (node.id) {
				// true for function declarations
				name = node.id.name;
				nameRange = node.id.range;
			} else if (node.extras.fname) {
				// true for rhs of assignment to function expression
				name = node.extras.fname;
				nameRange = node.range;
			}
			params = [];
			if (node.params) {
				for (i = 0; i < node.params.length; i++) {
					params[i] = node.params[i].name;
				}
			}
			
			// assume that function name that starts with capital is 
			// a constructor
			var isConstuctor;
			if (name && node.body && name.charAt(0) === name.charAt(0).toUpperCase()) {
				// create new object so that there is a custom "this"
				newTypeName = env.newObject(name, node.range);
				isConstuctor = true;
			} else {
				// temporarily use "Object" as type, but this may change once we 
				// walk through to get to a return statement
				newTypeName = "Object";
				isConstuctor = false;
			}
			if (!node.body.extras) {
				node.body.extras = {};
			}
			node.body.extras.isConstructor = isConstuctor;
			var functionTypeName = "?" + newTypeName + ":" + params;
			if (isConstuctor) {
				env.createConstructor(functionTypeName, newTypeName);
			}

			node.extras.inferredType = functionTypeName;
			
			if (name && !isBefore(env.offset, node.range)) {
				// if we have a name, then add it to the scope
				env.addVariable(name, node.extras.target, functionTypeName, nameRange);
			}
			
			// now add the scope for inside the function
			env.newScope();
			env.addVariable("arguments", node.extras.target, "Arguments", node.range);

			// add parameters to the current scope
			if (params.length > 0) {
				var moduleDefs = findModuleDefinitions(node, env);
				for (i = 0; i < params.length; i++) {
					env.addVariable(params[i], node.extras.target, moduleDefs[i], node.params[i].range);
				}	
			}
			break;
		case "VariableDeclarator":
			if (node.id.name) {
				// remember that the identifier is an LHS
				// so, don't create a type for it
				if (!node.id.extras) {
					node.id.extras = {};
				}
				node.id.extras.isLHS = true;
				if (node.init && node.init.type === "FunctionExpression") {
					if (!node.init.extras) {
						node.init.extras = {};
					}
					// RHS is a function, remember the name in case it is a constructor
					node.init.extras.fname = node.id.name;
					node.init.extras.fnameRange = node.id.range;
				}
			}
			break;
		case "AssignmentExpression":
			if (node.left.type === "Identifier" && node.right.type === "FunctionExpression") {
				// RHS is a function, remember the name in case it is a constructor
				if (!node.right.extras) {
					node.right.extras = {};
				}
				node.right.extras.fname = node.left.name;
				node.right.extras.fnameRange = node.left.range;
			}
			break;
		case "CatchClause":
			// create a new scope for the catch parameter
			node.extras.inferredType = env.newScope();
			if (node.param) {	
				if (!node.param.extras) {
					node.param.extras = {};
				}
				node.param.extras.inferredType = "Error";
				env.addVariable(node.param.name, node.extras.target, "Error", node.param.range);
			}
			break;
		case "MemberExpression":
			if (node.property) {
				// keep track of the target of the property expression
				// so that its type can be used as the seed for finding properties
				if (!node.property.extras) {
					node.property.extras = {};
				}
				node.property.extras.target = node.object;
			}
			break;
		case "CallExpression":
			if (node.callee.name === "define" || node.callee.name === "require") {
				// check for AMD definition
				var args = node["arguments"];
				if (args.length > 1 && 
					args[args.length-1].type === "FunctionExpression" &&
					args[args.length-2].type === "ArrayExpression") {
					
					// assume definition
					if (!args[args.length-1].extras) {
						args[args.length-1].extras = {};
					}
					args[args.length-1].extras.amdDefn = node;
				}
			}
			break;
		}
		return true;
	}
	
	/**
	 * called as the post operation for the proposalGenerator visitor.
	 * Finishes off the inferencing and adds all proposals
	 */
	function inferencerPostOp(node, env) {
		var type = node.type, name, inferredType, newTypeName, rightMost, kvps, i;
		
		switch(type) {
		case "Program":
			// if we've gotten here and we are still in range, then 
			// we are completing as a top-level entity with no prefix
			env.shortcutVisit();
			break;
		case "BlockStatement":
		case "CatchClause":
			if (inRange(env.offset, node.range)) {
				// if we've gotten here and we are still in range, then 
				// we are completing as a top-level entity with no prefix
				env.shortcutVisit();
			}
		
			env.popScope();
			break;
		case "MemberExpression":
			if (afterDot(env.offset, node, env.contents)) {
				// completion after a dot with no prefix
				env.shortcutVisit(env.scope(node.object));
			}
			// inferred type is the type of the property expression
			// node.propery will be null for mal-formed asts
			node.extras.inferredType = node.property ? node.property.extras.inferredType : node.object.extras.inferredType;
			break;
		case "CallExpression":
			// first check to see if this is a require call
			var fnType = extractRequireModule(node, env);
			
			// otherwise, apply the function
			if (!fnType) {
				fnType = node.callee.extras.inferredType;
				fnType = extractReturnType(fnType);
			}
			node.extras.inferredType = fnType;
			break;
		case "NewExpression":
			// FIXADE we have a problem here.
			// constructors that are called like this: new foo.Bar()  should have an inferred type of foo.Bar,
			// This ensures that another constructor new baz.Bar() doesn't conflict.  However, 
			// we are only taking the final prefix and assuming that it is unique.
			node.extras.inferredType = extractReturnType(node.callee.extras.inferredType);
			break;
		case "ObjectExpression":
			// now that we know all the types of the values, use that to populate the types of the keys
			// FIXADE esprima has changed the way it does key-value pairs,  Should do it differently here
			kvps = node.properties;
			for (i = 0; i < kvps.length; i++) {
				if (kvps[i].hasOwnProperty("key")) {
					// only do this for keys that are identifiers
					// set the proper inferred type for the key node
					// and also update the variable
					name = kvps[i].key.name;
					if (name) {
						inferredType = kvps[i].value.extras.inferredType;
						kvps[i].key.extras.inferredType = inferredType;
						env.addVariable(name, node, inferredType, kvps[i].key.range);
					}
				}
			}
			env.popScope();
			break;
		case "LogicalExpression":
		case "BinaryExpression":
			switch (node.operator) {
				case '+':
					// special case: if either side is a string, then result is a string
					if (node.left.extras.inferredType === "String" ||
						node.right.extras.inferredType === "String") {
						
						node.extras.inferredType = "String";
					} else {
						node.extras.inferredType = "Number";
					}
					break;
				case '-':
				case '/':
				case '*':
				case '%':
				case '&':
				case '|':
				case '^':
				case '<<':
				case '>>':
				case '>>>':
					// Numeric and bitwise operations always return a number
					node.extras.inferredType = "Number";
					break;
				case '&&':
				case '||':
					// will be the type of the left OR the right
					// for now arbitrarily choose the left
					node.extras.inferredType = node.left.extras.inferredType;
					break;
					
				case '!==':
				case '!=':
				case '===':
				case '==':
				case '<':
				case '<=':
				case '>':
				case '>=':
					node.extras.inferredType = "Boolean";
					break;
				
				
				default:
					node.extras.inferredType = "Object";
			}
			break;
		case "UpdateExpression":
		case "UnaryExpression":
			if (node.operator === '!') {
				node.extras.inferredType = "Boolean";
			} else {
				// includes all unary operations and update operations
				// ++ -- - and ~
				node.extras.inferredType = "Number";
			}
			break;
		case "FunctionDeclaration":
		case "FunctionExpression":
			env.popScope();
			if (node.body) {
				var fnameRange;
				if (node.body.extras.isConstructor) {
					if (node.id) {
						fnameRange = node.id.range;
					} else {
						fnameRange = node.range;
					}
					
					// an extra scope was created for the implicit 'this'
					env.popScope();

					// now add a reference to the constructor
					env.addOrSetVariable(extractReturnType(node.extras.inferredType), node.extras.target, node.extras.inferredType, fnameRange);
				} else {
					// a regular function.  try updating to a more explicit return type
					var returnStatement = findReturn(node.body);
					if (returnStatement) {
						node.extras.inferredType = updateReturnType(node.extras.inferredType, returnStatement.extras.inferredType);
						// if there is a name, then update that as well
						var fname;
						if (node.id) {
							// true for function declarations
							fname = node.id.name;
							fnameRange = node.id.range;
						} else if (node.extras.fname) {
							// true for rhs of assignment to function expression
							fname = node.extras.fname;
							fnameRange = node.extras.fnameRange;
						}
						if (fname) {
							env.addOrSetVariable(fname, node.extras.target, node.extras.inferredType, fnameRange);
						}				
					}
				}
			}
			break;
		case "VariableDeclarator":
			if (node.init) {
				inferredType = node.init.extras.inferredType;
			} else {
				inferredType = "Object";
			}
			node.extras.inferredType = inferredType;
			node.id.extras.inferredType = inferredType;
			env.addVariable(node.id.name, node.extras.target, inferredType, node.id.range);
			break;
		case "AssignmentExpression":
			if (node.operator === '=') {
				// standard assignment
				inferredType = node.right.extras.inferredType;
			} else {
				// +=, -=, *=, /=, >>=, <<=, >>>=, &=, |=, or ^=.
				if (node.operator === '+=' && node.left.extras.inferredType === 'String') {
					inferredType = "String";	
				} else {
					inferredType = "Number";
				}
			}
			node.extras.inferredType = inferredType;
			// when we have 'this.that.theOther.f' need to find the right-most identifier
			rightMost = findRightMost(node.left);
			if (rightMost) {
				rightMost.extras.inferredType = inferredType;
				env.addOrSetVariable(rightMost.name, rightMost.extras.target, inferredType, rightMost.range);
			}
			break;
		case 'Identifier':
			if (inRange(env.offset, node.range)) {
				// We're finished compute all the proposals
				env.shortcutVisit(env.scope(node.extras.target));
			}
			
			name = node.name;
			newTypeName = env.lookupName(name, node.extras.target);
			if (newTypeName) {
				// name already exists
				node.extras.inferredType = newTypeName;1
			} else if (!node.extras.target && !node.extras.isLHS && isAfter(env.offset, node.range)) {
				// If name doesn't already exist, then create a new object for it
				// and use that as the inferred type 
				// only want to do this when accessing an unknown identifier.
				// Should not be LHS of an assisgnment or variable declarator
				// will be added to global scope
				// Also, only add the variable if offset is after node range
				// we don't want variables used after the fact appearing in content assist
				node.extras.inferredType = env.addOrSetVariable(name, 
					// FIXADE find a better way to get the global scope
					{ extras : { inferredType : "Global" } }, null, node.range);
			}
			break;
		case "ThisExpression":
			node.extras.inferredType = env.lookupName("this");
			break;
		case "ReturnStatement":
			if (node.argument) {
				node.extras.inferredType = node.argument.extras.inferredType;
			}
			break;
		}
		
		if (!node.extras.inferredType) {
			node.extras.inferredType = "Object";
		}
	}

	
	/**
	 * add variable names from inside a jslint global directive
	 */
	function addJSLintGlobals(root, env) {
		if (root.comments) {
			for (var i = 0; i < root.comments.length; i++) {
				var range = root.comments[i].range;
				
				
				if (root.comments[i].type === "Block" && root.comments[i].value.substring(0, "global".length) === "global") {
					var globals = root.comments[i].value;
					var splits = globals.split(/\s+/);
					for (var j = 1; j < splits.length; j++) {
						if (splits[j].length > 0) {
							env.addOrSetVariable(splits[j], null, null, range);
						}
					}
					break;
				}
			}
		}
	}
	
	/**
	 * Adds global variables defined in dependencies
	 */
	function addIndexedGlobals(env) {
		// no indexer means that we should not consult indexes for extra type information
		if (env.indexer) {
			// get the list of summaries relevant for this file
			// add it to the global scope
			var summaries = env.indexer.retrieveGlobalSummaries();
			for (var fileName in summaries) {
				if (summaries.hasOwnProperty(fileName)) {
					env.mergeSummary(summaries[fileName], "Global");
				}
			}
		} 
	}
	
	/**
	 * the prefix of a completion should not be included in the completion itself
	 * must explicitly remove it
	 */
	function removePrefix(prefix, string) {
		return string.substring(prefix.length);
	}
	
	/**
	 * creates a human readable type name from the name given
	 */
	function createReadableType(typeName, env, useFunctionSig, depth) {
		if (typeName.charAt(0) === "?") {
			// a function
			var nameEnd = typeName.lastIndexOf(":");
			if (nameEnd === -1) {
				nameEnd = typeName.length;
			}
			var funType = typeName.substring(1, nameEnd);
			if (useFunctionSig) {
				// convert into a function signature
				var args = typeName.substring(nameEnd+1, typeName.length);
				return "(" + args + ") -> " + createReadableType(funType, env, useFunctionSig, 1);
			} else {
				// use the return type
				return createReadableType(funType, env, useFunctionSig, 0);
			}
		} else if (typeName.indexOf("gen~") === 0) {
			// a generated object
			// create a summary
			var type = env.findType(typeName);
			var res = "{ ";
			for (var val in type) {
				if (type.hasOwnProperty(val) && val !== "$$proto") {
					if (res.length > 2) {
						res += ", ";
					}
					var name;
					// don't show inner objects
					if (!depth) {
						name = createReadableType(type[val].typeName, env, false, 1);
					} else {
						name = "{...}";
					}
					res += val + " : " + name;
				}
			}
			return res + " }";
		} else {
			return typeName;
		}
	}

	
	/**
	 * Creates the environment object that stores type information
	 * Called differently depending on what job this content assistant is being called to do.
	 */
	function createEnvironment(buffer, uid, offset, indexer) {
		if (!offset) {
			offset = buffer.length+1;
		}
		// prefix for generating local types
		// need to add a unique id for each file so that types defined in dependencies don't clash with types
		// defined locally
		var namePrefix = "gen~" + uid + "~";

		return {
			/** Each element is the type of the current scope, which is a key into the types array */
			_scopeStack : ["Global"],
			/** 
			 * a map of all the types and their properties currently known 
			 * when an indexer exists, local storage will be checked for extra type information
			 */
			_allTypes : new mTypes.Types(),
			/** a counter used for creating unique names for object literals and scopes */
			_typeCount : 0,
			/** if this is an AMD module, then the value of this property is the 'define' call expression */
			amdModule : null,	
			/** if this is a wrapped commonjs module, then the value of this property is the 'define' call expression */
			commonjsModule : null,	
			/** the indexer for thie content assist invocation.  Used to track down dependencies */
			indexer: indexer,
			/** the offset of content assist invocation */
			offset : offset, 
			/** the entire contents being completed on */
			contents : buffer,
			newName: function() {
				return namePrefix + this._typeCount++;
			},
			/** 
			 * Creates a new empty scope and returns the name of the scope
			 * must call this.popScope() when finished with this scope
			 */
			newScope: function(range) {
				// the prototype is always the currently top level scope
				var targetType = this.scope();
				var newScopeName = this.newName();
				this._allTypes[newScopeName] = {
					$$proto : new mTypes.Definition(targetType, range)
				};
				this._scopeStack.push(newScopeName);
				return newScopeName;
			},
			
			/**
			 * Creates a new empty object scope and returns the name of this object 
			 * must call this.popScope() when finished
			 */
			newObject: function(newObjectName, range) {
				// object needs its own scope
				this.newScope();
				// if no name passed in, create a new one
				newObjectName = newObjectName? newObjectName : this.newName();
				// assume that objects have their own "this" object
				// prototype of Object
				this._allTypes[newObjectName] = {
					$$proto : new mTypes.Definition("Object", range)
				};
				this.addVariable("this", null, newObjectName, range);
				
				return newObjectName;
			},
			
			/**
			 * like a call to this.newObject(), but the 
			 * object created has not scope added to the scope stack
			 */
			newFleetingObject : function(name, range) {
				var newObjectName = name ? name : this.newName();
				this._allTypes[newObjectName] = {
					$$proto : new mTypes.Definition("Object", range)
				};
				return newObjectName;
			},
			
			/** removes the current scope */
			popScope: function() {
				// Can't delete old scope since it may have been assigned somewhere
				// but must remove "this" when outside of the scope
				this.removeVariable("this");
				var oldScope = this._scopeStack.pop();
				return oldScope;
			},
			
			/**
			 * returns the type name for the current scope
			 * if a target is passed in (optional), then use the
			 * inferred type of the target instead (if it exists)
			 */
			scope : function(target) {
				if (target && target.extras.inferredType) {
					// check for function literal
					var inferredType = target.extras.inferredType;
					// hmmmm... will be a problem here if there are nested ~protos
					if (inferredType.charAt(0) === '?' && inferredType.indexOf("~proto") === -1) {
						var noArgsType = inferredType.substring(0, inferredType.lastIndexOf(':')+1);
						if (this._allTypes[noArgsType]) {
							return noArgsType;
						} else {
							return "Function";
						}
					} else {
						return inferredType;
					}
				} else {
					// grab topmost scope
					return this._scopeStack[this._scopeStack.length -1];
				}
			},
			
			/** 
			 * adds the name to the target type.
			 * if target is passed in then use the type corresponding to 
			 * the target, otherwise use the current scope
			 */
			addVariable : function(name, target, typeName, range) {
				var type = this._allTypes[this.scope(target)];
				// do not allow augmenting built in types
				if (!type.$$isBuiltin) {
					type[name] = new mTypes.Definition(typeName ? typeName : "Object", range);
				}
			},
			
			/** removes the variable from the current type */
			removeVariable : function(name, target) {
				// do not allow deleting properties of built in types
				var type = this._allTypes[this.scope(target)];
				if (!type.$$isBuiltin) {
					delete [name];
				}
			},
			
			/** 
			 * like add variable, but first checks the prototype hierarchy
			 * if exists in prototype hierarchy, then replace the type
			 */
			addOrSetVariable : function(name, target, typeName, range) {
				if (name === 'prototype') {
					name = '$$proto';
				}
				var targetType = this.scope(target);
				var current = this._allTypes[targetType], found = false;
				// if no type provided, create a new type
				typeName = typeName ? typeName : this.newFleetingObject();
				while (current) {
					if (current[name]) {
						// found it, just overwrite
						// do not allow overwriting of built in types
						if (!current.$$isBuiltin) {
							current[name].typeName = typeName;
						}
						found = true;
						break;
					} else if (current.$$proto) {
						current = this._allTypes[current.$$proto.typeName];
					} else {
						current = null;
					}
				}
				
				if (!found) {
					// not found, so just add to current scope
					// do not allow overwriting of built in types
					var type = this._allTypes[targetType];
					if (!type.$$isBuiltin) {
						type[name] = new mTypes.Definition(typeName, range);
					}
				}
				return typeName;
			},
						
			/** looks up the name in the hierarchy */
			lookupName : function(name, target, applyFunction, includeDefinition) {
			
				// translate function names on object into safe names
				var swapper = function(name) {
					switch (name) {
						case "prototype":
							return "$$proto";
						case "toString":
						case "hasOwnProperty":
						case "toLocaleString":
						case "valueOf":
						case "isProtoTypeOf":
						case "propertyIsEnumerable":
							return "$_$" + name;
						default:
							return name;
					}
				};
			
				var innerLookup = function(name, type, allTypes) {
					var res = type[name];
					
					var proto = type.$$proto;
					if (res) {
						return includeDefinition ? res : res.typeName;
					} else if (proto) {
						return innerLookup(name, allTypes[proto.typeName], allTypes);
					} else {
						return null;
					}
				};
				var targetType = this._allTypes[this.scope(target)];
				var res = innerLookup(swapper(name), targetType, this._allTypes);
				return res;
			},
			
			/**
			 * adds a file summary to this module
			 */
			mergeSummary : function(summary, targetTypeName) {
			
				// add the extra types that don't already exists
				for (var type in summary.types) {
					if (summary.types.hasOwnProperty(type) && !this._allTypes[type]) {
						this._allTypes[type] = summary.types[type];
					}
				}
				
				// now augment the target type with the provided properties
				var targetType = this._allTypes[targetTypeName];
				for (var providedProperty in summary.provided) {
					if (summary.provided.hasOwnProperty(providedProperty)) {
						// the targetType may already have the providedProperty defined
						// but should override
						targetType[providedProperty] = summary.provided[providedProperty];
					}
				}
			},
			
			/**
			 * takes the name of a constructor and converts it into a type.
			 * We need to ensure that ConstructorName.prototype = { ... } does the
			 * thing that we expect.  This is why we set the $$proto property of the types
			 */
			createConstructor : function(constructorName, rawTypeName) {
				// don't include the parameter names since we don't want them confusing things when exported
				constructorName = constructorName.substring(0,constructorName.lastIndexOf(":")+1);
				this.newFleetingObject(constructorName);
				var flobj = this.newFleetingObject(constructorName + "~proto");
				this._allTypes[constructorName].$$proto = new mTypes.Definition(flobj);
				this._allTypes[rawTypeName].$$proto = new mTypes.Definition(constructorName);
			},
			
			findType : function(typeName) {
				// trim arguments if a constructor, carefyl to avoid a cosnstructor prototypes
				if (typeName.charAt(0) === '?' && typeName.indexOf("~proto") === -1) {
					typeName = typeName.substring(0, typeName.lastIndexOf(':')+1);
				}
				return this._allTypes[typeName];
			},
			
			getAllTypes : function() {
				return this._allTypes;
			},
			
			/**
			 * call this function to end the visit
			 * all visits end with calling this method
			 */
			shortcutVisit : function(targetType) {
				if (!targetType) {
					targetType = this.scope();
				}
				throw targetType;
			}
		};
	}
	
	
	function createProposals(targetTypeName, env, completionKind, prefix, replaceStart, proposals) {
		var prop, propName, propType, res, type = env.findType(targetTypeName), proto = type.$$proto;
		// start at the top of the prototype hierarchy so that duplicates can be removed
		if (proto) {
			createProposals(proto.typeName, env, completionKind, prefix, replaceStart, proposals);
		}

		for (prop in type) {
			if (type.hasOwnProperty(prop)) {
				if (prop.charAt(0) === "$" && prop.charAt(1) === "$") {
					// special property
					continue;
				}
				if (!proto && prop.indexOf("$_$") === 0) {
					// no prototype that means we must decode the property name
					propName = prop.substring(3);
				} else {
					propName = prop;
				}
				if (propName === "this" && completionKind === "member") {
					// don't show "this" proposals for non-top-level locations
					// (eg- this.this is wrong)
					continue;
				}
				if (propName.indexOf(prefix) === 0) {
					propType = type[prop].typeName;
					if (propType.charAt(0) === '?') {
						// we have a function
						res = calculateFunctionProposal(propName, 
								propType, replaceStart - 1);
						proposals["$"+propName] = { 
							proposal: removePrefix(prefix, res.completion), 
							description: res.completion + " : " + createReadableType(propType, env), 
							positions: res.positions, 
							escapePosition: replaceStart + res.completion.length 
						};
					} else {
						proposals["$"+propName] = { 
							proposal: removePrefix(prefix, propName),
							description: propName + " : " + createReadableType(propType, env)
						};
					}
				}
			}
		}
	}
	
	function findUnreachable(currentTypeName, allTypes, alreadySeen) {
		var currentType = allTypes[currentTypeName];
		if (currentType) {
			for(var prop in currentType) {
				if (currentType.hasOwnProperty(prop) && prop !== '$$isBuiltin' ) {
					var propType = currentType[prop].typeName;
					while (propType.charAt(0) === '?') {
						if (!alreadySeen[propType]) {
							alreadySeen[propType] = true;
							findUnreachable(propType, allTypes, alreadySeen);
						}
						propType = extractReturnType(propType);					
					}
					if (!alreadySeen[propType]) {
						alreadySeen[propType] = true;
						findUnreachable(propType, allTypes, alreadySeen);
					}
				}
			}
		}
	}
	
	/**
	 * filters types from the environment that should not be exported
	 */
	function filterTypes(environment, kind, moduleTypeName) {
		var allTypes = environment.getAllTypes();
		if (kind === "global") {
			// for global dependencies must keep the global scope, but remove all builtin global variables
			allTypes.clearDefaultGlobal();
		} else {
			delete allTypes.Global;
		}

		// recursively walk the type tree to find unreachable types and delete them, too
		var reachable = { };
		// if we have a function, then the function return type and its prototype are reachable 
		// in the module, so add them
		if (moduleTypeName.charAt(0) === '?') {
			var retType = moduleTypeName;
			while (retType.charAt(0) === '?') {
				retType = retType.substring(0,retType.lastIndexOf(':')+1);
				reachable[retType] = true;
				reachable[retType + "~proto"] = true;
				retType = extractReturnType(retType);
			}
			reachable[retType] = true;
		}
		findUnreachable(moduleTypeName, allTypes, reachable);
		for (var prop in allTypes) {
			if (allTypes.hasOwnProperty(prop) && !reachable[prop]) {
				delete allTypes[prop];
			}
		}
	}
	

	/**
	 * indexer is optional.  When there is no indexer passed in
	 * the indexes will not be consulted for extra references
	 */
	function EsprimaJavaScriptContentAssistProvider(indexer) {
		this.indexer = indexer;
	}
	
	/**
	 * Main entry point to provider
	 */
	EsprimaJavaScriptContentAssistProvider.prototype = {
	
		_doVisit : function(root, environment) {
			// first augment the global scope with things we know
			addJSLintGlobals(root, environment);
			addIndexedGlobals(environment);
			try {
				mVisitor.visit(root, environment, inferencer, inferencerPostOp);
			} catch (done) {
				if (typeof done !== "string") {
					// a real error
					throw done;
				}
				return done;
			}
			throw new Error("The visit function should always end with a throwable");
		},
		
		/**
		 * implements the Orion content assist API
		 */
		computeProposals: function(buffer, offset, context) {
			try {
				var root = mVisitor.parse(buffer);
				// note that if selection has length > 0, then just ignore everything past the start
				var completionKind = shouldVisit(root, offset, context.prefix, buffer);
				if (completionKind) {
					var environment = createEnvironment(buffer, "local", offset, this.indexer);
					var target = this._doVisit(root, environment);
					var proposalsObj = { };
					createProposals(target, environment, completionKind, context.prefix, offset - context.prefix.length, proposalsObj);
					// convert from object to array
					var proposals = [];
					for (var prop in proposalsObj) {
						if (proposalsObj.hasOwnProperty(prop)) {
							proposals.push(proposalsObj[prop]);
						}
					}
					proposals.sort(function(l,r) {
						if (l.description < r.description) {
							return -1;
						} else if (r.description < l.description) {
							return 1;
						} else {
							return 0;
						}
					});
					return proposals;
				} else {
					// invalid completion location
					return [];
				}
			} catch (e) {
				if (console && console.log) {
					console.log(e.message);
					console.log(e.stack);
				}
				throw (e);
			}
		},
		
		
		_internalFindDefinition : function(buffer, offset, findName) {
			var toLookFor;
			var root = mVisitor.parse(buffer);
			var environment = createEnvironment(buffer, "local", offset, this.indexer);
			var findIdentifier = function(node) {
				if (node.type === "Identifier" && inRange(offset, node.range)) {
					toLookFor = node;
					// cut visit short
					throw "done";
				}
				if (node.range[0] >= offset) {
					// not at a valid hover location
					throw "no hover";
				}
				return true;
			};
			
			try {
				mVisitor.visit(root, {}, findIdentifier);
			} catch (e) {
				if (e === "no hover") {
					// not at a valid hover location
					return null;
				} else if (e === "done") {
					// valid hover...continue
				} else {
					// a real exception
					throw e;
				}
			}
			if (!toLookFor) {
				// no hover target found
				return null;
			}
			
			this._doVisit(root, environment);
			var maybeType = environment.lookupName(toLookFor.name, toLookFor.extras.target, false, true);
			if (maybeType) {
				var hover = toLookFor.name + " :: " + createReadableType(maybeType.typeName, environment, true);
				if (findName) {
					return hover;
				} else {
					maybeType.hover = toLookFor.name + " :: " + createReadableType(maybeType.typeName, environment, true);
					return maybeType;
				}
			} else {
				return null;
			}
		
		},
		/**
		 * Computes the hover information for the provided offset
		 */
		computeHover: function(buffer, offset) {
			return this._internalFindDefinition(buffer, offset, true);
		},
		
		findDefinition : function(buffer, offset) {
			return this._internalFindDefinition(buffer, offset, false);
		},
		
		/**
		 * Computes a summary of the file that is suitable to be stored locally and used as a dependency 
		 * in another file
		 */
		computeSummary: function(buffer, fileName) {
			var root = mVisitor.parse(buffer);
			var environment = createEnvironment(buffer, fileName);
			try {
				this._doVisit(root, environment);
			} catch (e) {
				if (console && console.log) {
					console.log(e.message);
					console.log(e.stack);
				}
				throw (e);
			}
			var prop;
			var provided;
			var kind;
			var modType;
			if (environment.amdModule) {
				// provide the exports of the AMD module
				// the exports is the return value of the final argument
				var args = environment.amdModule["arguments"];
				if (args && args.length > 0) {
					modType = extractReturnType(args[args.length-1].extras.inferredType);
				} else {
					modType = "Object";
				}
				kind = "AMD";
			} else if (environment.commonjsModule) {
				// a wrapped commonjs module
				// we have already checked the correctness of this function
				var exportsParam = environment.commonjsModule["arguments"][0].params[1];
				modType = exportsParam.extras.inferredType;
				provided = provided = environment.findType(modType);
					
			} else {
				// assume a non-module
				provided = environment.findType("Global");
				
				if (provided.exports) {
					// actually, commonjs
					kind = "commonjs";
					modType = provided.exports.typeName;
				} else {
					kind = "global";
					modType = "Global";
				}
			}
			
			// simplify the exported type
			if (modType.charAt(0) === '?' || environment.findType(modType).$$isBuiltin) {
				// this module provides a built in type or a function
				provided = modType;
			} else {
				// this module provides a composite type
				provided = environment.findType(modType);
				
				// FIXADE put into own function
				for (prop in provided) {
					if (provided[prop].constructor === mTypes.Definition) {
						provided[prop].path = fileName;
					}
				}
			}


			// now filter the builtins since they are always available
			filterTypes(environment, kind, modType);
			
			var allTypes = environment.getAllTypes();
			for (var type in allTypes) {
				if (allTypes.hasOwnProperty(type)) {
					for (prop in type) {
						if (type[prop].constructor === mTypes.Definition) {
							type[prop].path = fileName;
						}
					}
				}
			}
			
			return {
				provided : provided,
				types : allTypes,
				kind : kind
			};
		}
	};
	return {
		EsprimaJavaScriptContentAssistProvider : EsprimaJavaScriptContentAssistProvider
	};
});