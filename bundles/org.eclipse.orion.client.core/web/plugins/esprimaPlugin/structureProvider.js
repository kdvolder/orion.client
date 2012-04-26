/*******************************************************************************
 * @license
 * Copyright (c) 2012 Contributors
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 *
 * Contributors:
 *     Andrew Eisenberg (vmware) - implemented visitor pattern
 *******************************************************************************/

/*global define require console localStorage*/
define("structureProvider", ["esprimaJsContentAssist"], function(mEsprimaPlugin) {
	
	function createStructure() {
		// determine current file
		// determine dependencies
		// determine which dependencies have changed
		// for each changed dependency, update its structure
		
		// for now, just use static text and update it each time
		var esprimaContentAssistant = new mEsprimaPlugin.EsprimaJavaScriptContentAssistProvider();
		var structure = esprimaContentAssistant.computeStructure("var first = 9;\nvar second = {a : 1, b: ''};");
		
		localStorage.esprimaassist = structure;
	}
	
	return { createStructure : createStructure};
});