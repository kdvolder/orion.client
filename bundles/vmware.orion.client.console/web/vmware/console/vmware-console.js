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
 /*global define require*/
 define(['dojo'], function () { 
	//We are being passed in a 'fake' gcli that registers commands with orion
	//service instead of the real gcli.
 
	var dojo = require('dojo');
 
	/////// implementation of 'vmc run functions commands ////////////////////////////////
	
	function defaultCommandExec(commandPath) {
		return function (args, context) {
			var promise = new dojo.Deferred();
			var location = context.location;
			var wsLoc = context.workspaceLocation;
			if (typeof(wsLoc)!=='string') {
				return 'ERROR: could not determine workspace location';
			}
			if (typeof(location)!=='string') {
				return 'ERROR: could not determine working directory location';
			}
			dojo.xhrGet({
				url: '/shellapi/'+commandPath, 
				headers: {
					"Orion-Version": "1"
				},
				content: { 
					"location":  location,
					"user.home": wsLoc,
					"arguments": JSON.stringify(args) 
				},
				handleAs: "text",
//				timeout: 15000,
				load: function (result) {
					promise.callback(result);
				},
				error: function(error, ioArgs) {
					promise.callback(error.message || 'ERROR');
				}
			});
			return promise;
		};
	}
	
	function vmcCommandExec(commandName) {
		return defaultCommandExec('vmc/'+commandName);
	}
	
	var execVmcLogin = vmcCommandExec('login');
	var execVmcPush = vmcCommandExec('push');
	
	/////// implementation of 'npm install' command ////////////////////////////////////////
	
	//TODO: node.js commands should not be in this module, they should be in a plugin or something.
	//  this will require making it possible for plugins to contribute commands to gcli UI.
	
	function initNpmCommands(gcli) {
		gcli.addCommand({
			name: 'npm',
			description: 'Node package manager'
		});

		gcli.addCommand({
			name: 'npm install',
			description: 'install node packages',
			manual: 'This command installs node packages and any packages that they depend on. It resolves dependencies by talking to the npm registry. ' +
				'If no packages are specified, then packages to install are determined from the "package.json" file if it can be found.',
			run: defaultCommandExec('npm/install'),
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
							manual: 'Force npm to fetch remote resources even ' +
								'if a local copy exists on disk'
		//					defaultValue: false
						}
					]
			    }
			]
		});
		gcli.addCommand({
			name: 'npm config',
			description: 'Manage npm configuration options',
			manual: 'Manage npm configuration options'
		});
		gcli.addCommand({
			name: 'npm config set',
			description: 'Set npm config option',
			manual: 'Set npm configuration option as a key, value pair. If value is not provided it defaults to "true"',
			params: [
				{
					name: 'key',
					type: 'string',
					description: 'key'					
				},
				{
					name: 'value',
					type: 'string',
					description: 'value',
					defaultValue: 'true'
				}
			],
			run: defaultCommandExec('npm/config/set')
		});
		gcli.addCommand({
			name: 'npm config get',
			description: 'Get npm config option',
			manual: 'Get npm configuration option value for a given key.',
			params: [
				{
					name: 'key',
					type: 'string',
					description: 'key'
				}
			],
			run: defaultCommandExec('npm/config/get')
		});
		gcli.addCommand({
			name: 'npm config delete',
			description: 'Delete npm config key-value pair',
			manual: 'Delete npm config key-value pair.',
			params: [
				{
					name: 'key',
					type: 'string',
					description: 'key'					
				}
			],
			run: defaultCommandExec('npm/config/delete')
		});
		gcli.addCommand({
			name: 'npm config list',
			description: 'Show all the config settings.',
			params: [ 
				{
					name: 'long',
					description: 'long',
					type: 'boolean'
				}
			],
			run: defaultCommandExec('npm/config/list')
		});
	}
	
	function simpleVMCCommand(gcli, name) {
		gcli.addCommand({
			name: 'vmc '+name,
			description: name+' a cloudfoundry app',
			manual: 'A nice manual for vmc '+name+' goes here',
			params: [
				{
					name: 'app-name',
					type: 'string',
					description: 'Name of app'
				}
			],
			run: vmcCommandExec(name)
		});
	}

	function simpleVMCCommands(gcli, names) {
		for (var i = 0; i < names.length; i++) {
			simpleVMCCommand(gcli, names[i]);
		}
	}
	
	function initVmcCommands(gcli) {
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
			run: vmcCommandExec('apps')
		});
		
		gcli.addCommand({
			name: 'vmc target',
			description: 'Reports current target or sets a new target',
			manual: 'A nice manual for VMC goes in here',
			params: [
					    {
							name: 'target',
							type: 'string',
							description: 'Server target',
							defaultValue: null
					    }
			],
			run: vmcCommandExec('target')
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
			run: execVmcLogin
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
			run: execVmcPush
		});
		
		simpleVMCCommands(gcli, ["start", "stop", "delete", "restart", "update"]);
	}
	
//	function initRooCommands() {
//		gcli.addCommand({
//			name: 'roo',
//			description: 'Spring Roo Commands',
//			manual: 'A nice manual for Roo goes here' 
//		});
//		
//		gcli.addCommand({
//			name: 'roo script',
//			description: 'Execute a roo script',
//			manual: 'A nice manual for the Roo script command goes in here',
//			params: [
//				{
//					name: 'script',
//					type: 'string',
//					description: 'script name'
//				}
//			],
//			run: defaultCommandExec('/shellapi/roo/script')
//		});
//	}
//	
	function simpleMvnCommand(gcli, name) {
		gcli.addCommand({
			name: 'mvn '+name,
			description: name+' project at current directory',
			manual: 'A nice manual for mvn ' + name +' goes in here',
			params: [
			],
			run: defaultCommandExec('mvn/'+name)
		});
	}
	
	function simpleMvnCommands(gcli, listOfNames) {
		for (var i = 0; i < listOfNames.length; i++) {
			simpleMvnCommand(gcli, listOfNames[i]);			
		}	
	}
	
	function initMvnCommands(gcli) {
		gcli.addCommand({
			name: 'mvn',
			description: 'Maven commands',
			manual: 'A nice manual for Maven goes here' 
		});
		
		simpleMvnCommands(gcli, [ 'assemble', 'build', 'compile', 'package', 'test' ]);
	}
		
	////////////////////////////////////////////////////////////////////////
	
	function init(gcli) {
		initVmcCommands(gcli);
		initMvnCommands(gcli);
		initNpmCommands(gcli);
	}	

	return {init: init};
});