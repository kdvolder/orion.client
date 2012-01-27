/*******************************************************************************
 * @license
 * Copyright (c) 2011 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 *
 * Contributors:
 *     IBM Corporation - initial API and implementation
 *******************************************************************************/
/*global window document define login logout localStorage orion */
/*browser:true*/

define(['require', 'dojo', 'dijit', 'orion/commands', 'orion/util', 'orion/textview/keyBinding',
        'dijit/Menu', 'dijit/MenuItem', 'dijit/form/DropDownButton', 'orion/widgets/OpenResourceDialog', 'orion/widgets/LoginDialog'], function(require, dojo, dijit, mCommands, mUtil, mKeyBinding){

	/**
	 * Constructs a new command parameter collector
	 * @param {DOMElement} the toolbar containing the parameter collector
	 * @class CommandParameterCollector can collect parameters in a way that is integrated with the 
	 * common header elements.  It is used for "tool" commands to define a custom parameter gathering
	 * technique that is appropriate for the page.  Note that "menu" commands render their own parameter
	 * collector since it is integrated with the menu itself generated by the command framework.
	 * @name orion.globalCommands.CommandParameterCollector
	 */	
	function CommandParameterCollector (toolbar) {
		// get node's parent.  If it is managed by dijit, we will need to layout
		if (toolbar) {
			this.layoutWidgetId = toolbar.parentNode.id;
		}
	}
	CommandParameterCollector.prototype =  {
	
		/**
		 * Closes any active parameter collectors
		 *
		 * @param {DOMElement} commandNode the node representing the command
		 */
		close: function (commandNode) {
			if (this.parameterArea) {
				dojo.empty(this.parameterArea);
			}
			if (this.parameterContainer) {
				dojo.removeClass(this.parameterContainer, this.activeClass);
				dojo.removeClass(this.parameterContainer.parentNode, "slideContainerActive");
			}
			if (this.dismissArea) {
				 dojo.empty(this.dismissArea);
			}
			if (commandNode) {
				dojo.removeClass(commandNode, "activeCommand");
			}
			mUtil.forceLayout(this.parameterContainer);
			if (this._oldFocusNode) {
				this._oldFocusNode.focus();
				this._oldFocusNode = null;
			}
			this.parameterContainer = null;
			this.activeClass = null;
			this.parameterArea = null;
			this.dismissArea = null;
		},
		
		/**
		 * Open a parameter collector and return the dom node where parameter 
		 * information should be inserted
		 *
		 * @param {DOMElement} commandNode the node containing the triggering command
		 * @param {String} id the id of parent node containing the triggering command
		 * @param {Function} fillFunction a function that will fill the parameter area
		 */
		open: function(commandNode, id, fillFunction) {
			this.close(commandNode);
			this.parameterContainer = null;
			this.activeClass = null;
			this.parameterArea = null;
			this.dismissArea = null;
			if (id === "pageActions") {
				this.parameterArea = dojo.byId("pageCommandParameters");
				this.parameterContainer = dojo.byId("pageParameterArea");
				this.activeClass = "leftSlideActive";
				this.dismissArea = dojo.byId("pageCommandDismiss");
			} else if (id === "pageNavigationActions") {
				this.parameterArea = dojo.byId("pageNavigationCommandParameters");
				this.parameterContainer = dojo.byId("pageNavigationParameterArea");
				this.activeClass = "rightSlideActive";
				this.dismissArea = dojo.byId("pageNavigationDismiss");
			}
			if (commandNode) {
				dojo.addClass(commandNode, "activeCommand");
			}
			if (this.parameterArea) {
				var focusNode = fillFunction(this.parameterArea);
				if (!dojo.byId("parameterClose") && this.dismissArea) {
				// add the close button if the fill function did not.
					var spacer = dojo.create("span", null, this.dismissArea, "last");
					dojo.addClass(spacer, "dismiss");
					var close = dojo.create("span", {id: "parameterClose", role: "button", tabindex: "0"}, this.dismissArea, "last");
					dojo.addClass(close, "imageSprite");
					dojo.addClass(close, "core-sprite-delete");
					dojo.addClass(close, "dismiss");
					close.title = "Close";
					dojo.connect(close, "onclick", dojo.hitch(this, function(event) {
						this.close(commandNode);
					}));
					// onClick events do not register for spans when using the keyboard without a screen reader
					dojo.connect(close, "onkeypress", dojo.hitch(this, function (e) {
						if(e.keyCode === dojo.keys.ENTER) {
							this.close(commandNode);
						}
					}));
				}


				// all parameters have been generated.  Activate the area.
				dojo.addClass(this.parameterContainer.parentNode, "slideContainerActive");
				dojo.addClass(this.parameterContainer, this.activeClass);
				mUtil.forceLayout(this.parameterContainer);
				if (focusNode) {
					this._oldFocusNode = window.document.activeElement;
					window.setTimeout(function() {
						focusNode.focus();
						focusNode.select();
					}, 0);
				}
				return true;
			}
			return false;
		},
		
		_collectAndCall: function(commandInvocation, parent) {
			dojo.query("input", parent).forEach(function(field) {
				if (field.type !== "button") {
					commandInvocation.parameters.setValue(field.parameterName, field.value);
				}
			});
			if (commandInvocation.command.callback) {
				commandInvocation.command.callback.call(commandInvocation.handler, commandInvocation);
			}

		},
		
		/**
		 * Collect parameters for the given command.
		 * 
		 * @param {orion.commands.CommandInvocation} the command invocation
		 * @returns {Boolean} whether or not required parameters were collected.
		 */
		collectParameters: function(commandInvocation) {
			if (commandInvocation.parameters) {
				return this.open(commandInvocation.domNode, commandInvocation.domParent.id, this.getFillFunction(commandInvocation));
			}
			return false;
		},
		
		/**
		 * Returns a function that can be used to fill a specified parent node with parameter information.
		 *
		 * @param {orion.commands.CommandInvocation} the command invocation used when gathering parameters
		 * @param {Function} an optional function called when the area must be closed. 
		 * @returns {Function} a function that can fill the specified dom node with parameter collection behavior
		 */
		 getFillFunction: function(commandInvocation, closeFunction) {
			return dojo.hitch(this, function(parameterArea) {
				var first = null;
				var localClose = dojo.hitch(this, function() {
					if (closeFunction) {
						closeFunction();
					} else {
						this.close(commandInvocation.domNode);
					}
				});
				var keyHandler = dojo.hitch(this, function(event) {
					if (event.keyCode === dojo.keys.ENTER) {
						this._collectAndCall(commandInvocation, parameterArea);
					}
					if (event.keyCode === dojo.keys.ESCAPE || event.keyCode === dojo.keys.ENTER) {
						localClose();
						dojo.stopEvent(event);
					}
				});
				commandInvocation.parameters.forEach(function(parm) {
					if (parm.label) {
						dojo.place(document.createTextNode(parm.label), parameterArea, "last");
					} 
					var field = dojo.create("input", {type: parm.type}, parameterArea, "last");
					dojo.addClass(field, "parameterInput");
					// we define special classes for some parameter types
					dojo.addClass(field, "parameterInput"+parm.type);
					field.setAttribute("speech", "speech");
					field.setAttribute("x-webkit-speech", "x-webkit-speech");
					field.parameterName = parm.name;
					if (!first) {
						first = field;
					}
					if (parm.value) {
						field.value = parm.value;
					}
					dojo.connect(field, "onkeypress", keyHandler);
				});
				var spacer;
				var parentDismiss = parameterArea;
				var finish = function (collector) {
					collector._collectAndCall(commandInvocation, parameterArea);
					localClose();
				};

				if (commandInvocation.parameters.options) {
					commandInvocation.parameters.optionsRequested = false;
					spacer = dojo.create("span", null, parentDismiss, "last");
					dojo.addClass(spacer, "dismiss");
					
					var options = dojo.create("span", {role: "button", tabindex: "0"}, parentDismiss, "last");
					dojo.addClass(options, "core-sprite-options");
					dojo.addClass(options, "dismiss");
					options.title = "More options...";
					dojo.connect(options, "onclick", dojo.hitch(this, function() {
						commandInvocation.parameters.optionsRequested = true;
						finish(this);
					}));
					// onClick events do not register for spans when using the keyboard without a screen reader
					dojo.connect(options, "onkeypress", dojo.hitch(this, function (e) {
						if(e.keyCode === dojo.keys.ENTER) {			
							commandInvocation.parameters.optionsRequested = true;
							finish(this);
						}
					}));
				}
				// OK and cancel buttons
				spacer = dojo.create("span", null, parentDismiss, "last");
				dojo.addClass(spacer, "dismiss");

				var ok = dojo.create("span", {role: "button", tabindex: "0"}, parentDismiss, "last");
				ok.title = "Submit";
				dojo.addClass(ok, "core-sprite-ok");
				dojo.addClass(ok, "dismiss");
				dojo.connect(ok, "onclick", dojo.hitch(this, function() {
					finish(this);
				}));
				// onClick events do not register for spans when using the keyboard without a screen reader
				dojo.connect(ok, "onkeypress", dojo.hitch(this, function (e) {
					if(e.keyCode === dojo.keys.ENTER) {
						finish(this);
					}
				}));
				
				spacer = dojo.create("span", null, parentDismiss, "last");
				dojo.addClass(spacer, "dismiss");
				var close = dojo.create("span", {id: "parameterClose", role: "button", tabindex: "0"}, parentDismiss, "last");
				dojo.addClass(close, "imageSprite");
				dojo.addClass(close, "core-sprite-delete");
				dojo.addClass(close, "dismiss");
				close.title = "Close";
				dojo.connect(close, "onclick", dojo.hitch(this, function(event) {
					localClose();
				}));
				// onClick events do not register for spans when using the keyboard without a screen reader
				dojo.connect(close, "onkeypress", dojo.hitch(this, function (e) {
					if(e.keyCode === dojo.keys.ENTER) {
						localClose();
					}
				}));
				return first;
			});
		 }
	};
	CommandParameterCollector.prototype.constructor = CommandParameterCollector;
	
	/**
	 * This class contains static utility methods. It is not intended to be instantiated.
	 * @class This class contains static utility methods for creating and managing 
	 * global commands.
	 * @name orion.globalCommands
	 */

	// BEGIN TOP BANNER FRAGMENT
	var topHTMLFragment =
	//Top row:  Logo + discovery links + user
	'<div id="staticBanner" class="layoutBlock topRowBanner">' +
		'<a id="home" class="layoutLeft primaryNav" href="' + require.toUrl("index.html") + '"><img src="' + require.toUrl("images/orion-small-lightondark.gif") + '" alt="Orion Logo"/></a>' +
		'<div id="primaryNav" class="layoutLeft primaryNav"></div>' +
		'<div id="globalActions" class="layoutLeft primaryNav"></div>' +
		'<div id="help" class="layoutRight help"><a id="help" href="' + require.toUrl("help/index.jsp") + '"><img src="' + require.toUrl("images/help.gif") + '" alt="Help"/></a></div>'+
		'<div id="userInfo" class="layoutRight primaryNav"></div>' +
		'<div class="layoutRight primaryNav">|</div>' +
	'</div>' +
	//Title area
	'<div id="titleArea" class="layoutBlock titleArea">' +
		'<div id="pageTitle" class="layoutLeft pageTitle"></div>' +
		'<input type="search" id="search" placeholder="Search root" title="Type a keyword or wild card to search in root" class="layoutRight searchbox">' +
		'<div id="dimension" class="layoutBlock dimension"></div>' +
		'<div id="location" class="layoutBlock currentLocation"></div>' +
	'</div>';
	// END TOP BANNER FRAGMENT
	
	// BEGIN BOTTOM BANNER FRAGMENT
	// styling of the surrounding div (text-align, etc) is in ide.css "footer"
	var bottomHTMLFragment = 
		'<div class="layoutBlock">' +
			'<div class="footerBlock">' +
				'This is a Beta build of Orion. Please try it out but BEWARE your data may be lost.' +
			'</div>' +
			'<div class="footerRightBlock">' +
				'<a href="http://wiki.eclipse.org/Orion/FAQ" target="_blank">FAQ</a> | ' + 
				'<a href="https://bugs.eclipse.org/bugs/enter_bug.cgi?product=Orion&version=0.4" target="_blank">Report a Bug</a> | ' +
				'<a href="http://www.eclipse.org/legal/privacy.php" target="_blank">Privacy Policy</a> | ' + 
				'<a href="http://www.eclipse.org/legal/termsofuse.php" target="_blank">Terms of Use</a> | '+ 
				'<a href="http://www.eclipse.org/legal/copyright.php" target="_blank">Copyright Agent</a> | '+
				'<a href="' + require.toUrl("/operations/list.html") +'" target="_blank">Server Operations</a>' +
			'</div>' +
		'</div>';
	// END BOTTOM BANNER FRAGEMENT

	var toolbarFragment = 
		'<div class="layoutLeft pageToolbarLeft pageActions" id="pageActions"></div>' +
		'<div class="layoutRight pageToolbarRight pageActions pageNavigationActions" id="statusPane"></div>' +
		'<div class="layoutRight pageToolbarRight pageActions pageNavigationActions" id="pageNavigationActions"></div>' +
		'<div id="notificationArea" class="layoutBlock slideContainer">' +
				'<img src="'+ require.toUrl("images/none.png") +'" id="progressPane"></img>' +
				'<span id="notifications"></span>' +
		'</div>' +
		'<div id="parameterArea" class="layoutBlock slideContainer">' +
			'<span id="pageParameterArea" class="leftSlide">' +
				'<span id="pageCommandParameters" class="parameters"></span>' +
				'<span id="pageCommandDismiss" class="parameters"></span>' +
			'</span>' +
			'<span id="pageNavigationParameterArea" class="rightSlide">' +
				'<span id="pageNavigationCommandParameters" class="parameters"></span>' +
				'<span id="pageNavigationDismiss" class="parameters"></span>' +
			'</span>' +
		'</div>';
	function qualifyURL(url){
	    var a = document.createElement('a');
	    a.href = url; // set string url
	    return a.href;
	}

	var notifyAuthenticationSite = qualifyURL(require.toUrl('auth/NotifyAuthentication.html'));
	var authRendered = {};
	var loginDialog = new orion.widgets.LoginDialog();
	
	function getLabel(authService, serviceReference){
		if(authService.getLabel){
			return authService.getLabel();
		} else {
			var d = new dojo.Deferred();
			d.callback(serviceReference.properties.name);
			return d;
		}
	}
	
	var authenticationIds = [];
	
	function getAuthenticationIds(){
		return authenticationIds;
	}
	
	function startProgressService(serviceRegistry){
		var progressService = serviceRegistry.getService("orion.page.progress");
		if(progressService)
			dojo.hitch(progressService, progressService.init)("progressPane");
	}

	/**
	 * Adds the user-related commands to the toolbar
	 * @name orion.globalCommands#generateUserInfo
	 * @function
	 */
	function generateUserInfo(serviceRegistry) {
		
		var authServices = serviceRegistry.getServiceReferences("orion.core.auth");
		authenticationIds = [];
		var userInfo = dojo.byId("userInfo");
		if(!userInfo){
			return;
		}
		
		if(!dijit.byId('logins')){
			var menuButton = new dijit.form.DropDownButton({
				id: "logins",
				label: "Security",
				dropDown: loginDialog,
				title: "Login statuses"
		        });
		        dojo.addClass(menuButton.domNode, "commandImage");
		        dojo.place(menuButton.domNode, userInfo, "only");
			}
		
		
		for(var i=0; i<authServices.length; i++){
			var servicePtr = authServices[i];
			var authService = serviceRegistry.getService(servicePtr);		
			getLabel(authService, servicePtr).then(function(label){			
				authService.getKey().then(function(key){
					authenticationIds.push(key);
					authService.getUser().then(function(jsonData){
						loginDialog.addUserItem(key, authService, label, jsonData);
					}, 
					function(errorData){
						loginDialog.addUserItem(key, authService, label);
					});
					window.addEventListener("storage", function(e){
						if(authRendered[key] === localStorage.getItem(key)){
							return;
						}
						
						authRendered[key] = localStorage.getItem(key);
						
						authService.getUser().then(function(jsonData){
							loginDialog.addUserItem(key, authService, label, jsonData);
						}, 
						function(errorData){
							loginDialog.addUserItem(key, authService, label);
						});				
					}, false);
				});							
			});
		}
		
	}
	
	function setPendingAuthentication(services){
		loginDialog.setPendingAuthentication(services);
		var i;
		for(i in services){
			if(services.hasOwnProperty(i)){
				//open prompt if there is at least one pending authentication
				dijit.popup.open({
		            popup: loginDialog,
		            around: dojo.byId('logins')
		        });		
				return;
			}
		}
		
		if(dijit.popup.hide)
			dijit.popup.hide(loginDialog); //close doesn't work on FF
		dijit.popup.close(loginDialog);
	}

	/**
	 * Adds the DOM-related commands to the banner
	 * @name orion.globalCommands#generateDomCommandsInBanner
	 * @function
	 */
	function generateDomCommandsInBanner(commandService, handler, item, navHandler, navItem, useImage, clientManagesPageNav) {
		// close any open slideouts because we are retargeting
		commandService.closeParameterCollector("tool");
		var toolbar = dojo.byId("pageActions");
		if (toolbar) {	
			dojo.empty(toolbar);
			// The render call may be synch (when called by page glue code that created the service)
			// or asynch (when called after getting a service reference).
			var retn = commandService.renderCommands(toolbar, "dom", item || handler, handler, "tool", !useImage);
			if (retn && retn.then) {
				retn.then(function() {commandService.processURL(window.location.href);});
			} else {
				commandService.processURL(window.location.href);
			} 
		}
		// now page navigation actions
		if (!clientManagesPageNav) {
			toolbar = dojo.byId("pageNavigationActions");
			if (toolbar) {	
				dojo.empty(toolbar);
				commandService.renderCommands(toolbar, "dom", navItem || item || handler, navHandler || handler, "tool", !useImage);  // use true when we want to force toolbar items to text
			}
		}
	}
	
	
	/**
	 * Generates the banner at the top of a page.
	 * @name orion.globalCommands#generateBanner
	 * @function
	 */
	function generateBanner(parentId, serviceRegistry, commandService, prefsService, searcher, handler, /* optional */ editor, /* optional */ escapeProvider) {
		// this needs to come from somewhere but I'm not going to do a separate get for it
		
		var text;
		var parent = dojo.byId(parentId);
		if (!parent) {
			throw "could not find banner parent, id was " + parentId;
		}
				
		// place the HTML fragment from above.
		dojo.place(topHTMLFragment, parent, "only");
		
		var toolbar = dojo.byId("pageToolbar");
		if (toolbar) {
			dojo.place(toolbarFragment, toolbar, "only");
		} else {
			toolbar = dojo.create ("div", {id: "pageToolbar", "class": "toolbar layoutBlock"}, "titleArea", "after");
			dojo.place(toolbarFragment, toolbar, "only");
		}
		
		// Set up a custom parameter collector that slides out of the toolbar.
		commandService.setParameterCollector("tool", new CommandParameterCollector(toolbar));

		
		// place an empty div for keyAssist
		dojo.place('<div id="keyAssist" style="display: none" class="keyAssistFloat" role="list" aria-atomic="true" aria-live="assertive"></div>', document.body, "last");

		
		// generate primary nav links. 
		var primaryNav = dojo.byId("primaryNav");
		if (primaryNav) {
			// Note that the shape of the "orion.page.link" extension is not in any shape or form that could be considered final.
			// We've included it to enable experimentation. Please provide feedback on IRC or bugzilla.
			
			// The shape of a contributed navigation link is (for now):
			// info - information about the navigation link (object).
			//     required attribute: name - the name of the navigation link
			//     required attribute: id - the id of the navigation link
			//     required attribute: href - the URL for the navigation link
			//     optional attribute: image - a URL to an icon representing the link (currently not used, may use in future)
			var navLinks= serviceRegistry.getServiceReferences("orion.page.link");
			for (var i=0; i<navLinks.length; i++) {
				var info = {};
				var propertyNames = navLinks[i].getPropertyNames();
				for (var j = 0; j < propertyNames.length; j++) {
					info[propertyNames[j]] = navLinks[i].getProperty(propertyNames[j]);
				}
				if (info.href && info.name) {
					var link = dojo.create("a", {href: info.href}, primaryNav, "last");
					text = document.createTextNode(info.name);
					dojo.place(text, link, "only");
				}
			}
		}
		
		// hook up search box behavior
		var searchField = dojo.byId("search");
		if (!searchField) {
			throw "failed to generate HTML for banner";
		}
		dojo.connect(searchField, "onkeypress", function(e){
			if (e.charOrCode === dojo.keys.ENTER) {
				if (searcher) {
					if (searchField.value.length > 0) {
						var query = searcher.createSearchQuery(searchField.value);
						window.location = require.toUrl("search/search.html") + "#"+query;
					}
				} else {
					window.alert("Can't search: no search service is available");
				}
			}
		});
		
		// Put page title in title area.  
		var title = dojo.byId("pageTitle");
		if (title) {
			text = document.createTextNode(document.title);
			dojo.place(text, title, "last");
		}
	
		var openResourceDialog = function(searcher, serviceRegistry, /* optional */ editor) {
			var dialog = new orion.widgets.OpenResourceDialog({searcher: searcher, serviceRegistry:serviceRegistry});
			if (editor) {
				dojo.connect(dialog, "onHide", function() {
					editor.getTextView().focus(); // Focus editor after dialog close, Dojo's doesn't work
				});
			}
			window.setTimeout(function() {dialog.show();}, 0);
		};
			
		var openResourceCommand = new mCommands.Command({
			name: "Find File Named...",
			tooltip: "Choose a file by name and open an editor on it",
			id: "eclipse.openResource",
			callback: function(data) {
				openResourceDialog(searcher, serviceRegistry, editor);
			}});
			
		// We need a mod key binding in the editor, for now use the old one (ctrl-shift-r)
		if (editor) {
			editor.getTextView().setKeyBinding(new mKeyBinding.KeyBinding("r", true, true, false), "Find File Named...");
			editor.getTextView().setAction("Find File Named...", function() {
					openResourceDialog(searcher, serviceRegistry, editor);
					return true;
				});
		}
		
		// Toggle trim command
		var toggleBanner = new mCommands.Command({
			name: "Toggle banner and footer",
			tooltip: "Hide or show the page banner and footer",
			id: "orion.toggleTrim",
			callback: function() {
				var layoutWidget = dijit.byId(parent.parentNode.id);
				if (layoutWidget) {
					var header = parent;
					var footer = dojo.byId("footer");
					if (header.style.display === "none") {
						header.style.display = "block";
						footer.style.display = "block";
					} else {
						header.style.display = "none";
						footer.style.display = "none";
					}
					layoutWidget.layout();
				}
				return true;
			}});
		commandService.addCommand(toggleBanner, "global");
		commandService.registerCommandContribution("orion.toggleTrim", 1, "globalActions", null, true, new mCommands.CommandKeyBinding("m", true, true));
		
		if (editor) {
			editor.getTextView().setKeyBinding(new mCommands.CommandKeyBinding('m', true, true), "Toggle Trim");
			editor.getTextView().setAction("Toggle Trim", toggleBanner.callback);
		}
		
		// We are using 't' for the non-editor binding because of git-hub's use of t for similar function
		commandService.addCommand(openResourceCommand, "global");
		commandService.registerCommandContribution("eclipse.openResource", 1, "globalActions", null, true, new mCommands.CommandKeyBinding('t'));
		
		var keyAssistNode = dojo.byId("keyAssist");
		dojo.connect(document, "onkeypress", dojo.hitch(this, function (e){ 
			if (e.charOrCode === dojo.keys.ESCAPE) {
				keyAssistNode.style.display = "none";
			}
		}));
		dojo.connect(document, "onclick", dojo.hitch(this, function(e) {
			var clickNode =  e.target || e.originalTarget || e.srcElement; 
			if (clickNode && clickNode.id !== "keyAssist") {
				keyAssistNode.style.display = "none";
			}
		}));
		if (editor) {
			editor.getTextView().addEventListener("MouseDown", function() {
				keyAssistNode.style.display = "none";
			});
		}
		
		if (escapeProvider) {
			var keyAssistEscHandler = {
				isActive: function() {
					return keyAssistNode.style.display === "block";
				},
				
				cancel: function() {
					if (this.isActive()) {
						keyAssistNode.style.display = "none";
						return true;
					}
					return false;   // not handled
				}
			};
			escapeProvider.addHandler(keyAssistEscHandler);
		}
		
		var keyAssistCommand = new mCommands.Command({
			name: "Show Keys",
			tooltip: "Show a list of all the keybindings on this page",
			id: "eclipse.keyAssist",
			callback: function() {
				if (keyAssistNode.style.display === "none") {
					dojo.empty(keyAssistNode);
					if (editor) {
						dojo.place("<h2>Editor</h2>", keyAssistNode, "last");
						var editorActions = editor.getTextView().getActions(false);
						for(var i=0; i<editorActions.length; i++) {
							var actionName = editorActions[i];
							var bindings = editor.getTextView().getKeyBindings(actionName);
							for (var j=0; j<bindings.length; j++) {
								dojo.place("<span role=\"listitem\">"+mUtil.getUserKeyString(bindings[j])+" = " + actionName + "<br></span>", keyAssistNode, "last");
							}
						}
					}
					dojo.place("<h2>Global</h2>", keyAssistNode, "last");
					commandService.showKeyBindings(keyAssistNode);
					keyAssistNode.style.display = "block";
				} else {
					keyAssistNode.style.display = "none";
				}
				return true;
			}});
		commandService.addCommand(keyAssistCommand, "global");
		commandService.registerCommandContribution("eclipse.keyAssist", 1, "globalActions", null, true, new mCommands.CommandKeyBinding(191, false, true));
		if (editor) {
			editor.getTextView().setKeyBinding(new mCommands.CommandKeyBinding('L', true, true), "Show Keys");
			editor.getTextView().setAction("Show Keys", keyAssistCommand.callback);
		}

		// generate global commands
		var toolbar = dojo.byId("globalActions");
		if (toolbar) {	
			dojo.empty(toolbar);
			// need to have some item, for global scoped commands it won't matter
			var item = handler || {};
			commandService.renderCommands(toolbar, "global", item, handler, "tool");
		}
		
		generateUserInfo(serviceRegistry);
		
		// generate the footer. 
		// TODO The footer div id should not be assumed here
		if (bottomHTMLFragment) {
			var footer = dojo.byId("footer");
			if (footer) {
				dojo.place(bottomHTMLFragment, footer, "only");
			}
		}
		// now that footer containing progress pane is added
		startProgressService(serviceRegistry);

		// force layout
		mUtil.forceLayout(parent.parentNode);
		//every time the user manually changes the hash, we need to load the workspace with that name
		dojo.subscribe("/dojo/hashchange", commandService, function() {
			commandService.processURL(window.location.href);
		});
	}
	
	//return the module exports
	return {
		generateUserInfo: generateUserInfo,
		generateDomCommandsInBanner: generateDomCommandsInBanner,
		generateBanner: generateBanner,
		notifyAuthenticationSite: notifyAuthenticationSite,
		setPendingAuthentication: setPendingAuthentication,
		CommandParameterCollector: CommandParameterCollector,
		getAuthenticationIds: getAuthenticationIds
	};
});
