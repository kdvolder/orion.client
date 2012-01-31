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
 *******************************************************************************/

/*global define require eclipse esprima window*/
window.onload = function() {

    /**
     * Determine the line number based on an offset.
     * @param offset the offset from the start of the file
     * @param linebreaks array of positions of the line breaks in the file
     * @return the line number, or -1 if off the end of the file
     */
	function toLine(offset,linebreaks) {
	  var lblen = linebreaks.length;
	  for (var lb = 0;lb<lblen;lb++) {
	    if (offset>linebreaks[lb]) {
	       continue;
	    }
	    return lb+1;
	  }
	  return -1;
	}
	
	/**
	 * Discover the linebreaks in some text (linebreaks being '\n' chars).
	 * @param data the input data containing line breaks
	 * @return an array of positions of the linebreaks in the file
	 */
	function computeLinebreaks(data) {
	   var linebreaks = [];
	   var len = data.length;
	   for (var c=0;c<len;c++) {
	     if (data.charAt(c)==='\n') {
	       linebreaks.push(c);
	     }
	   } 
	   return linebreaks;
	}
	
	/**
	 * Convert an array of parameters into a string form.
	 */
	function toParamString(params) {
	    if (!params || params.length===0) {
			return "()";  
		} 
		var pstring='(';
		var plen = params.length;
	    for (var p=0;p<plen;p++) {
	      if (p>0) { pstring+=','; }
	      pstring+=params[p].name;
	    } 
	    pstring+=')'; 
		return pstring;
	 }
	 
	/**
	 * Very crude:
	 * Walk the ast and collect up likely candidates (FunctionDeclarations, VariableDeclarators, named functions).
	 */
	function collectProposals(ast, collector) {
	    var len;
	    if (typeof ast === 'string' || typeof ast === 'number' || typeof ast === 'boolean') {
	      // ignore
	    } else if (ast instanceof Array) {
	      len = ast.length; 
	      for (var i=0;i<len;i++) {
	          collectProposals(ast[i],collector);
	      } 
	    } else {   
	      for (var key in ast) {
		        var value = ast[key];
		        if (key === "type") {
		          if (value === "FunctionDeclaration") {
		            var name = ast.id.name+toParamString(ast.params);
					collector.push(name);
		          } else if (value === "VariableDeclarator") {
					collector.push(ast.id.name);
		          } 
		        } else if (key === "value") {
		          if (value && value.type && value.type==="FunctionExpression") {
		            // looks like it might be a named function
		            if (ast.key && ast.key.name) {
		                collector.push(ast.key.name);
		            }
		          }
		        }
		        if (typeof ast === 'string' || typeof ast === 'number' || typeof ast === 'boolean') {
                    // ignore			 
				} else if (value instanceof Array) {
					len = value.length;
					if (key === 'range' && len === 2) {
						// skip the range object
						// may not have these in the Ast if using the right arguments to parse
					} else {
				      for (var i2=0;i2<len;i2++) {
				          collectProposals(value[i2],collector);
				      } 
				    } 
		        } else {
			        collectProposals(value,collector);
		        }
		  }
	    } 
	}
	
	function parse(contents) { 
	    var parsedProgram = esprima.parse(contents,{range:true});
	    // to get range nodes (start/end position elements) and comments (at the end of the ast), use this:
	    // (although not sure comments bit is behaving at the moment)
//	    var parsedProgram = esprima.parse(contents,{range:true,comments:true});
//	    var linebreaks = computeLinebreaks(contents);
//	    return {ast:parsedProgram,linebreaks:linebreaks};
		return parsedProgram;
	}


    /**
     * Main entry point to provider
     */
	var proposalProvider = {
		computeProposals: function(prefix, buffer, selection) {
			var proposals = [];
			var ast = parse(buffer);
			collectProposals(ast,ast,proposals);
			return proposals;
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

