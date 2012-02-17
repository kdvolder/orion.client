/*******************************************************************************
 * @license
 * Copyright (c) 2011 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 *
 * Contributors:
 *     Kris De Volder (VMWare) - initial API and implementation
 *
 *******************************************************************************/ 
/*global define dojo dijit orion window widgets localStorage*/
/*jslint browser:true devel:true*/

//Note: This file not currently in use...
// We are using gcli instead of the simple interface.

define(['dojo', 'orion/git/gitClient', 'orion/bootstrap', 'orion/status', 'orion/commands', 'orion/globalCommands', 'orion/searchClient', 'orion/fileClient', 'orion/console'], 
function(dojo,  mGitClient,            mBootstrap,        mStatus,        mCommands,        mGlobalCommands,        mSearchClient,        mFileClient,        mConsole) {
	
	var statusService;
	var gitService;
	var fileClient;
	
	function execNpm(arguments, context) {
		arguments = arguments.arguments;
		var resultNode = makeResultNodeTxt();
		dojo.xhrGet({
			url: '/shellapi/npm' , 
			headers: {
				"Orion-Version": "1"
			},
			content: { "arguments": JSON.stringify(arguments) },
			handleAs: "text",
//			timeout: 15000,
			load: resultNode.put,
			error: function(error, ioArgs) {
				resultNode.put(error.message || 'ERROR');
			}
		});
		return resultNode.txt;
	}
	
	function execNpmInstall(arguments, context) {
//		arguments = arguments.arguments;
		var resultNode = makeResultNodeTxt();
		dojo.xhrGet({
			url: '/shellapi/npm/install' , 
			headers: {
				"Orion-Version": "1"
			},
			content: { "arguments": JSON.stringify(arguments) },
			handleAs: "text",
//			timeout: 15000,
			load: resultNode.put,
			error: function(error, ioArgs) {
				resultNode.put(error.message || 'ERROR');
			}
		});
		return resultNode.txt;
	}
	
	dojo.addOnLoad(function() {
		mBootstrap.startup().then(function(core) {
		
			var serviceRegistry = core.serviceRegistry;
			var preferences = core.preferences;
			
//			preferencesCorePreferences = core.preferences;	

			document.body.style.visibility = "visible";
			dojo.parser.parse();

//			preferenceDialogService = new mDialogs.DialogService(serviceRegistry);
		
			// Register services
//			var dialogService = new mDialogs.DialogService(serviceRegistry);
			statusService = new mStatus.StatusReportingService(serviceRegistry, "statusPane", "notifications");
			var commandService = new mCommands.CommandService({serviceRegistry: serviceRegistry});
			gitService = new mGitClient.GitService(serviceRegistry);
	
//			var siteService = new mSiteService.SiteService(serviceRegistry);
			fileClient = new mFileClient.FileClient(serviceRegistry);
			var searcher = new mSearchClient.Searcher({serviceRegistry: serviceRegistry, commandService: commandService, fileService: mFileClient});
			mGlobalCommands.generateBanner("banner", serviceRegistry, commandService, preferences, searcher);

			statusService.setMessage("Loading...");
			dojo.ready(function () {
				var console = new mConsole.Console('console');
				console.appendOutput('Orion command console Ready!\n');
				console.setAcceptInput(true);
				console.addInputListener(function (value) {
					console.appendOutput('I hear you: ');
					console.appendOutput(value);
					console.appendOutput('\n');
				});
			});
		});
	});

});