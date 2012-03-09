/*******************************************************************************
 * @license
 * Copyright (c) 2012 VMware and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 * 
 * Contributors: 
 *		Andrew Eisenberg (VMware) - initial API and implementation
 ******************************************************************************/

/*global define */

define('orion/textview/annotationservice', ['orion/textview/annotations', 'dojo'], function(mAnnotations, dojo) {
	return { AnnotationService : function(serviceRegistry, editor) {
		this._annotationModel = editor.getAnnotationModel();
		this._annotationTypes = {};
		this.registerAnnotationType = function(event) {
			this._annotationTypes[event.type] = function() {
						this.type = event.type;
						this.title = event.title;
						this.style = event.style;
						this.html = event.html;
						this.overviewStyle = event.overviewStyle;
						this.rangeStyle = event.rangeStyle;
			};
			editor.addAnnotationType(event.type);
		};
		
		this.addAnnotations = function(event) {
			var Annotation = this._annotationTypes[event.type];
			if (Annotation) {
				this._annotationModel.removeAnnotations(event.type);
				for (var i = 0; i < event.ranges.length; i++) {
					var annotation = new Annotation();
					for (var prop in event.ranges[i]) {
						if (event.ranges[i].hasOwnProperty(prop)) {
							annotation[prop] = event.ranges[i][prop];
						}
					}
					this._annotationModel.addAnnotation(annotation);
				}
			}
		};

		var annotationsService = serviceRegistry.getService("orion.edit.annotations");
		if (annotationsService) {
			annotationsService.addEventListener("registerAnnotationType", dojo.hitch(this, "registerAnnotationType"));
			annotationsService.addEventListener("addAnnotations", dojo.hitch(this, "addAnnotations"));
		}
	} };
});