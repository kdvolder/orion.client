/*******************************************************************************
 * @license
 * Copyright (c) 2012 Contributors
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 *
 * Contributors:
 *     Andrew Eisenberg (vmware) - initial implementation and API
 *******************************************************************************/

/*global define require eclipse esprima window console inTest localStorage*/

/**
 * Finds dependencies for a given file
 * returns those dependencies as a set of file summaries
 * these file summaries must already have been created by the indexerService
 */
define("dependencyFinder", [], function() {
	function findDependencies(fileName, contents) {
		// get everything from localstorage
		if (localStorage && localStorage.esprimaassist) {
			// structure consists of extra global variables and extra types
			var unparsed = localStorage.esprimaassist;
			try {
				return JSON.parse(unparsed);
			} catch (e) {
				console.log("Could not parse structure for content assist");
				console.log(unparsed);
				console.log(e);
			}
		}
		return {};
	}
	
	return { findDependencies : findDependencies };
});