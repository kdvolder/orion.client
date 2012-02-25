/*global require define setTimeout */
/**
 * This module provides methods to retrieve information about the 'current' directory. 
 */ 
define(['dojo', 'orion/bootstrap', 'orion/fileClient'], function (dojo, mBootstrap, mFileClient) {

	var fileClient;
	var exports = {};

	//The current path. I.e. the working dir relative to which we will execute commands on the server.
	var currentTreeNode = null;

	/**
	 * Make sure that there is a currentTreeNode and call given callback on the tree node
	 * as soon as its available.
	 */
	function withCurrentTreeNode(doit) {
		if (currentTreeNode===null) {
			var location = dojo.hash() || "";
			fileClient.loadWorkspace(location).then(function (node) {
				currentTreeNode = node;
				doit(node);
			});
		} else {
			//Wrapped in a setTimeout to ensure it always executed as later scheduled event.
			//otherwise the execution order will be different depending on whether currentTreeNode==null
			setTimeout(function () {
				doit(currentTreeNode);
			});
		}
	}
	exports.withCurrentTreeNode = withCurrentTreeNode;

	function setCurrentTreeNode(node) {
		currentTreeNode = node;
		if (currentTreeNode && currentTreeNode.Location) {
			dojo.hash(currentTreeNode.Location);
		}
	}
	exports.setCurrentTreeNode = setCurrentTreeNode;
	
	/**
	 * Calls the callback function 'k' with the children of a given node.
	 * If the children are available the callback function is called immediately otherwise 
	 * the children will be retrieved and the callback function called whenever the children
	 * become available.
	 */
	function withChildren(node, k) {
		if (node.Children) {
			k(node.Children);
		} else if (node.ChildrenLocation) {
			fileClient.fetchChildren(node.ChildrenLocation).then(function (children) {
				node.Children = children; // cache for later.
				k(children);
			});
		}
	}
	exports.withChildren = withChildren;
	
	function withCurrentChildren(k) {
		withCurrentTreeNode(function (node) {
			withChildren(node, k);
		});
	}
	exports.withCurrentChildren = withCurrentChildren;
	
	dojo.ready(function() {
		mBootstrap.startup().then(function(core) {
			var serviceRegistry = core.serviceRegistry;
			fileClient = new mFileClient.FileClient(serviceRegistry);
		});
	});

	return exports;	

});