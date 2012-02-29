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
/*global define require dojo dijit orion window widgets localStorage*/
/*jslint browser:true devel:true*/

define(['dojo', 'orion/bootstrap', 'orion/status', 'orion/commands', 'orion/globalCommands', 'orion/searchClient', 'orion/fileClient', 'gcli/index', 'console/directory-type', 'console/current-directory'], 
function(dojo,  mBootstrap,        mStatus,        mCommands,        mGlobalCommands,        mSearchClient,        mFileClient,        gcli       ) {

	var withCurrentTreeNode = require('console/current-directory').withCurrentTreeNode;
	var withChildren = require('console/current-directory').withChildren;
	var setCurrentTreeNode = require('console/current-directory').setCurrentTreeNode;
	
	var statusService;
	
	/**
	 * Counter used to generate unique ids that can be used to asynchronously fill in the result
	 * of a command into the dom.
	 */
	var resultId = 0;
	
	
	/**
	 * Creates a suitable place folder that can be returned as the result of gcli command
	 * if that command is only producing its result asynchronously.
	 * <p>
	 * Usage: example:
	 *   var premature = makeResultsNodeTxt();
	 *   somethingWithCallBack(function (...) {
	 *      premature.put(...actual result...);
	 *   }
	 *   return premature.txt;
	 */
	function makeResultNodeTxt() {
		var divId = 'result'+resultId++;
		return  { 
			txt: '<div id='+divId+'>Waiting for result...</div>',
			put: function (delayedResult) {
				dojo.place('<p>'+delayedResult+'</p>', divId, 'only');
			}
		};
	}
	
	/**
	 * A generic implementation for executing shell-like commands on the server.
	 * Returns a glci executer function that sends the command arguments to the
	 * server.
	 */
	function defaultCommandExec(commandPath) {
		return function  (args, context) {
			var resultNode = makeResultNodeTxt();
			withCurrentTreeNode(function (node) {
				if (node.Location) {
					var location = node.Location;
					dojo.xhrGet({
						url: commandPath, 
						headers: {
							"Orion-Version": "1"
						},
						content: { 
							"location":  location,
							"arguments": JSON.stringify(args) 
						},
						handleAs: "text",
		//				timeout: 15000,
						load: dojo.hitch(resultNode, resultNode.put),
						error: function(error, ioArgs) {
							resultNode.put(error.message || 'ERROR');
						}
					});
				} else {
					resultNode.put('ERROR: could not determine working directory location');
				}
			});
			return resultNode.txt;
		};
	}
	
	
	
//	function gitStatusExec() {
//		var resultAsText = JSON.stringify(result);
//		dojo.place('<p>'+resultAsText+'</p>', divId, "only");
//
//		//TODO: How do we get this URL? Probably something to do with dojo.hash. So we essentially keep the value
//		//of pwd in the url.
//		var url = "/gitapi/status/file/I/"; 
//		
//		var divId = 'result'+(resultId++);
//
//		function show(result, cls) {
//			if (typeof(result)!=='string') {
//				//TODO: Need something better here to render the result.
//				result = JSON.stringify(result);
//			}
//			dojo.place('<p class='+cls+'>'+resultAsText+'</p>', divId, "only");
//		}
//		
//		function onLoad(result, request) {
//			show(result, 'ok');
////			var node = dojo.byId(divId);
//			console.log("I'm here");
//			var resultAsText = JSON.stringify(result);
////			var resultNode = dojo.create("pre");
////			resultNode.innerHtml = escape(resultAsText);
//			
//			dojo.place('<p>'+resultAsText+'</p>', divId, "only");
//		};
//		function onError(error) {
//			console.log("I'm here");
//		};
//		
//		gitService.getGitStatus(url, onLoad, onError);
//		return '<div id='+divId+'>Waiting for response...</div>';
//	}


	////////////////////// Utility functions /////////////////////////////////////////////////

	/**
	 * Returns true if string is a string that ends with the string suffix.
	 */
	function endsWith(string, suffix) {
		if (typeof(string)==='string' && typeof(suffix)==='string') {
			var loc = string.lastIndexOf(suffix);
			return (loc + suffix.length) === string.length;
		}
		return false;
	}

	////////////////// implementation of the ls command ////////////////////////////////////////////////////////////

	function editURL(node) {
		return "/edit/edit.html#"+node.Location;
	}

	/**
	 * Helper function to format a single child node in a directory.
	 */
	function formatLsChild(node, result) {
		//http://localhost:8080/edit/edit.html#/file/I/bundles/org.eclipse.orion.client.console/web/console/orion-gcli-console.css	
		result = result || [];
		if (node.Name) {
			if (node.Directory) {
				result.push(node.Name);
				result.push('/');
			} else { 
				result.push('<a href="');
				result.push(editURL(node));
				result.push('">');
				result.push(node.Name);
				result.push('</a>');
			}
			result.push('<br>');
		}
		return result;
	}
	
	/**
	 * Helper function to format the result of ls. Accepts a current fileClient node and
	 * formats its children.
	 * <p>
	 * Optionally accepts an array 'result' to which the resulting Strings should be pushed.
	 * <p>
	 * To avoid massive String copying the result is returned as an array of
	 * Strings rather than one massive String. Client should call join('') on the returned result.
	 */
	function formatLs(node, result, k) {
		result = result || [];
		withChildren(node, function (children) {
			for (var i = 0; i < children.length; i++) {
				formatLsChild(children[i], result);
			}
			k(result);
		});
	}

	/**
	 * Execution function for the ls gcli command
	 */
	function lsExec() {
		var result = makeResultNodeTxt();
		setCurrentTreeNode(null); // Forces the data to be refetched from server.
		withCurrentTreeNode(function (node) {
			formatLs(node, [], function (buffer) {
				result.put(buffer.join(''));
			});
		});
		return result.txt;
	}
	
	////////// implementaton of the 'cd' command ///////////////////////////////////////////////////
	
	function cdExec(args) {
		var targetDirName = args.directory;
		var result = makeResultNodeTxt();
		var newLocation = null;
		withCurrentTreeNode(function (node) {
			if (targetDirName==='..') {
				var location = dojo.hash();
				if (endsWith(location,'/')) {
					location = location.slice(0, location.length-1);
				}
				if (location) {
					var lastSlash = location.lastIndexOf('/');
					if (lastSlash>=0) {
						newLocation = location.slice(0, lastSlash+1);
					}
				}
				if (newLocation) {
					dojo.hash(newLocation);
					setCurrentTreeNode(null);
					result.put('Changed to parent directory');
				} else {
					result.put('ERROR: Can not determine parent');
				}
			} else {
				withChildren(node, function (children) {
					var found = false;
					for (var i = 0; i < children.length; i++) {
						var child = children[i];
						if (child.Name===targetDirName) {
							if (child.Directory) {
								found = true;
								setCurrentTreeNode(child);
								result.put('Working directory changed successfully');
							} else {
								result.put('ERROR: '+targetDirName+' is not a directory');
							}
						}
					}
					if (!found) {
						result.put('ERROR: '+targetDirName+' not found.');
					}
				});
			}
		});
		return result.txt;
	}
	
	//////// implementation of the 'pwd' command ///////////////////////////////////////////
	
	function pwdExec() {
		//TODO: this implementation doesn't print the full path, only the name of the current
		//  directory node.
		var result = makeResultNodeTxt();
		withCurrentTreeNode(function (node) {
			var buffer = formatLsChild(node);
			result.put(buffer.join(''));
		});
		return result.txt;
	}
	
	/////// implementation of 'vmc get|set-target' commands ////////////////////////////////
	
	var execVmcGetTarget = defaultCommandExec('/shellapi/vmc/get-target');
	var execVmcLogin = defaultCommandExec('/shellapi/vmc/login');
	var execVmcApps = defaultCommandExec('/shellapi/vmc/apps');
		
	function execVmcSetTarget(args, context) {
		var resultNode = context.createPromise();
		withCurrentTreeNode(function (node) {
			if (node.Location) {
				var location = node.Location;
				dojo.xhrGet({
					url: '/shellapi/vmc/set-target' , 
					headers: {
						"Orion-Version": "1"
					},
					content: { 
						"location":  location,
						"arguments": JSON.stringify(args) 
					},
					handleAs: "text",
			//		timeout: 15000,
					load: function (data) {
						resultNode.resolve(data);
					},
					error: function(error, ioArgs) {
						resultNode.resolve(error.message || 'ERROR');
					}
				});
			} else {
				resultNode.resolve('ERROR: could not determine working directory location');
			}
		});
		return resultNode;
	}
	
	function execVmcPush(args, context) {
		var resultNode = context.createPromise();
		withCurrentTreeNode(function (node) {
			if (node.Location) {
				var location = node.Location;
				dojo.xhrGet({
					url: '/shellapi/vmc/push' , 
					headers: {
						"Orion-Version": "1"
					},
					content: { 
						"location":  location,
						"arguments": JSON.stringify(args) 
					},
					handleAs: "text",
			//		timeout: 15000,
					load: function (data) {
						resultNode.resolve(data);
					},
					error: function(error, ioArgs) {
						resultNode.resolve(error.message || 'ERROR');
					}
				});
			} else {
				resultNode.resolve('ERROR: could not determine working directory location');
			}
		});
		return resultNode;
	}
	
	
	/////// implementation of 'npm install' command ////////////////////////////////////////
	
	//TODO: node.js commands should not be in this module, they should be in a plugin or something.
	//  this will require making it possible for plugins to contribute commands to gcli UI.

	function execNpmInstall(args, context) {
		var resultNode = makeResultNodeTxt();
		withCurrentTreeNode(function (node) {
			if (node.Location) {
				var location = node.Location;
				dojo.xhrGet({
					url: '/shellapi/npm/install' , 
					headers: {
						"Orion-Version": "1"
					},
					content: { 
						"location":  location,
						"arguments": JSON.stringify(args) 
					},
					handleAs: "text",
	//				timeout: 15000,
					load: dojo.hitch(resultNode, resultNode.put),
					error: function(error, ioArgs) {
						resultNode.put(error.message || 'ERROR');
					}
				});
			} else {
				resultNode.put('ERROR: could not determine working directory location');
			}
		});
		return resultNode.txt;
	}
	
	function initNpmCommands() {
		gcli.addCommand({
			name: 'npm',
			description: 'Node package manager'
		});

		gcli.addCommand({
			name: 'npm install',
			description: 'install node packages',
			manual: 'This command installs node packages and any packages that they depend on. It resolves dependencies by talking to the npm registry. ' +
				'If no packages are specified, then packages to install are determined from the "package.json" file if it can be found.',
			exec: execNpmInstall,
			params: [
			    {
					name: 'packages',
					type: { name: 'array', subtype:'string'},
					defaultValue: null,
					description: 'package',
					manual: 
						'A package to install. Can be given in one of the following formats: \n'+
						'<tarball file>\n' +
						'<tarball url>\n' +
						'<name>@<tag>\n' +
						'<name>@<version>\n' +
						'<name>@<version_range>'
			    },
			    {
					group: 'Options',
					params: [
						{
							name: 'force', 
							type: 'boolean',
							description: 'force',
							manual: 'Force npm to fecth remote resources even ' +
								'if a local copy exists on disk'
		//					defaultValue: false
						}
					]
			    }
			]
		});
	}
	
	function initGenericCommands() {
		gcli.addCommand({
			name: 'ls',
			description: 'Show a list of files at the current directory',
			exec: lsExec,
			returnType: 'string'
		});
		gcli.addCommand({
			name: 'cd',
			description: 'Change current directory',
			exec: cdExec,
			returnType: 'string',
			params: [
					    {
							name: 'directory',
							type: 'directory',
							description: 'directory'
					    }
			]
		});

		gcli.addCommand({
			name: 'pwd',
			description: 'Print current directory',
			exec: pwdExec,
			returnType: 'string'
		});
	}
		
//	function initGitCommands() {
//		gcli.addCommand({
//			name: 'git',
//			description: 
//				'Git is a fast, scalable, distributed revision control system with an unusually rich command set ' +
//				'that provides both high-level operations and full access to internals.'
//		});
//		gcli.addCommand({
//			name: 'git status',
//			description: 'Show the working tree status',
//			manual: 'Displays paths that have differences between the index file and the ' +
//			        'current HEAD commit, paths that have differences between the working ' +
//			        'tree and the index file, and paths in the working tree that are not ' +
//					'tracked by git (and are not ignored by gitignore(5)). The first are ' +
//					'what you would commit by running git commit; the second and third are ' +
//					'what you could commit by running git add before running git commit.',
//			returnType: 'string',
//			exec: gitStatusExec
//		});
//	}

	function simpleVMCCommand(name) {
		gcli.addCommand({
			name: 'vmc '+name,
			description: name+' a cloudfoundry app',
			manual: 'A nide manual for vmc '+name+' goes here',
			params: [
				{
					name: 'app-name',
					type: 'string',
					description: 'Name of app'
				}
			],
			exec: defaultCommandExec('/shellapi/vmc/' + name)
		});
	}

	function simpleVMCCommands(names) {
		for (var i = 0; i < names.length; i++) {
			simpleVMCCommand(names[i]);
		}
	}
	
	function initVmcCommands() {
		gcli.addCommand({
			name: 'vmc',
			description: 'Cloudfoundry Commandline Client',
			manual: 'A nice manual for VMC goes in here'
		});

		gcli.addCommand({
			name: 'vmc apps',
			description: 'Reports apps installed on target',
			manual: 'A nice manual for VMC goes in here',
			params: [],
			exec: execVmcApps
		});
		
		gcli.addCommand({
			name: 'vmc get-target',
			description: 'Reports current target or sets a new target',
			manual: 'A nice manual for VMC goes in here',
			params: [],
			exec: execVmcGetTarget
		});
		
		gcli.addCommand({
			name: 'vmc set-target',
			description: 'Reports current target or sets a new target',
			manual: 'A nice manual for VMC goes in here',
			params: [
					    {
							name: 'target',
							type: 'string',
							description: 'Server target'
					    }
			],
			exec: execVmcSetTarget
		});
		
		gcli.addCommand({
			name: 'vmc login',
			description: 'Login to currenlty selected target',
			manual: 'Login to currenlty selected target',
			params: [
					    {
							name: 'email',
							type: 'string',
							description: "User's email address"
					    },
					    {
							name: 'passwd',
							type: 'string',
							description: 'Password'
						}
			],
			exec: execVmcLogin
		});
		
		gcli.addCommand({
			name: 'vmc push',
			description: 'Deploy app to cloudfoundry',
			manual: 'Deploy app to cloudfoundry',
			params: [
					    {
							name: 'appname',
							type: 'string',
							description: "Appname"
					    },
					    {
							name: 'url',
							type: 'string',
							description: 'Deployment URL',
							defaultValue: null
						},
						{
							name: 'instances',
							type: 'number',
							description: 'number of instances',
							defaultValue: 1
						},
						{
							name: 'mem',
							type: 'number',
							description: 'Memory (Mb)',
							defaultValue: 512
						},
						{	
							name: 'no-start',
							type: 'boolean',
							description: 'Do NOT start the app'
						}
			],
			exec: execVmcPush
		});
		
		simpleVMCCommands(["start", "stop", "delete", "restart"]);
		
	}
	
	function initRooCommands() {
		gcli.addCommand({
			name: 'roo',
			description: 'Spring Roo Commands',
			manual: 'A nice manual for Roo goes here' 
		});
		
		gcli.addCommand({
			name: 'roo script',
			description: 'Execute a roo script',
			manual: 'A nice manual for the Roo script command goes in here',
			params: [
				{
					name: 'script',
					type: 'string',
					description: 'script name'
				}
			],
			exec: defaultCommandExec('/shellapi/roo/script')
		});
	}
	
	function simpleMvnCommand(name) {
		gcli.addCommand({
			name: 'mvn '+name,
			description: name+' project at current directory',
			manual: 'A nice manual for mvn ' + name +' goes in here',
			params: [
			],
			exec: defaultCommandExec('/shellapi/mvn/'+name)
		});
	}
	
	function simpleMvnCommands(listOfNames) {
		for (var i = 0; i < listOfNames.length; i++) {
			simpleMvnCommand(listOfNames[i]);			
		}	
	}
	
	function initMvnCommands() {
		gcli.addCommand({
			name: 'mvn',
			description: 'Maven commands',
			manual: 'A nice manual for Maven goes here' 
		});
		
		simpleMvnCommands([ 'assemble', 'build', 'compile', 'package', 'test' ]);
	}
		
	////////////////////////////////////////////////////////////////////////
	
	function initCommands(serviceRegistry, k) {
		initGenericCommands();
		initNpmCommands();
		initVmcCommands();
//		initRooCommands();
		initMvnCommands();
		k();
	}

	dojo.ready(function() {
		mBootstrap.startup().then(function(core) {
		
			var serviceRegistry = core.serviceRegistry;
			var preferences = core.preferences;
			
			document.body.style.visibility = "visible";
			dojo.parser.parse();

			// Register services
			statusService = new mStatus.StatusReportingService(serviceRegistry, "statusPane", "notifications");
			var commandService = new mCommands.CommandService({serviceRegistry: serviceRegistry});
			var searcher = new mSearchClient.Searcher({serviceRegistry: serviceRegistry, commandService: commandService, fileService: mFileClient});
			mGlobalCommands.generateBanner("banner", serviceRegistry, commandService, preferences, searcher);

			statusService.setMessage("Loading...");
			
			initCommands(serviceRegistry, function () {
				gcli.createView();
			});
		});
	});
});