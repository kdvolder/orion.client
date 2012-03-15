/*******************************************************************************
 * @license
 * Copyright (c) 2012 Contributors
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 *
 * Contributors:
 *     Andrew Eisenberg (vmware) - initial API and implementation
 *******************************************************************************/
 /*global define console */
define("markOccurrences", [], function() {
	// private variable
	var _annotationProvider = {
		_serviceProvider : null,
		setServiceProvider : function(serviceProvider) { this._serviceProvider = serviceProvider; },
		modelChanged : function() {
			if (this._serviceProvider) {
				this._serviceProvider.dispatchEvent("registerAnnotationType", {
					type: "orion.annotation.markoccurrences", 
					style: { "font-weight": "bold" }, 
					rangeStyle: {styleClass: "annotationOverview currentLine"},
					html: "<div class='annotationHTML currentLine'></div>",
					overviewStyle: {styleClass: "annotationOverview currentLine"}
				});
			}	
		},
		pushAnnotations : function(ranges) {
			if (ranges && ranges.length > 0) {
				console.log("All locations: " + JSON.stringify(ranges));
				this._serviceProvider.dispatchEvent("addAnnotations", {
					type: "orion.annotation.markoccurrences",
					ranges: ranges
				});
			}
		}
	};


	function isIdentifierStart(char) {
		return (/[\$a-zA-Z_]/).exec(char) !== null;
	}

	function isIdentifierPart(char) {
		return (/\w|\$|_/).exec(char) !== null;
	}

	function isIdentifier(word) {
		if (!word || word.length === 0) {
			return false;
		}
		if (!isIdentifierStart(word.charAt(0))) {
			return false;
		}
		for (var i = 1; i < word.length; i++) {
			if (!isIdentifierPart(word.charAt(i))) {
				return false;
			}
		}
		return true;
	}

	function findCurrentWord(start, end, buffer) {
		// ensure that if caret is after last char of word, then we still see the word
		start--;
		while (start > 0 && isIdentifierPart(buffer.charAt(start))) {
			start--;
		}
		if (start > 0 || !isIdentifierPart(buffer.charAt(start))) {
			start++;
		}
		while (end < buffer.length && isIdentifierPart(buffer.charAt(end))) {
			end++;
		}
		var word = buffer.substring(start, end);
		if (isIdentifier(word)) {
			return word;
		} else {
			return null;
		}
	}


	function findLocations(buffer, toFind) {
		if (!toFind) {
			return [];
		}
		var lastIndex = -1,
			result = [];
		while (true) {
			lastIndex = buffer.indexOf(toFind, lastIndex + 1);

			if (lastIndex === -1) {
				break;
			}

			// must check the boundary of the word before choosing it
			var prevChar = buffer.charAt(lastIndex - 1);
			var nextChar = buffer.charAt(lastIndex + toFind.length);
			if (!isIdentifierPart(prevChar) && !isIdentifierPart(nextChar)) {
				result.push({
					start: lastIndex,
					end: lastIndex + toFind.length,
					title: "Occurrence of '" + toFind + "'"
				});
			}
		}
		return result;
	}

	return {
		markOccurrences: {
			onModelChanging: function(e) {
				_annotationProvider.modelChanged();
			},
			onSelection: function(e) {
				if (e.text) {
					var current = findCurrentWord(e.newValue.start, e.newValue.end, e.text);
					if (current) {
						console.log("Current selection: " + current);
					} else {
						console.log("Identifier is not selected");
					}
					var ranges = findLocations(e.text, current);
					_annotationProvider.pushAnnotations(ranges);
				}
			}
		},
		
		// expose this object for the tests only
		_testObj : {
			findLocations : findLocations,
			findCurrentWord : findCurrentWord,
			isIdentifier : isIdentifier
		},
		
		annotationProvider : _annotationProvider
	};
});