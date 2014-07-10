﻿/**
 * Firebolt core file
 * @version 0.7.5
 * @author Nathan Woltman
 * @copyright 2014 Nathan Woltman
 * @license MIT https://github.com/FireboltJS/Firebolt/blob/master/LICENSE.txt
 */

(function(window, document, Array, Object, decodeURIComponent, encodeURIComponent, getComputedStyle, parseFloat) {

"use strict";

//#region =========================== Private ================================

/**
 * Calls the passed in function on each item in the enumerable.
 * 
 * @private
 * @param {Function} fn - The function to call on each item.
 * @returns {Enumerable} `this`
 * @this An enumerable object such as Array or NodeList.
 */
function callOnEach(fn) {
	return function() {
		var len = this.length,
			i = 0;
		for (; i < len; i++) {
			fn.apply(this[i], arguments);
		}
		return this;
	};
}

/** 
 * Calls the passed in function on each element in a NodeCollection.
 * 
 * @private
 * @param {Function} fn - The function to call on each element.
 * @returns {NodeCollection|NodeList|HTMLCollection} A reference to the NodeCollection.
 */
function callOnEachElement(fn) {
	return function() {
		var len = this.length,
			i = 0;
		for (; i < len; i++) {
			if (this[i].nodeType === 1) {
				fn.apply(this[i], arguments);
			}
		}
		return this;
	};
}

/*
 * Converts a string separated by dashes to its camelCase equivalent.
 * Used to translate CSS property names to their DOM style-object property names.
 * 
 * Note: Gecko browsers require style-object property names to start with an upper-case letter
 * if the CSS name starts with a dash (i.e. `-moz-binding` would need to be converted to `MozBinding`).
 * Because of this, strings starting with a dash will be capitalized in Gecko browsers and left to start
 * with a lower-case letter in all other browsers.
 * 
 * @example
 * camelize('background-color');    // -> 'backgroundColor'
 * camelize('-moz-box-orient');     // -> 'MozBoxOrient'
 * camelize('-ms-perspective');     // -> 'msPerspective'
 * camelize('-webkit-user-select'); // -> 'webkitUserSelect'
 */
function camelize(str) {
	return str.replace(rgxCamelizables, camelizer);
}

/*
 * Pre-defined so that an anonymous function does not need to be created each time camelize() is called.
 */
function camelizer(match, p1) {
	return p1 ? p1.toUpperCase() : '';
}

/*
 * @see Firebolt.elem
 */
function createElement(tagName, attributes) {
	var el = document.createElement(tagName);
	return attributes ? el.attr(attributes) : el;
}

/**
 * Creates a new DocumentFragment and (optionally) appends the passed in content to it.
 * 
 * @private
 * @param {ArgumentsList} [content] - List of content to append to the new DocumentFragment.
 * @returns {DocumentFragment} The new fragment.
 */
function createFragment(content) {
	var fragment = document.createDocumentFragment(),
		i = 0,
		item;

	for (; i < content.length; i++) {
		if (isNode(item = content[i])) {
			fragment.appendChild(item);
		}
		else {
			if (typeofString(item)) {
				item = htmlToNodes(item);
			}
			var origLen = item.length,
				j = 1;
			if (origLen) {
				fragment.appendChild(item[0]);
				if (item.length < origLen) { //item is a live NodeList/HTMLCollection
					for (; j < origLen; j++) {
						fragment.appendChild(item[0]);
					}
				}
				else { //item is a static collection of nodes
					for (; j < origLen; j++) {
						fragment.appendChild(item[j]);
					}
				}
			}
		}
	}

	return fragment;
}

/*
 * Used for animations to compute a new CSS value when doing += or -= for some value type.
 * For this to work, the current value (in pixels) must be converted to the value type that is being changed.
 * 
 * @param {Number} curVal - The current CSS value in pixels.
 * @param {Number} changeVal - The amount the current value should change. The value type is indicated by the `type` parameter.
 * @param {String} type - "px", "em", "pt", "%", or "" (empty string, for things like opacity)
 * @param {Element} element - The element who's CSS property is to be changed.
 * @param {String} property - The name of the CSS property being changed.
 */
function cssMath(curVal, changeVal, type, element, property) {
	if (type == 'em') {
		curVal /= parseFloat(getStyleObject(element).fontSize);
	}
	else if (type == 'pt') {
		curVal *= .75; //Close enough (who uses pt anyway?)
	}
	else if (type == '%') {
		curVal *= 100 / parseFloat(getStyleObject(element.parentNode)[property]);
	}

	curVal += changeVal; //Add the change value (which may be negative)

	//Convert invalid negative values to 0
	if (curVal < 0 && /^height|width|padding|opacity/.test(property)) {
		curVal = 0;
	}

	return curVal + type; //i.e. 1.5 + "em" -> "1.5em"
}

/*
 * Uses Object.defineProperty to define the values in the prototypeExtension object on the passed in prototype object
 */
function definePrototypeExtensionsOn(proto) {
	for (any in prototypeExtensions) {
		defineProperty(proto, any, {
			value: prototypeExtensions[any],
			configurable: true,
			writable: true
		});
	}
}

/*
 * @see Firebolt.extend
 */
function extend(target) {
	var numArgs = arguments.length,
		i = 1,
		arg,
		key;

	if (numArgs > 1) {
		if (target === true) { //`target` was actually the `deep` variable; extend recursively
			return extendDeep.apply(0, array_slice.call(arguments, 1));
		}
		if (!target) { //`target` was actually the `deep` variable, but was false
			target = arguments[i++];
		}

		//Extend the target object
		for (; i < numArgs; i++) {
			arg = arguments[i];
			for (key in arg) {
				target[key] = arg[key];
			}
		}
		return target;
	}

	//Extend the Firebolt objects
	extend(NodeCollectionPrototype, target);
	extend(NodeListPrototype, target);
	extend(HTMLCollectionPrototype, target);
}

/*
 * @see Firebolt.extend
 */
function extendDeep(target) {
	var numArgs = arguments.length,
		i = 1,
		arg,
		key,
		val,
		tval;

	//Extend the target object, extending recursively if the new value is a plain object
	for (; i < numArgs; i++) {
		arg = arguments[i];
		for (key in arg) {
			tval = target[key];
			val = arg[key];
			if (tval !== val) {
				if (isPlainObject(val)) {
					val = extendDeep(isPlainObject(tval) ? tval : {}, val);
				}
				target[key] = val;
			}
		}
	}

	return target;
}

/*
 * Returns the status text string for AJAX requests.
 */
function getAjaxErrorStatus(xhr) {
	return xhr.readyState ? xhr.statusText.replace(xhr.status + ' ', '') : '';
}

/** 
 * Returns a function that calls the passed in function on each element in a NodeCollection unless the callback
 * returns true, in which case the result of calling the function on the first element is returned.
 * 
 * @private
 * @param {Function} fn - The function to use as the getter or setter.
 * @param {Function} callback(numArgs, firstArg) - Function to determine if the value of the first element should be returned.
 */
function getFirstSetEachElement(fn, callback) {
	return function(firstArg) {
		var items = this,
			len = items.length,
			i = 0;

		if (!callback(arguments.length, firstArg)) {
			//Set each
			for (; i < len; i++) {
				if (items[i].nodeType === 1) {
					fn.apply(items[i], arguments);
				}
			}
			return items;
		}

		//Get first
		for (; i < len; i++) {
			if (items[i].nodeType === 1) {
				return fn.call(items[i], firstArg); //Only need first arg for getting
			}
		}
	};
}

/*
 * Returns a function that creates a set of elements in a certain direction around
 * a given node (i.e. parents, children, siblings, find -> all descendants).
 * 
 * @param {Function|String} direction - A function or name of a function that retrieves elements for a single node.
 * @param {Function|Number} [sorter] - A function used to sort the union of multiple sets of returned elements.
 * If sorter == 0, return an 'until' Node function.
 */
function getGetDirElementsFunc(direction, sorter) {
	if (sorter) {
		//For NodeCollection.prototype
		return function() {
			var len = this.length;

			//Simple and speedy for one node
			if (len === 1) {
				return direction.apply(this[0], arguments);
			}

			//Build a list of NodeCollections
			var collections = [],
				i = 0;
			for (; i < len; i++) {
				collections.push(direction.apply(this[i], arguments));
			}

			//Union the collections so that the resulting collection contains unique elements and return the sorted result
			return ArrayPrototype.union.apply(NodeCollectionPrototype, collections).sort(sorter);
		};
	}

	//For Node.prototype
	return sorter == 0
		//nextUntil, prevUntil, parentsUntil
		? function(until, filter) {
			var nc = new NodeCollection(),
				node = this,
				stop = getNodeMatchingFunction(until);

			// Traverse all nodes in the direction and add them (or if there is a selector the ones that match it) to the NodeCollection
			// until the `stop()` function returns `true`
			while ((node = node[direction]) && !stop(node)) {
				if (!filter || node.matches(filter)) {
					nc.push(node);
				}
			}

			return nc;
		}

		//nextAll, prevAll, parents
		: function(selector) {
			var nc = new NodeCollection(),
				node = this;

			//Traverse all nodes in the direction and add them (or if there is a selector the ones that match it) to the NodeCollection
			while (node = node[direction]) {
				if (!selector || node.matches(selector)) {
					nc.push(node);
				}
			}

			return nc;
		};
}

/*
 * Returns a function for Node#next(), Node#prev(), NodeCollection#next(), or NodeCollection#prev().
 * 
 * @param {Boolean} [forNode=false] - If truthy, returns the function for Node.prototype (else the NodeCollection version).
 */
function getNextOrPrevFunc(dirElementSibling, forNode) {
	return forNode
		? function(selector) {
			var sibling = this[dirElementSibling];
			return (!selector || sibling && sibling.matches(selector)) && sibling || null;
		}
		: function(selector) {
			var nc = new NodeCollection(),
				i = 0,
				sibling;
			for (; i < this.length; i++) {
				sibling = this[i][dirElementSibling];
				if (sibling && (!selector || sibling.matches(selector))) {
					nc.push(sibling);
				}
			}
			return nc;
		};
}

/* 
 * Returns the function body for Node#[putAfter, putBefore, prependTo, replaceAll]
 * 
 * @param {Function} insertingCallback(newNode, refNode) - The callback that performs the insertion.
 */
function getNodeInsertingFunction(insertingCallback) {
	return function(target) {
		if (typeofString(target)) {
			target = Firebolt(target);
		}
		else if (isNode(target)) {
			insertingCallback(this, target);
			return this;
		}

		var i = target.length;
		if (i--) {
			for (; i > 0; i--) {
				insertingCallback(this.cloneNode(true), target[i]);
			}
			insertingCallback(this, target[0]);
		}

		return this;
	}
}

/* 
 * Returns a function used by Node#closest and Node#[nextUntil, prevUntil, parentsUntil] via getGetDirElementsFunc.
 */
function getNodeMatchingFunction(matcher) {
	return typeofString(matcher) //Match by CSS selector
		? function(node) {
			return node.matches(matcher);
		}
		: matcher && matcher.length //Match by Node[]
			? function(node) {
				return matcher.contains(node);
			}
			//Match by Node (or if `matcher.length === 0`, this will always return false)
			: function(node) {
				return node === matcher;
			};
}

/* Returns the function body for NodeCollection#[putAfter, putBefore, appendTo, prependTo, replaceAll] */
function getPutToOrAllFunction(funcName) {
	return function(target) {
		(typeofString(target) ? Firebolt(target) : target)[funcName](this);

		return this;
	}
}

/* Returns the element's computed style object and uses caching to speed up future lookups. */
function getStyleObject(element) {
	return element.__CSO__ || (element.__CSO__ = getComputedStyle(element));
}

/*
 * Returns a convenience function for setting and clearing timeouts and intervals.
 * @see Function.prototype.delay
 * @see Function.prototype.every
 */
function getTimingFunction(setTiming, clearTiming) {
	return function(delay) {
		var callback = this,
			args = array_slice.call(arguments, 1),

			// Only set the timing callback to be a function that applies the passed in arguments to this function
			// if there are passed in arguments. Otherwise just set the original function as the callback.
			clearRef = setTiming(args.length ? function() {
				callback.apply(window, args);
			} : callback, delay);

		return {
			clear: function() {
				clearTiming(clearRef);
			}
		};
	};
}

/*
 * Takes in the input from `.wrap()` or `.wrapInner()` and returns a new element (or null/undefined) to be the wrapping element.
 */
function getWrappingElement(input) {
	if (typeofString(input)) {
		if (input[0] === '<') { //HTML
			return htmlToNodes(input)[0];
		}
		//CSS selector
		input = $1(input);
	}
	else if (!input.nodeType) { //Element[]
		input = input[0];
	}

	return input && input.cloneNode(true);
}

/*
 * Takes in a wrapping element and returns its deepest first element child (or itself if it has no child elements).
 */
function getWrappingInnerElement(wrapper) {
	while (wrapper.firstElementChild) {
		wrapper = wrapper.firstElementChild;
	}
	return wrapper;
}

/*
 * Takes an HTML string and returns a NodeList created by the HTML.
 * NOTE: Prototype functions added by Firebolt cannot be used in this function in case the context was changed in the Firebolt function
 */
function htmlToNodes(html, detachNodes) {
	//If the HTML is just a single element without attributes, using document.createElement is much faster
	if (rgxSingleTag.test(html)) {
		return new NodeCollection(
			//Create a new element from the HTML tag, retrieved by stripping "<" from the front and "/>" or ">" from the back
			createElement(html.slice(1, html.length - (html[html.length - 2] === '/' ? 2 : 1)))
		);
	}

	//Speedy for most HTML; just create a <body> and set its HTML
	var elem = createElement('body'),
		childs;
	elem.innerHTML = html;
	childs = elem.firstChild;

	//If no elements were created, it might be because browsers won't create certain elements in a body tag
	if (!childs || html[0] === '<' && childs.nodeType !== 1) {
		//The following supports only the creation of table elements
		if (rgxTableLevel1.test(html)) {
			elem = createElement('table');
		}
		else if (html.contains('<tr')) {
			elem = createElement('tbody');
		}
		else if (rgxTableLevel3.test(html)) {
			elem = createElement('tr');
		}

		elem.innerHTML = html;
	}

	childs = elem.childNodes;

	return detachNodes ? childs.remove() : childs;
}

/*
 * Function for inserting a node after a reference node.
 */
function insertAfter(newNode, refNode) {
	refNode.parentNode.insertBefore(newNode, refNode.nextSibling);
}

/*
 * Function for inserting a node before a reference node.
 */
function insertBefore(newNode, refNode) {
	refNode.parentNode.insertBefore(newNode, refNode);
}

/*
 * Used by some "effects" functions to determine if the element's computed display style is "none" 
 */
function isComputedDisplayNone(element) {
	return getStyleObject(element).display == 'none';
}

/*
 * @see Firebolt.isEmptyObject
 */
function isEmptyObject(object) {
	for (var item in object) {
		return false;
	}
	return true;
}

/*
 * Specifically for the Firebolt selector.
 * Determines if the input is actually an HTML string instead of a CSS selector.
 * 
 * Rationale:
 * 
 * The string can only be considered HTML if it contains the tag open character: '<'.
 * Normally, this character should never appear in a CSS selector, however it is possible
 * for an element to have an attribute with a value that contains the '<' character.
 * Here's an example:
 * 
 * <div data-notcool="<tag>"></div>
 * 
 * Hence, this element should be able to be selected with the following CSS selector:
 * 
 * [data-notcool="<tag>"]
 * 
 * So for the string to truly be HTML, not only must it contain the '<' character, but
 * the first instance of that character must also be found in the string before any
 * instance of the '[' character.
 * 
 * The reason the '[' character is not searched for if the index of the '<' character is
 * less that 4 is because the smallest possible CSS selector that contains '<' is this:
 * 
 * [d="<"]
 * 
 * This also means that if '<' is found in the string, we only need to start searching for
 * a '[' beginning at the index 4 less than the index the fist '<' was found at. 
 * 
 * @param {String} str
 * @returns 1 if the string is deemed to be an HTML string; else 0.
 */
function isHtml(str) {
	var idxTag = str.indexOf('<');
	if (idxTag >= 0 && (idxTag < 4 || str.lastIndexOf('[', idxTag - 4) < 0)) {
		return 1;
	}
	return 0;
}

/*
 * @see Firebolt.isPlainObject
 */
function isPlainObject(obj) {
	return typeofObject(obj) && toString.call(obj) == '[object Object]';
}

function isUndefined(value) {
	return value === undefined;
}

/*
 * Prepends a node to a reference node. 
 */
function prepend(newNode, refNode) {
	refNode.insertBefore(newNode, refNode.firstChild);
}

/*
 * Replaces a reference node with a new node.
 */
function replaceWith(newNode, refNode) {
	refNode.parentNode.replaceChild(newNode, refNode);
}

/*
 * Simply returns `false`. For use in Node.prototype.on/off
 */
function returnFalse() {
	return false;
}

/*
 * If the element is hidden, it is shown and the element is returned.
 * If the element is not hidden, 0 is returned.
 */
function showIfHidden(element) {
	return isComputedDisplayNone(element) ? element.show() : 0;
}

function sortDocOrder(a, b) {
	var pos = a.compareDocumentPosition(b);
	if (pos & 4) { //Node a should come first
		pos = -1;
	}
	else if (pos & 1) { //Nodes are in different documents
		pos = 0;
	}
	//else node b should come first (pos is already positive)
	return pos;
}

function sortRevDocOrder(a, b) {
	var pos = a.compareDocumentPosition(b);
	if (pos & 2) { //Node b should come first
		pos = -1;
	}
	else if (pos & 1) { //Nodes are in different documents
		pos = 0;
	}
	//else node a should come first (pos is already positive)
	return pos;
}

/*
 * Given two Nodes who are clones of each other, this function copies data and events from node A to node B.
 * This function will run recursively on the children of the nodes unless `doNotCopyChildNodes` is `true`.
 * 
 * @param {Node} nodeA - The node being copied.
 * @param {Node} nodeB - The node that will receive nodeA's data and events.
 * @param {!Boolean} doNotCopyChildNodes - Inidicates if data and events for child notes should not be copied.
 */
function copyDataAndEvents(nodeA, nodeB, doNotCopyChildNodes) {
	var data = nodeA[Firebolt.expando],
		events = nodeA.__E__;

	//Data
	if (data) {
		//Use Firebolt.data in case the node was created in a different window
		extendDeep(Firebolt.data(nodeB), data);
	}

	//From this point on, the `data` variable is reused as the counter (or property name) in loops

	//Events
	if (events) {
		//Copy event data and set the handler for each type of event
		nodeB.__E__ = extendDeep({}, events);
		for (data in events) {
			nodeB.addEventListener(data, nodeEventHandler);
		}
	}

	//Copy data and events for child nodes
	if (!doNotCopyChildNodes && (nodeA = nodeA.childNodes)) {
		nodeB = nodeB.childNodes;

		//The nodeA and nodeB variables are now the childNodes NodeLists or the original nodes
		for (data = 0; data < nodeA.length; data++) {
			copyDataAndEvents(nodeA[data], nodeB[data]);
		}
	}
}

function typeofObject(value) {
	return typeof value == 'object';
}

function typeofString(value) {
	return typeof value == 'string';
}

var
	/* Browser/Engine detection */
	usesWebkit = 'webkitAppearance' in document.documentElement.style,
	usesGecko = window.mozInnerScreenX != null,
	isIOS = /^iP/.test(navigator.platform), // iPhone, iPad, iPod

	/*
	 * Determines if an item is a Node.
	 * Gecko's instanceof Node is faster (but might want to check if that's because it caches previous calls).
	 */
	isNode = usesGecko
		? function(obj) {
			return obj instanceof Node;
		}
		: function(obj) {
			return obj && obj.nodeType;
		},

	/*
	 * Local variables that are compressed when this file is minified.
	 */
	prototype = 'prototype',
	ArrayPrototype = Array[prototype],
	ElementPrototype = Element[prototype],
	EventPrototype = Event[prototype],
	FunctionPrototype = Function[prototype],
	HTMLElementPrototype = HTMLElement[prototype],
	HTMLSelectElementPrototype = HTMLSelectElement[prototype],
	NodePrototype = Node[prototype],
	NodeListPrototype = NodeList[prototype],
	HTMLCollectionPrototype = HTMLCollection[prototype],
	StringPrototype = String[prototype],

	//Helpers
	isArray = Array.isArray,
	array_slice = ArrayPrototype.slice,
	array_remove, //Will get set to Array.prototype.remove
	defineProperty = Object.defineProperty,
	keys = Object.keys,

	//Property strings
	nextElementSibling = 'nextElementSibling',
	previousElementSibling = 'previousElementSibling',

	/* Pre-built RegExps */
	rgxTableLevel1 = /<t(?:he|b|f)|<c(?:ap|ol)/i, //Matches <thead>, <tbody>, <tfoot>, <caption>, <col>, <colgroup>
	rgxTableLevel3 = /<t(?:d|h)\b/, //Matches <td>, <th>
	rgxGetOrHead = /GET|HEAD/i, //Determines if a request is a GET or HEAD request
	rgxDomain = /\/?\/\/(?:\w+\.)?(.*?)(?:\/|$)/,
	rgxDifferentNL = /^(?:af|ap|be|ea|ins|prep|pu|rep|toggleC)|wrap|remove(?:Class)?$/, //Determines if the function is different for NodeLists
	rgxNotId = /[ .,>:[+~\t-\f]/,    //Matches other characters that cannot be in an id selector
	rgxNotClass = /[ #,>:[+~\t-\f]/, //Matches other characters that cannot be in a class selector
	rgxAllDots = /\./g,
	rgxNotTag = /[^A-Za-z]/,
	rgxSingleTag = /^<[A-Za-z]+\/?>$/, //Matches a single HTML tag such as "<div/>"
	rgxNonWhitespace = /\S+/g,
	rgxSpaceChars = /[ \t-\f]+/, //From W3C http://www.w3.org/TR/html5/single-page.html#space-character
	rgxFormButton = /button|file|reset|submit/, //Matches input element types that are buttons
	rgxCheckableElement = /checkbox|radio/,     //Matches checkbox or radio input element types
	rgxCamelizables = usesGecko ? /-+([a-z])/g : /^-+|-+([a-z])/g, //Matches dashed parts of CSS property names
	rgxNoParse = /^\d+\D/, //Matches strings that look like numbers but have non-digit characters

	/* AJAX */
	timestamp = Date.now(),
	oldCallbacks = [],
	ajaxSettings = {
		accept: {
			'*': '*/*',
			html: 'text/html',
			json: 'application/json, text/javascript',
			script: 'text/javascript, application/javascript, application/ecmascript, application/x-ecmascript',
			text: 'text/plain',
			xml: 'application/xml, text/xml'
		},
		async: true,
		contentType: 'application/x-www-form-urlencoded; charset=UTF-8',
		headers: {'X-Requested-With': 'XMLHttpRequest'},
		isLocal: /^(?:file|.*-extension|widget):\/\//.test(location.href),
		jsonp: 'callback',
		jsonpCallback: function() {
			var callback = oldCallbacks.pop() || Firebolt.expando + "_" + (timestamp++);
			this[callback] = true;
			return callback;
		},
		type: 'GET',
		url: location.href,
		xhr: XMLHttpRequest
	},

	/* Animations */
	ANIMATION_DEFAULT_DURATION = 400,
	ANIMATION_DEFAULT_EASING = 'swing',

	/* Misc */
	_$ = window.$, //Save the `$` variable in case something else is currently using it
	iframe = createElement('iframe'), //Used for subclassing Array and determining default CSS values
	any, //Arbitrary variable that may be used for whatever -- keep no references so this can be garbage collected

//#endregion Private


//#region ============================ Array =================================

/**
 * @class Array
 * @classdesc The JavaScript Array object.
 * @mixes Object
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array|Array - JavaScript | MDN}
 */

prototypeExtensions = {
	/* Private reference to the constructor */
	__C__: Array,

	/**
	 * Returns a copy of the array with all "empty" items (as defined by {@linkcode Firebolt.isEmpty}) removed.
	 * 
	 * @function Array.prototype.clean
	 * @param {Boolean} [allowEmptyStrings=false] - Set this to `true` to keep zero-length strings in the array.
	 * @returns {Array} A clean copy of the array.
	 * @see Firebolt.isEmpty
	 */
	clean: function(allowEmptyStrings) {
		var cleaned = [],
			i = 0;
		for (; i < this.length; i++) {
			if (!Firebolt.isEmpty(this[i], allowEmptyStrings)) {
				cleaned.push(this[i]);
			}
		}
		return cleaned;
	},

	/**
	 * Removes all elements from the array.
	 * 
	 * @function Array.prototype.clear
	 */
	clear: function() {
		this.length = 0;
	},

	/**
	 * Returns a duplicate of the array, leaving the original array intact.
	 * 
	 * @function Array.prototype.clone
	 * @returns {Array} A copy of the array.
	 */
	clone: function() {
		var len = this.length,
			clone = new this.__C__(len),
			i = 0;
		for (; i < len; i++) {
			clone[i] = this[i];
		}
		return clone;
	},

	/**
	 * Determines if the input item is in the array.
	 * 
	 * @function Array.prototype.contains
	 * @returns {Boolean} `true` if the item is in the array; else `false`.
	 */
	contains: function(e) {
		return this.indexOf(e) >= 0;
	},

	/**
	 * Returns a new array with all of the values of this array that are not in any of the input arrays (performs a set difference).
	 * 
	 * __Note:__ The input arrays can be array-like objects (like a function's `arguments` object).
	 * 
	 * @function Array.prototype.diff
	 * @param {...Array} arrays - One or more array-like objects.
	 * @returns {Array}
	 */
	diff: function(array, others) {
		//The union can be applied to the Array prototype because it is basically the same thing as an empty array
		return this.without.apply(this, others ? array.union.apply(ArrayPrototype, arguments) : array);
	},

	/**
	 * Executes a function on each item in the array.  
	 * The difference between this function and `Array#forEach` is that you can cancel the iteration by returning
	 * `false` in the callback and the array is returned (allowing for function chaining).  
	 * The difference between this function and `Array#every` is that only returning `false` in the callback will
	 * cancel the iteration (instead of any falsy value) and the array is returned instead of a boolean.
	 * 
	 * @function Array.prototype.each
	 * @param {function(*, Number, Array)} callback(value,index,array) - The function that will be executed on each item.
	 * @returns {Array} this
	 */
	each: function(callback) {
		return Firebolt.each(this, callback, 1);
	},

	/**
	 * Determines if the arrays are equal by doing a shallow comparison of their elements using strict equality.  
	 * NOTE: The order of elements in the arrays DOES matter. The elements must be found in the same order for the arrays to be considered equal.
	 * 
	 * @function Array.prototype.equals
	 * @param {Array|Enumerable} array - Array or other enumerable object that has a `length` property.
	 * @returns {Boolean} `true` if the arrays are equal; else `false`.
	 */
	equals: function(array) {
		if (this === array) { //Easy check
			return true;
		}
		if (this.length !== array.length) {
			return false;
		}
		for (var i = 0; i < array.length; i++) {
			if (this[i] !== array[i]) {
				return false;
			}
		}
		return true;
	},

	/**
	 * Retrieve an item in the array.
	 * 
	 * @example
	 * var array = [1, 2, 3];
	 * array.get(0);  // 1
	 * array.get(1);  // 2
	 * array.get(-1); // 3
	 * array.get(-2); // 2
	 * array.get(5);  // undefined
	 * 
	 * @function Array.prototype.get
	 * @param {Number} index - A zero-based integer indicating which item to retrieve.
	 * @returns {*} The item at the specified index.
	 */
	get: function(index) {
		return this[index < 0 ? index + this.length : index];
	},

	/**
	 * Returns an array containing every item that is in both this array and the input array.
	 * 
	 * @function Array.prototype.intersect
	 * @param {Array|Enumerable} array - Array or other enumerable object that has a `length` property.
	 * @returns {Array} An array that is the intersection of this array and the input array.
	 * @example
	 * [1, 2, 3].intersect([2, 3, 4]);  // returns [2, 3]
	 */
	intersect: function(array) {
		var intersection = new this.__C__(),
			i = 0;
		for (; i < array.length; i++) {
			if (this.contains(array[i]) && intersection.indexOf(array[i]) < 0) {
				intersection.push(array[i]);
			}
		}
		return intersection;
	},

	/**
	 * Removes all occurrences of the passed in items from the array if they exist in the array.
	 * 
	 * @function Array.prototype.remove
	 * @param {...*} items - Items to remove from the array.
	 * @returns {Array} A reference to the array (so it's chainable).
	 */
	remove: array_remove = function() {
		for (var rindex, i = 0; i < arguments.length; i++) {
			while ((rindex = this.indexOf(arguments[i])) >= 0) {
				this.splice(rindex, 1);
				if (!this.length) {
					return this; //Exit early since there is nothing left to remove
				}
			}
		}

		return this;
	},

	/**
	 * Returns an array containing every distinct item that is in either this array or the input array.
	 * 
	 * @function Array.prototype.union
	 * @param {...Array} array - One or more arrays or array-like objects.
	 * @returns {Array} An array that is the union of this array and the input array.
	 * @example
	 * [1, 2, 3].union([2, 3, 4, 5]);  // returns [1, 2, 3, 4, 5]
	 */
	union: function() {
		var union = this.uniq(),
			i = 0,
			array,
			j;
		for (; i < arguments.length; i++) {
			array = arguments[i];
			for (j = 0; j < array.length; j++) {
				if (union.indexOf(array[j]) < 0) {
					union.push(array[j]);
				}
			}
		};
		return union;
	},

	/**
	 * Returns a duplicate-free clone of the array.
	 * 
	 * @example
	 * // Unsorted
	 * [1, 2, 3, 2, 1, 4].uniq();      // returns [1, 2, 3, 4]
	 * // Sorted
	 * [1, 2, 2, 3, 4, 4].uniq();      // returns [1, 2, 3, 4]
	 * [1, 2, 2, 3, 4, 4].uniq(true);  // returns [1, 2, 3, 4] but faster than on the previous line
	 * 
	 * @function Array.prototype.uniq
	 * @param {Boolean} [isSorted=false] - If the input array's contents are sorted and this is set to `true`,
	 * a faster algorithm will be used to create the unique array.
	 * @returns {Array}
	 */
	uniq: function(isSorted) {
		var uniq = new this.__C__(),
			i = 0;

		for (; i < this.length; i++) {
			if (isSorted) {
				if (this[i] !== this[i + 1]) {
					uniq.push(this[i]);
				}
			}
			else if (uniq.indexOf(this[i]) < 0) {
				uniq.push(this[i]);
			}
		}

		return uniq;
	},

	/**
	 * Returns a copy of the current array without any elements from the input parameters.
	 * 
	 * @function Array.prototype.without
	 * @param {...*} items - One or more items to leave out of the returned array.
	 * @returns {Array}
	 * @example
	 * [1, 2, 3, 4, 5, 6].without(3, 4, 6);  // returns [1, 2, 5]
	 */
	without: isIOS
		//Special, faster function for iOS (http://jsperf.com/arrwout), which also helps make Array#diff faster
		? function() {
			var array = new this.__C__(),
				i = 0;
			for (; i < this.length; i++) {
				if (ArrayPrototype.indexOf.call(arguments, this[i]) < 0) {
					array.push(this[i]);
				}
			}
			return array;
		}
		: function() {
			var array = new this.__C__(),
				i = 0,
				j;
			skip:
			for (; i < this.length; i++) {
				for (j = 0; j < arguments.length; j++) {
					if (this[i] === arguments[j]) {
						continue skip;
					}
				}
				array.push(this[i]);
			}
			return array;
		}
};

//Define the properties on Array.prototype
definePrototypeExtensionsOn(ArrayPrototype);

//#endregion Array


//#region =========================== Element ================================

/**
 * @class Element
 * @classdesc The HTML DOM Element interface.
 * @mixes Node
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/element|Element - Web API Interfaces | MDN}
 */

/**
 * Returns a list of the elements within the element that match the specifed CSS selector.  
 * Alias of `Element.querySelectorAll()`.
 * 
 * @function Element.prototype.$
 * @param {String} selector
 * @returns {NodeList} A list of selected elements.
 */
/* see Element.prototype.$QSA */

/**
 * Returns the first element within the element that matches the specified CSS selector.  
 * Alias of `Element.querySelector()`.
 * 
 * @function Element.prototype.$1
 * @param {String} selector
 * @returns {?Element}
 */
/* see Element.prototype.$QS */

/**
 * Returns a list of the elements within the element with the specified class name.  
 * Alias of `Element.getElementsByClassName()`.
 * 
 * @function Element.prototype.$CLS
 * @param {String} className
 * @returns {HTMLCollection|NodeList} A collection of elements with the specified class name.
 */
ElementPrototype.$CLS = ElementPrototype.getElementsByClassName;

/**
 * Returns a list of the elements within the element with the specified tag name.  
 * Alias of `Element.getElementsByTagName()`.
 * 
 * @function Element.prototype.$TAG
 * @param {String} tagName
 * @returns {HTMLCollection|NodeList} A collection of elements with the specified tag name.
 */
ElementPrototype.$TAG = ElementPrototype.getElementsByTagName;

/**
 * Returns the first element within the element that matches the specified CSS selector.  
 * Alias of `Element.querySelector()`.
 * 
 * @function Element.prototype.$QS
 * @param {String} selector
 * @returns {?Element}
 */
ElementPrototype.$QS = ElementPrototype.$1 = ElementPrototype.querySelector;

/**
 * Returns a list of the elements within the element that match the specifed CSS selector.  
 * Alias of `Element.querySelectorAll()`.
 * 
 * @function Element.prototype.$QSA
 * @param {String} selector
 * @returns {NodeList} A list of selected elements.
 */
ElementPrototype.$QSA = ElementPrototype.$ = ElementPrototype.querySelectorAll;

/**
 * Gets the value of the element's specified attribute.
 * 
 * @function Element.prototype.attr
 * @param {String} attribute - The name of the attribute who's value you want to get.
 * @returns {String} The value of the attribute.
 */
/**
 * Sets the element's specified attribute.
 * 
 * @function Element.prototype.attr
 * @param {String} attribute - The name of the attribute who's value should be set.
 * @param {String} value - The value to set the specified attribute to.
 */
/**
 * Sets the specified attributes of the element.
 * 
 * @function Element.prototype.attr
 * @param {Object} attributes - An object of attribute-value pairs to set.
 */
ElementPrototype.attr = function(attrib, value) {
	if (isUndefined(value)) {
		if (typeofString(attrib)) {
			return this.getAttribute(attrib); //Get
		}

		//Reuse the value parameter since it is undefined
		for (value in attrib) {
			this.setAttribute(value, attrib[value]); //Set multiple
		}
	}
	else {
		this.setAttribute(attrib, value); //Set single
	}

	return this;
};

/**
 * Gets the element's stored data object.
 * 
 * @function Element.prototype.data
 * @returns {Object} The element's stored data object.
 */
/**
 * Get the value at the named data store for the element as set by .data(key, value) or by an HTML5 data-* attribute.
 * 
 * @function Element.prototype.data
 * @param {String} key - The name of the stored data.
 * @returns {*} The value of the stored data.
 */
/**
 * Stores arbitrary data associated with the element.
 * 
 * @function Element.prototype.data
 * @param {String} key - A string naming the data to set.
 * @param {*} value - Any arbitrary data to store.
 */
/**
 * Stores arbitrary data associated with the element.
 * 
 * @function Element.prototype.data
 * @param {Object} obj - An object of key-value pairs to add to the element's stored data.
 */
ElementPrototype.data = function(key, value) {
	return Firebolt.data(this, key, value, 1); //Pass in 1 to tell the generic function the object is an element
};

/**
 * Gets the descendants of the element, filtered by a selector, collection of elements, or a single element.
 * 
 * __Protip:__ Since this method has multiple input types, type-checking is performed on the input to determine how the result will be calculated.
 * If want to find descendant elements using a CSS selector, you should use the native `element.querySelectorAll()` or a Firebolt alias for
 * that function (`.$QSA()` or `.$()`).
 * 
 * @function Element.prototype.find
 * @param {String|Element|Element[]} selector - A CSS selector, a collection of elements, or a single element used to match descendant elements against.
 * @returns {NodeList|NodeCollection}
 */
ElementPrototype.find = function(selector) {
	if (typeofString(selector)) {
		return this.$(selector);
	}

	//Return the intersection of all of the element's descendants with the elements in the input collection or single element (in an array)
	return this.$('*').intersect(selector.nodeType ? [selector] : selector);
};

/**
 * Determines if the element matches the specified CSS selector.
 * 
 * @function Element.prototype.matches
 * @param {String} selector - A CSS selector string.
 * @returns {Boolean} `true` if the element matches the selector; else `false`.
 */
ElementPrototype.matches = ElementPrototype.matches || ElementPrototype.webkitMatchesSelector || ElementPrototype.mozMatchesSelector || ElementPrototype.msMatchesSelector || ElementPrototype.oMatchesSelector;

/**
 * Gets the value of the element's specified property.
 * 
 * @function Element.prototype.prop
 * @param {String} property - The name of the property who's value you want to get.
 * @returns {?} The value of the property being retrieved.
 */
/**
 * Sets the specified property of the element.
 * 
 * @function Element.prototype.prop
 * @param {String} property - The name of the property to be set.
 * @param {*} value - The value to set the property to.
 */
/**
 * Sets the specified properties of the element.
 * 
 * @function Element.prototype.prop
 * @param {Object} properties - An object of property-value pairs to set.
 */
ElementPrototype.prop = function(prop, value) {
	if (isUndefined(value)) {
		if (typeofString(prop)) {
			return this[prop]; //Get
		}
		extend(this, prop); //Set multiple
	}
	else {
		this[prop] = value; //Set single
	}

	return this;
};

/**
 * Removes the specified attribute from the element.
 * 
 * @function Element.prototype.removeAttr
 * @param {String} attribute - The name of the attribute to remove.
 */
ElementPrototype.removeAttr = function(attribute) {
	this.removeAttribute(attribute);

	return this;
};

/**
 * Removes a previously stored piece of Firebolt data.  
 * When called without any arguments, all data is removed.
 * 
 * @function Element.prototype.removeData
 * @param {String} [name] - The name of the data to remove.
 */
/**
 * Removes previously stored Firebolt data.  
 * When called without any arguments, all data is removed.
 * 
 * @function Element.prototype.removeData
 * @param {Array|String} [list] - An array or space-separated string naming the pieces of data to remove.
 */
ElementPrototype.removeData = function(input) {
	return Firebolt.removeData(this, input, 1); //Pass in 1 to tell the generic function the passed in object is an element
};

/**
 * Removes the specified property from the element.
 * 
 * @function Element.prototype.removeProp
 * @param {String} propertyName - The name of the property to remove.
 */
ElementPrototype.removeProp = function(propertyName) {
	delete this[propertyName];

	return this;
};

//#endregion Element


//#region =========================== Firebolt ===============================

/**
 * The Firebolt namespace object and selector function (can also be referenced by the synonyms `FB` and `$`).
 * @namespace Firebolt
 */

/**
 * The global Firebolt function (can also be referenced by the synonyms `FB` and `$`).  
 * Returns a list of the elements either found in the DOM that match the passed in CSS selector or created by passing an HTML string.
 * 
 * __Note:__ Unlike jQuery, only a document may be passed as the `context` variable. This is because there is a simple,
 * native method for selecting elements with an element as the root for the selection. The method is `element.querySelectorAll()`. If
 * the element was created in the same document as Firebolt was loaded, it will have two aliases for `.querySelectorAll()` &mdash;
 * {@linkcode Element#$|.$()} and {@linkcode Element#$QSA|.$QSA()}. If you want to write really performant and concise code, use some
 * of {@link Element|Element's other native functions} as well.
 * 
 * @global
 * @variation 2
 * @function Firebolt
 * @param {String} string - A CSS selector string or an HTML string.
 * @param {Document} [context] - A DOM Document to serve as the context when selecting or creating elements.
 * @returns {NodeList|HTMLCollection|NodeCollection} A NodeList/HTMLCollection of selected elements or a NodeCollection of newly created elements.
 * @throws {SyntaxError} When an invalid CSS selector is passed as the string.
 * 
 * @example
 * $('button.btn-success'); // Returns all button elements with the class "btn-success"
 * $('str <p>content</p>'); // Creates a set of nodes and returns it as a NodeList (in this case ["str ", <p>content</p>])
 * $.elem('div');         // Calls Firebolt's method to create a new div element 
 */
function Firebolt(str, context) {
	var nc, elem;

	if (context) {
		//Set the scoped document variable to the context document and re-call this function
		document = context;
		nc = Firebolt(str);

		//Restore the document and return the retrieved object
		document = window.document;
		return nc;
	}

	if (str[0] === '#') { //Check for a single ID
		if (!rgxNotId.test(str)) {
			nc = new NodeCollection();
			if (elem = document.getElementById(str.slice(1))) {
				nc.push(elem);
			}
			return nc;
		}
	}
	else if (str[0] === '.') { //Check for a single class name
		if (!rgxNotClass.test(str)) {
			return document.getElementsByClassName(str.slice(1).replace(rgxAllDots, ' '));
		}
	}
	else if (!rgxNotTag.test(str)) { //Check for a single tag name
		return document.getElementsByTagName(str);
	}
	else if (isHtml(str)) { //Check if the string is an HTML string
		return htmlToNodes(str, 1); //Pass in 1 to tell the htmlToNodes function to detach the nodes from their creation container
	}
	return document.querySelectorAll(str);
}

/**
 * Returns a PHP-style associative array (Object) of URL parameters and updates the global {@linkcode $_GET} object at the same time.
 * 
 * @returns {Object.<String, String>}
 * @see $_GET
 * @see {@link http://www.php.net/manual/en/reserved.variables.get.php|PHP: $_GET - Manual}
 * @memberOf Firebolt
 */
Firebolt._GET = function() {
	window.$_GET = {};
	var params = location.search.slice(1).split('&'),
		i = 0,
		key_val;
	for (; i < params.length; i++) {
		key_val = params[i].split('=');
		if (key_val[0]) {
			$_GET[decodeURIComponent(key_val[0])] = decodeURIComponent(key_val[1] || '');
		}
	}
	return $_GET;
};

/**
 * Perform an asynchronous HTTP (Ajax) request.  
 * See the next function description for more information.
 * 
 * @param {String} url - A string containing the URL to which the request will be sent.
 * @param {Object} [settings] - A set of key/value pairs that configure the Ajax request. All settings are optional.
 * @memberOf Firebolt
 */
/**
 * Perform an asynchronous HTTP (Ajax) request.
 * 
 * For documentation, see {@link http://api.jquery.com/jQuery.ajax/|jQuery.ajax()}.  
 * However, Firebolt AJAX requests differ from jQuery's in the following ways:
 * 
 * + Instead of passing a "jqXHR" to callbacks, the native XMLHttpRequest object is passed.
 * + The `context` setting defaults to the XMLHttpRequest object instead of the settings object.
 * + The `contents` and `converters` settings are not supported.
 * + The `ifModifed` settings is currently not supported.
 * + The `data` setting may be a string or a plain object or array to serialize and is appended to the URL as a string for
 * HEAD requests as well as GET requests.
 * + The `processData` setting has been left out because Firebolt will automatically process only plain objects and arrays
 * (so you don't need to set it to `false` to send a DOMDocument or another type of data&emsp;such as a FormData object).
 * + The `global` setting and the global AJAX functions defined by jQuery are not supported.
 * 
 * To get the full set of AJAX features that jQuery provides, use the Firebolt AJAX extension plugin (if there ever is one).
 * 
 * @param {Object} [settings] - A set of key/value pairs that configure the Ajax request. All settings are optional.
 * @returns {XMLHttpRequest} The XMLHttpRequest object this request is using (only for requests where the dataType is not "script" or "jsonp".
 * @memberOf Firebolt
 */
Firebolt.ajax = function(url, settings) {
	//Parameter processing
	if (typeofString(url)) {
		settings = settings || {};
		settings.url = url;
	}
	else {
		settings = url;
	}

	//Merge the passed in settings object with the default values
	settings = extendDeep({}, ajaxSettings, settings);

	url = settings.url;

	//Create the XMLHttpRequest and give it settings
	var xhr = extend(new settings.xhr(), settings.xhrFields),
		async = settings.async,
		beforeSend = settings.beforeSend,
		complete = settings.complete || [],
		completes = typeof complete == 'function' ? [complete] : complete,
		context = settings.context || xhr,
		dataType = settings.dataType,
		dataTypeJSONP = dataType == 'jsonp',
		error = settings.error,
		errors = typeof error == 'function' ? [error] : error,
		crossDomain = settings.crossDomain,
		success = settings.success,
		successes = typeof success == 'function' ? [success] : success,
		timeout = settings.timeout,
		type = settings.type,
		isGetOrHead = rgxGetOrHead.test(type),
		data = settings.data,
		textStatus,
		i;

	function callCompletes(errorThrown) {
		//Execute the status code callback (if there is one that matches the status code)
		if (settings.statusCode) {
			var callback = settings.statusCode[xhr.status];
			if (callback) {
				if (textStatus == 'success') {
					callback.call(context, data, textStatus, xhr);
				}
				else {
					callback.call(context, xhr, textStatus, errorThrown || getAjaxErrorStatus(xhr));
				}
			}
		}
		//Execute all the complete callbacks
		for (i = 0; i < completes.length; i++) {
			completes[i].call(context, xhr, textStatus, errorThrown || getAjaxErrorStatus(xhr));
		}
	}

	function callErrors(errorThrown) {
		if (error) {
			//Execute all the error callbacks
			for (i = 0; i < errors.length; i++) {
				errors[i].call(context, xhr, textStatus, errorThrown || getAjaxErrorStatus(xhr));
			}
		}
	}

	function callSuccesses() {
		//Handle last-minute JSONP
		if (dataTypeJSONP) {
			//Call errors and return if the JSONP function was not called
			if (!responseContainer) {
				textStatus = 'parsererror';
				return callErrors(jsonpCallback + " was not called");
			}

			//Set the data to the first item in the response
			data = responseContainer[0];
		}

		textStatus = 'success';

		if (success) {
			//Call the user-supplied data filter function if there is one
			if (settings.dataFilter) {
				data = settings.dataFilter(data, dataType);
			}
			//Execute all the success callbacks
			for (i = 0; i < successes.length; i++) {
				successes[i].call(context, data, textStatus, xhr);
			}
		}
	}

	//Cross domain checking
	if (!crossDomain && url.contains('//')) {
		var domainMatch = location.href.match(rgxDomain) || [];
		crossDomain = url.indexOf(domainMatch[1]) < 0;
	}

	if (data) {
		//Process data if necessary
		if (isArray(data) || isPlainObject(data)) {
			data = Firebolt.param(data, settings.traditional);
		}

		//If the request is a GET or HEAD, append the data string to the URL
		if (isGetOrHead) {
			url = url.appendParams(data);
			data = undefined; //Clear the data so it is not sent later on
		}
	}

	if (dataTypeJSONP) {
		var jsonpCallback = settings.jsonpCallback,
			responseContainer,
			overwritten;
		if (!typeofString(jsonpCallback)) {
			jsonpCallback = settings.jsonpCallback();
		}

		//Append the callback name to the URL
		url = url.appendParams(settings.jsonp + '=' + jsonpCallback);

		// Install callback
		overwritten = window[jsonpCallback];
		window[jsonpCallback] = function() {
			responseContainer = arguments;
		};

		//Push JSONP cleanup onto complete callback array
		completes.push(function() {
			// Restore preexisting value
			window[jsonpCallback] = overwritten;

			if (settings[jsonpCallback]) {
				//Save the callback name for future use
				oldCallbacks.push(jsonpCallback);
			}

			//Call if `overwritten` was a function and there was a response
			if (responseContainer && typeof overwritten == 'function') {
				overwritten(responseContainer[0]);
			}

			responseContainer = overwritten = undefined;
		});
	}

	if ((crossDomain || settings.isLocal) && (dataType == 'script' || dataTypeJSONP)) {
		//Prevent caching unless the user explicitly set cache to true
		if (settings.cache !== true) {
			url = url.appendParams('_=' + (timestamp++));
		}

		var script = createElement('script').prop({
			charset: settings.scriptCharset || '',
			src: url,
			onload: function() {
				if (timeout) {
					clearTimeout(timeout);
				}
				callSuccesses();
				callCompletes();
			},
			onerror: function(ex) {
				if (timeout) {
					clearTimeout(timeout);
				}
				textStatus = 'error';
				callErrors(ex.type);
				callCompletes(ex.type);
			}
		}).prop(isOldIE ? 'defer' : 'async', async);

		//Always remove the script after the request is done
		completes.push(function() {
			script.remove();
		});

		if (beforeSend && beforeSend.call(context, xhr, settings) === false) {
			//If the beforeSend function returned false, do not send the request
			return false;
		}

		//Add timeout
		if (timeout) {
			timeout = setTimeout(function() {
				script.remove();
				textStatus = 'timeout';
				callErrors();
				callCompletes(textStatus);
			}, timeout);
		}

		//Append the script to the head of the document to load it
		document.head.appendChild(script);
	}
	else {
		//Data just for real XHRs
		var headers = settings.headers,
			lastState = 0,
			statusCode;

		if (settings.mimeType) {
			xhr.overrideMimeType(settings.mimeType);
		}

		//Prevent caching if necessary
		if (isGetOrHead && settings.cache === false) {
			url = url.appendParams('_=' + (timestamp++));
		}

		//The main XHR function for when the request has loaded (and track states in between for abort or timeout)
		xhr.onreadystatechange = function() {
			if (xhr.readyState !== 4) {
				lastState = xhr.readyState;
				return;
			}

			//For browsers that don't natively support XHR timeouts
			if (timeout) {
				clearTimeout(timeout);
			}

			statusCode = xhr.status;

			if (statusCode >= 200 && statusCode < 300 || statusCode === 304 || settings.isLocal && xhr.responseText) { //Success
				if (statusCode === 204 || type === 'HEAD') { //If no content
					textStatus = 'nocontent';
				}
				else if (statusCode === 304) { //If not modified
					textStatus = 'notmodified';
				}
				else {
					textStatus = 'success';
				}

				try {
					//Only need to process data of there is content
					if (textStatus != 'nocontent') {
						//If the data type has not been set, try to figure it out
						if (!dataType) {
							var contentType = xhr.getResponseHeader('Content-Type');
							if (contentType) {
								if (contentType.contains('/xml')) {
									dataType = 'xml';
								}
								else if (contentType.contains('/json')) {
									dataType = 'json';
								}
								else if (contentType.contains('script')) {
									dataType = 'script';
								}
							}
						}

						//Set data based on the data type
						if (dataType == 'xml') {
							data = xhr.responseXML;
						}
						else if (dataType == 'json') {
							data = JSON.parse(xhr.responseText);
						}
						else {
							data = xhr.responseText;

							if (dataType == 'script' || dataTypeJSONP) {
								Firebolt.globalEval(data);
							}
						}
					}
					else {
						data = '';
					}

					//Invoke the success callbacks
					callSuccesses();
				}
				catch (e) {
					textStatus = 'parsererror';
					callErrors();
				}
			}
			else { //Error
				if (textStatus != 'timeout') {
					textStatus = lastState < 3 ? 'abort' : 'error';
				}
				callErrors();
			}

			//Invoke the complete callbacks
			callCompletes();
		};

		//Open the request
		xhr.open(type, url, async, settings.username, settings.password);

		//Set the content type header if the user has changed it from the default or there is data to submit
		if (settings.contentType != ajaxSettings.contentType || data) {
			headers['Content-Type'] = settings.contentType;
		}

		//If the data type has been set, set the accept header
		if (settings.dataType) {
			headers['Accept'] = settings.accept[settings.dataType] || settings.accept['*'];
		}

		//Set the request headers in the XHR
		for (i in headers) {
			xhr.setRequestHeader(i, headers[i]);
		}

		if (beforeSend && beforeSend.call(context, xhr, settings) === false) {
			//If the beforeSend function returned false, do not send the request
			return false;
		}

		//Set timeout if there is one
		if (timeout > 0) {
			timeout = setTimeout(function() {
				textStatus = 'timeout';
				xhr.abort();
			}, timeout);
		}

		//Send the XHR
		xhr.send(data);
	}

	return xhr;
};

/* Expose the AJAX settings (just because jQuery does this, even though it's not documented). */
Firebolt.ajaxSettings = ajaxSettings;

/**
 * Sets default values for future Ajax requests. Use of this function is not recommended.
 * 
 * @param {Object} options - A set of key/value pairs that configure the default Ajax settings. All options are optional.
 * @memberOf Firebolt
 */
Firebolt.ajaxSetup = function(options) {
	return extendDeep(ajaxSettings, options);
}

/**
 * Gets the object's stored data object.
 * 
 * @function Firebolt.data
 * @param {Object} object - An object. This can be anything that has Object in its prototype chain.
 * @returns {Object} The object's stored data object.
 */
/**
 * Get the value at the named data store for the object as set by {@linkcode Firebolt.data|Firebolt.data(key, value)}
 * or by an HTML5 data-* attribute if the object is an {@link Element}.
 * 
 * @function Firebolt.data
 * @param {Object} object - An object. This can be anything that has Object in its prototype chain.
 * @param {String} key - The name of the stored data.
 * @returns {*} The value of the stored data.
 */
/**
 * Stores arbitrary data associated with the object.
 * 
 * @function Firebolt.data
 * @param {Object} object - An object. This can be anything that has Object in its prototype chain.
 * @param {String} key - A string naming the data to set.
 * @param {*} value - Any arbitrary data to store.
 * @returns {Object} The passed in object.
 */
/**
 * Stores arbitrary data associated with the object.
 * 
 * @function Firebolt.data
 * @param {Object} object - An object. This can be anything that has Object in its prototype chain.
 * @param {Object} data - An object of key-value pairs to add to the object's stored data.
 * @returns {Object} The passed in object.
 */
Firebolt.data = function(object, key, value, isElement) {
	var expando = Firebolt.expando,
		dataStore = object[expando],
		dataAttributes,
		i;

	if (!dataStore) {
		//Define a non-enumerable object
		defineProperty(object, expando, {
			value: dataStore = {}
		});

		//If the object is an Element, try loading "data-*" attributes
		if (isElement) {
			var attributes = object.attributes,
				attrib,
				val;

			dataAttributes = {};

			for (i = 0; i < attributes.length; i++) {
				attrib = attributes[i];
				if (attrib.name.startsWith('data-')) {
					if (!rgxNoParse.test(val = attrib.value)) {
						//Try to parse the value
						try {
							val = JSON.parse(val);
						}
						catch (e) { }
					}
					//Set the value in the data attributes object (remembering to remove the "data-" part from the name)
					dataAttributes[attrib.name.slice(5)] = val;
				}
			}

			//Save the data attributes if there are any
			if (!isEmptyObject(dataAttributes)) {
				object.__DA__ = dataAttributes;
			}
		}
	}

	if (isElement && (dataAttributes = object.__DA__)) {
		//Add the data attributes to the data store if it does not already have the key
		for (i in dataAttributes) {
			if (isUndefined(dataStore[i])) {
				dataStore[i] = dataAttributes[i];
			}
		}
	}

	if (isUndefined(value)) {
		if (typeofObject(key)) {
			extend(dataStore, key); //Set multiple
		}
		else {
			return isUndefined(key) ? dataStore : dataStore[key]; //Get data object or value
		}
	}
	else {
		dataStore[key] = value; //Set value
	}

	return object;
};

/**
 * A generic iterator function, which can be used to iterate over both objects and arrays.
 * Arrays and array-like objects with a length property (such as a NodeLists) are iterated
 * by numeric index, from 0 to length-1. Other objects are iterated via their named properties.
 * Iteration can be cancelled by returning `false` in the callback.
 * 
 * @function Firebolt.each
 * @param {Array} array - The array or array-like object to iterate over.
 * @param {function(*, Number, Array)} callback(value,index,array) - The function that will be executed on each item.
 * @param {Boolean} [isArrayLike] - A hint you can give to Firebolt to tell it to use this version of the function so
 * it can skip checking the object's type.
 * @returns {Array} The input array.
 */
/**
 * A generic iterator function, which can be used to iterate over both objects and arrays.
 * Arrays and array-like objects with a length property (such as a NodeLists) are iterated
 * by numeric index, from 0 to length-1. Other objects are iterated via their named properties.
 * Iteration can be cancelled by returning `false` in the callback.
 * 
 * @function Firebolt.each
 * @param {Object} object - The object to iterate over.
 * @param {function(*, String, Object)} callback(value,key,object) - The function that will be executed on each item.
 * @returns {Object} The input object.
 */
Firebolt.each = function(obj, callback, isArrayLike) {
	var len = obj.length,
		i = 0;
	if (isArrayLike || typeof len == 'number' && typeof obj != 'function' && obj.toString() != '[object Window]') {
		while (i < len && callback(obj[i], i++, obj) !== false);
	}
	else {
		for (i in obj) {
			if (callback(obj[i], i, obj) === false) break;
		}
	}
	return obj;
};

/*
 * Maps easing types to CSS transition functions.
 * The easing extension can be used to fill this out more.
 */
Firebolt.easing = {
	swing: 'cubic-bezier(.36,0,.64,1)' //Essentially the same as jQuery (curve is identical in WolframAlpha)
};

/**
 * Creates a new element with the specified tag name and attributes (optional).  
 * Partially an alias of `document.createElement()`.
 * 
 * @function Firebolt.elem
 * @param {String} tagName
 * @param {Object} [attributes] - The JSON-formatted attributes that the element should have once constructed.
 * @returns {Element}
 */
Firebolt.elem = createElement;

/* The key where Firebolt stores data using $.data() */
Firebolt.expando = 'FB' + Date.now() + 1 / Math.random();

/**
 * Extend the "Firebolt object" (a.k.a. NodeCollection, NodeList, and HTMLCollection).
 * 
 * @function Firebolt.extend
 * @param {Object} object - An object with properties to add to the prototype of the collections returned by Firebolt.
 */
/**
 * Merge the contents of one or more objects into the first object.
 * 
 * @function Firebolt.extend
 * @param {Object} target - The object that will receive the new properties.
 * @param {...Object} object - One or more objects whose properties will be added to the target object.
 * @returns {Object} The target object.
 */
/**
 * Recursively merge the contents of one or more objects into the target object.
 * 
 * @function Firebolt.extend
 * @param {Boolean} deep - If `true`, the merge becomes recursive (performs a deep copy on object values).
 * @param {Object} target - The object that will receive the new properties.
 * @param {...Object} object - One or more objects whose properties will be merged into the target object.
 * @returns {Object} The target object.
 */
Firebolt.extend = extend;

/**
 * Creates a new DocumentFragment and (optionally) appends the passed in content to it.
 * 
 * @param {...(String|Node|Node[])} [content] - One or more HTML strings, nodes, or collections of nodes to append to the fragment.
 * @returns {DocumentFragment} The newly created document fragment.
 * @memberOf Firebolt
 */
Firebolt.frag = function() {
	return createFragment(arguments);
};

/**
 * Load data from the server using a HTTP GET request.
 * 
 * @param {String} url - A string containing the URL to which the request will be sent.
 * @param {String|Object} [data] - A string or object that is sent to the server with the request as a query string.
 * @param {Function} [success(data, textStatus, xhr)] - A callback function that is executed if the request succeeds.
 * Required if dataType is provided, but can be `null` in that case.
 * @param {String} [dataType] - The type of data expected from the server. Default: Intelligent Guess (xml, json, script, or html).
 * @memberOf Firebolt
 */
Firebolt.get = function(url, data, success, dataType) {
	//Organize arguments into their proper places
	if (typeof data == 'function') {
		dataType = dataType || success; //Using || because when getJSON is called dataType will have a value
		success = data;
		data = '';
	}
	else if (typeofString(success)) {
		dataType = success;
		success = 0;
	}

	return Firebolt.ajax({
		url: url,
		data: data,
		success: success,
		dataType: dataType
	});
};

/**
 * Load JSON-encoded data from the server using a HTTP GET request.
 * 
 * @param {String} url - A string containing the URL to which the request will be sent.
 * @param {String|Object} [data] - A string or object that is sent to the server with the request as a query string.
 * @param {Function} [success(data, textStatus, xhr)] - A callback function that is executed if the request succeeds.
 * @memberOf Firebolt
 */
Firebolt.getJSON = function(url, data, success) {
	return Firebolt.get(url, data, success, 'json');
};

/**
 * Load a JavaScript file from the server using a HTTP GET request, then execute it.
 * 
 * @param {String} url - A string containing the URL to which the request will be sent.
 * @param {Function} [success(data, textStatus, xhr)] - A callback function that is executed if the request succeeds.
 * @memberOf Firebolt
 */
Firebolt.getScript = function(url, success) {
	return Firebolt.get(url, '', success, 'script');
};

/**
 * Executes some JavaScript code globally.
 * 
 * @param {String} code - The JavaScript code to execute.
 * @memberOf Firebolt
 */
Firebolt.globalEval = function(code) {
	var indirect = eval;

	code = code.trim();

	if (code) {
		//If the code begins with a strict mode pragma, execute code by injecting a script tag into the document.
		if (code.lastIndexOf('use strict', 1) === 1) {
			createElement('script').prop('text', code).appendTo(document.head).remove();
		}
		else {
			//Otherwise, avoid the DOM node creation, insertion and removal by using an inderect global eval
			indirect(code);
		}
	}
};

/**
 * Determines if the object has any Firebolt data associated with it.
 * 
 * @param {Object} object - An object. This can be anything that has Object in its prototype chain.
 * @returns {Boolean} `true` if the object has stored Firebolt data; else `false`.
 * @memberOf Firebolt
 */
Firebolt.hasData = function(object) {
	return !isEmptyObject(object[Firebolt.expando]);
};

/**
 * Determines if the passed in value is considered empty. The value is considered empty if it is one of the following:
 * <ul>
 * <li>`null`</li>
 * <li>`undefined`</li>
 * <li>a zero-length array</li>
 * <li>an empty object (as defined by {@linkcode Firebolt.isEmptyObject})</li>
 * <li>a zero-length string (unless the `allowEmptyString` parameter is set to a truthy value)</li>
 * </ul>
 * 
 * @param {*} value - The value to be tested.
 * @param {Boolean} [allowEmptyString=false] - Set this to true to regard zero-length strings as not empty.
 * @returns {Boolean}
 * @memberOf Firebolt
 */
Firebolt.isEmpty = function(value, allowEmptyString) {
	return value == null || typeofString(value) && !allowEmptyString && !value || typeofObject(value) && isEmptyObject(value);
};

/**
 * Determines if an object is empty (contains no enumerable properties).
 * 
 * @function Firebolt.isEmptyObject
 * @param {Object} object - The object to be tested.
 * @returns {Boolean}
 */
Firebolt.isEmptyObject = isEmptyObject;

/**
 * Determines if a variable is a plain object.
 * 
 * @function Firebolt.isPlainObject
 * @param {*} obj - The item to test.
 */
Firebolt.isPlainObject = isPlainObject;

/**
 * Indicates if the user is on a touchscreen device.
 * 
 * @property {Boolean} isTouchDevice - `true` if the user is on a touchscreen device; else `false`.
 * @memberOf Firebolt
 */
Firebolt.isTouchDevice = 'ontouchstart' in window || 'onmsgesturechange' in window;

/**
 * Relinquishes Firebolt's control of the global `$` variable (restoring its previous value in the process).
 * 
 * @returns Firebolt
 * @memberOf Firebolt
 */
Firebolt.noConflict = function() {
	if (window.$ === Firebolt) {
		window.$ = _$;
	}

	return Firebolt;
};

/**
 * Creates a serialized representation of an array or object, suitable for use in a URL query string or Ajax request.  
 * Unlike jQuery, arrays will be serialized like objects when `traditional` is not `true`, with the indices of
 * the array becoming the keys of the query string parameters.
 * 
 * @param {Array|Object} obj - An array or object to serialize.
 * @param {Boolean} traditional - A Boolean indicating whether to perform a traditional "shallow" serialization.
 * @returns {String} The serialized string representation of the array or object.
 */
Firebolt.param = function(obj, traditional) {
	return traditional ? serializeTraditional(obj) : serializeRecursive(obj);
};

/* Inspired by: http://stackoverflow.com/questions/1714786/querystring-encoding-of-a-javascript-object */
function serializeRecursive(obj, prefix) {
	var str = '',
		key,
		value,
		cur;
	for (key in obj) {
		value = obj[key];
		if (!isEmptyObject(value)) {
			cur = prefix ? prefix + '[' + key + ']' : key;
			str += (str ? '&' : '')
				+ (typeofObject(value) ? serializeRecursive(value, cur)
											: encodeURIComponent(cur) + '=' + encodeURIComponent(value));
		}
	}
	return str;
}

function serializeTraditional(obj) {
	var qs = '',
		key,
		value,
		i;
	for (key in obj) {
		//Add the key
		qs += (qs ? '&' : '') + encodeURIComponent(key);

		//Add the value
		value = obj[key];
		if (isArray(value)) {
			for (i = 0; i < value.length; i++) {
				//Add key again for multiple array values
				qs += (i ? '&' + encodeURIComponent(key) : '') + '=' + encodeURIComponent(value[i]);
			}
		}
		else {
			qs += '=' + encodeURIComponent(value);
		}
	}

	return qs;
}

/**
 * Load data from the server using a HTTP POST request.
 * 
 * @param {String} url - A string containing the URL to which the request will be sent.
 * @param {String|Object} [data] - A string or object that is sent to the server with the request.
 * @param {Function} [success(data, textStatus, xhr)] - A callback function that is executed if the request succeeds.
 * Required if dataType is provided, but can be `null` in that case.
 * @param {String} [dataType] - The type of data expected from the server. Default: Intelligent Guess (xml, json, script, or html).
 * @memberOf Firebolt
 */
Firebolt.post = function(url, data, success, dataType) {
	//Organize arguments into their proper places
	if (typeof data == 'function') {
		dataType = success;
		success = data;
		data = '';
	}
	else if (typeofString(success)) {
		dataType = success;
		success = 0;
	}

	return Firebolt.ajax({
		type: 'POST',
		url: url,
		data: data,
		success: success,
		dataType: dataType
	});
};

/**
 * Specify a function to execute when the DOM is fully loaded.  
 * Executes the function immediately if the DOM has already finished loading.
 * 
 * @memberOf Firebolt
 * @param {Function} callback - A function to execute once the DOM has been loaded.
 */
Firebolt.ready = function(callback) {
	if (document.readyState == 'loading') {
		document.addEventListener('DOMContentLoaded', callback);
	}
	else {
		callback();
	}
};

/**
 * Removes a previously stored piece of Firebolt data from an object.  
 * When called without any arguments, all data is removed.
 * 
 * @function Firebolt.removeData
 * @param {Object} object - An object. This can be anything that has Object in its prototype chain.
 * @param {String} [name] - The name of the data to remove.
 * @returns {Object} The passed in object.
 */
/**
 * Removes previously stored Firebolt data from an object.  
 * When called without any arguments, all data is removed.
 * 
 * @function Firebolt.removeData
 * @param {Object} object - An object. This can be anything that has Object in its prototype chain.
 * @param {Array|String} [list] - An array or space-separated string naming the pieces of data to remove.
 * @returns {Object} The passed in object.
 */
Firebolt.removeData = function(object, list, isElement) {
	var dataObject = object[Firebolt.expando],
		dataAttributes = isElement && object.__DA__,
		i = 0;

	if (isUndefined(list)) {
		list = keys(dataObject); //Select all items for removal
	}
	else if (typeofString(list)) {
		list = list.split(' ');
	}

	for (; i < list.length; i++) {
		delete dataObject[list[i]];

		if (dataAttributes) {
			//Try deleting the data attribute in case it was saved to the element
			delete dataAttributes[list[i]];
		}
	}

	if (dataAttributes && isEmptyObject(dataAttributes)) {
		//Delete the data attributes object from the element
		delete object.__DA__;
	}

	return object;
};

/**
 * Creates a TextNode from the provided string.
 * 
 * @memberOf Firebolt
 * @param {String} text - The string used to construct the TextNode.
 * @returns {TextNode}
 */
Firebolt.text = function(text) {
	return document.createTextNode(text);
};

/**
 * Converts an array-like object (such as a function's `arguments` object) to a true {@link Array}.
 * 
 * @example
 * function tester() {
 *     console.log( $.makeArray(arguments) );
 *     console.log( $.makeArray(arguments, 1) );
 * }
 * tester(1, 2, 3);  // logs "[1, 2, 3]" and "[2, 3]"
 * 
 * @param {Object} obj - Any object to turn into a native array.
 * @param {Number} [startIndex=0] - An index in the input object at which to start creating the new array from.
 * @returns {Array}
 */
Firebolt.makeArray = function(array, index) {
	return array_slice.call(array, index);
};

//#endregion Firebolt


//#region =========================== Function ===============================

/**
 * @class Function
 * @classdesc The JavaScript Function object.
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Function|Function - JavaScript | MDN}
 */

/**
 * Delays a function call for the specified number of milliseconds.
 * 
 * __ATTENTION:__ Inside the function that is being delayed, `this` will refer to the `window` object.
 * 
 * @example <caption>Call a function at a later time</caption>
 * window.alert.delay(2000, 'alert!');  // Waits 2 seconds, then opens an alert that says "alert!"
 * 
 * @example <caption>Set a timeout for a function but cancel it before it can be called</caption>
 * var ref = window.alert.delay(2000, 'alert!');  // Sets the alert to be called in 2 seconds and saves a reference to the returned object
 * 
 * //----- Before 2 seconds ellapses -----
 * ref.clear();  // Prevents the alert function from being called
 * 
 * @function Function.prototype.delay
 * @param {Number} delay - The number of milliseconds to wait before calling the functions.
 * @param {...*} [args] - Arguments the function will be called with.
 * @returns {Object} An object that can be used to cancel the callback before it is executed by calling `object.clear()`.
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/Window.setTimeout|window.setTimeout - Web API Interfaces | MDN}
 */
FunctionPrototype.delay = getTimingFunction(setTimeout, clearTimeout);

/**
 * Executes the function repeatedly, with a fixed time delay between each call to the function.
 * 
 * __ATTENTION:__ Inside the function that is being delayed, `this` will refer to the `window` object.
 * 
 * @example <caption>Set a function to repeat every 2 seconds and later stop it from continuing</caption>
 * function logStuff() {
 *     console.log('stuff');
 * }
 * 
 * var ref = logStuff.every(2000);  // Waits 2 seconds, then logs "stuff" to the console and continues to do so every 2 seconds
 * 
 * //----- Later -----
 * ref.clear();  // Stops the logging calls
 * 
 * @function Function.prototype.every
 * @param {Number} delay - The number of milliseconds to wait between function calls.
 * @param {...*} [args] - Arguments the function will be called with.
 * @returns {Object} An object that can be used to cancel further calls to the function by calling `object.clear()`.
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/Window.setInterval|window.setInterval - Web API Interfaces | MDN}
 */
FunctionPrototype.every = getTimingFunction(setInterval, clearInterval);

//#endregion Function


//#region =========================== Globals ================================

/*
 * Firebolt reference objects.
 */
window.$ = window.FB = window.Firebolt = Firebolt;

/**
 * PHP-style associative array (Object) of URL parameters. This object is created when the page loads and thus contains the URL's
 * query parameters at that time. However, it is possible to change the URL through JavaScript functions such as `history.pushState()`.
 * If the URL may have changed and you need to the most recent query parameters, use Firebolt's {@linkcode Firebolt._GET|$._GET()}
 * function, which also updates the $_GET object when it is called.
 * 
 * @global
 * @constant
 * @name $_GET
 * @type {Object.<String, String>}
 * @see {@link http://www.php.net/manual/en/reserved.variables.get.php|PHP: $_GET - Manual}
 */
Firebolt._GET(); // Just call the function to update the global $_GET object

/**
 * Returns the first element within the document with the specified ID. Can also be called by the alias `$ID()`.  
 * Alias of `document.getElementById()`.
 * 
 * @global
 * @function $$
 * @param {String} id - A case-sensitive string representing the unique ID of the element being sought.
 * @returns {?Element} The element with the specified ID or `null` if there is no such element in the document.
 */
window.$$ = window.$ID = function(id) {
	return document.getElementById(id);
};

/**
 * Returns the first element within the document that matches the specified CSS selector.
 * If no element matches the selector, `null` or `undefined` may be returned.  
 * Alias of `document.querySelector()`, but with optimizations if a single class name, id, or tag name is input as the selector.
 * 
 * @global
 * @param {String} selector
 * @returns {?Element}
 */
window.$1 = function(selector) {
	if (selector[0] === '.') { //Check for a single class name
		if (!rgxNotClass.test(selector)) {
			return document.getElementsByClassName(selector.slice(1).replace(rgxAllDots, ' '))[0];
		}
	}
	else if (selector[0] === '#') { //Check for a single id
		if (!rgxNotId.test(selector)) {
			return document.getElementById(selector.slice(1));
		}
	}
	else if (!rgxNotTag.test(selector)) { //Check for a single tag name
		return document.getElementsByTagName(selector)[0];
	}
	//else
	return document.querySelector(selector);
};

/**
 * Returns a list of the elements within the document with the specified class name.  
 * Alias of `document.getElementsByClassName()`.
 * 
 * @global
 * @param {String} className
 * @returns {HTMLCollection|NodeList} A list of elements with the specified class name.
 */
window.$CLS = function(className) {
	return document.getElementsByClassName(className);
};

/**
 * Returns the first element within the document with the specified ID. Can also be called by the alias `$$()`.  
 * Alias of `document.getElementById()`.
 * 
 * @global
 * @function $ID
 * @param {String} id - A case-sensitive string representing the unique ID of the element being sought.
 * @returns {?Element} The element with the specified ID or `null` if there is no such element in the document.
 */

/**
 * Returns a list of the elements within the document with the specified name attribute.  
 * Alias of `document.getElementsByName()`.
 * 
 * @global
 * @param {String} name
 * @returns {HTMLCollection|NodeList} A collection of elements with the specified name attribute.
 */
window.$NAME = function(name) {
	return document.getElementsByName(name);
};

/**
 * Returns a list of the elements within the document with the specified tag name.  
 * Alias of `document.getElementsByTagName()`.
 * 
 * @global
 * @param {String} tagName
 * @returns {HTMLCollection|NodeList} A collection of elements with the specified tag name.
 */
window.$TAG = function(tagName) {
	return document.getElementsByTagName(tagName);
};

/**
 * Returns the first element within the document that matches the specified CSS selector.  
 * Alias of `document.querySelector()`.
 * 
 * @global
 * @param {String} selector
 * @returns {?Element}
 */
window.$QS = function(selector) {
	return document.querySelector(selector);
};

/**
 * Returns all elements within the document that match the specified CSS selector.  
 * Alias of `document.querySelectorAll()`.
 * 
 * @global
 * @param {String} selector
 * @returns {?Element}
 */
window.$QSA = function(selector) {
	return document.querySelectorAll(selector);
};

//#endregion Globals


//#region ========================= HTMLCollection ===========================

/**
 * @class HTMLCollection
 * @classdesc
 * The DOM HTMLCollection interface.  
 * Has all the same functions as {@link NodeList} (plus one other native function).
 * @see NodeList
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/HTMLCollection|HTMLCollection - Web API Interfaces | MDN}
 */

/* Nothing to do. HTMLCollection gets its functions defined in the NodeList section. */

//#endregion HTMLCollection


//#region ========================== HTMLElement =============================

/**
 * @class HTMLElement
 * @classdesc
 * The HTML DOM HTMLElement interface.  
 * It should be noted that all functions that do not have a specified return value, return the calling object,
 * allowing for function chaining.
 * @mixes Element
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement|HTMLElement - Web API Interfaces | MDN}
 */

/**
 * @summary Adds the specified class(es) to the element.
 * 
 * @description
 * __Note:__ Unlike jQuery, the format of the space-separated classes required by Firebolt is strict. Each class must name
 * be separated by only a single space character and there cannot be whitespace at the beginning or end of the string.
 * ```javascript
 * element.addClass('one  two').removeClass('three ');  // Bad syntax
 * element.addClass('one two').removeClass('three');    // Correct syntax
 * ```
 * 
 * @function HTMLElement.prototype.addClass
 * @param {String} className - One or more space-separated classes to be added to the element's class attribute.
 * @throws {TypeError} The input `value` must be string. __Note:__ This error will not be thrown if `value` is not a string and
 * the element does not have a className value at the time of invocation.
 */
HTMLElementPrototype.addClass = function(value) {
	//Only need to determine which classes should be added if this element's className has a value
	if (this.className) {
		var newClasses = value.split(' '),
			i = 0;
		value = this.className; //Reuse the value argument to build the new class name
		for (; i < newClasses.length; i++) {
			if (!this.hasClass(newClasses[i])) {
				value += ' ' + newClasses[i];
			}
		}
	}

	//Set the new value
	this.className = value;

	return this;
};

/*
 * More performant version of Node#afterPut for HTMLElements.
 * @see Node#afterPut
 */
HTMLElementPrototype.afterPut = function() {
	var i = arguments.length - 1,
		arg;

	for (; i >= 0; i--) {
		if (typeofString(arg = arguments[i])) {
			this.insertAdjacentHTML('afterend', arg);
		}
		else {
			//When arg is a collection of nodes, create a fragment by passing the collection in an array
			//(that is the form of input createFragment expects since it normally takes a function's arg list)
			insertAfter(isNode(arg) ? arg : createFragment([arg]), this);
		}
	}

	return this;
};

/**
 * @summary Performs a custom animation of a set of CSS properties.
 * 
 * @description
 * Just like HTMLElement#css, CSS properties must be specified the same way they would be in a style sheet since Firebolt
 * does not append "px" to input numeric values (i.e. 1 != 1px).
 * 
 * Unlike jQuery, an object that specifies different easing types for different properties is not supported.
 * (Should it be supported? [Tell me why](https://github.com/FireboltJS/Firebolt/issues).)
 * 
 * However, relative properties (indicated with `+=` or `-=`) and the `toggle` indicator are supported (although only
 * the `"t"` is needed for toggling since Firebolt only looks at the first character to check if it is a "t").
 * 
 * For more `easing` options, use Firebolt's [easing extension](https://github.com/FireboltJS/firebolt-extensions/tree/master/easing)
 * (or just grab some functions from it and use them as the `easing` parameter).
 * 
 * @function HTMLElement.prototype.animate
 * @param {Object} properties - An object of CSS properties and values that the animation will move toward.
 * @param {Number} [duration=400] - A number of milliseconds that specifies how long the animation will run.
 * @param {String} [easing="swing"] - A string indicating which easing function to use for the transition. The string can be any
 * [CSS transition timing function](https://developer.mozilla.org/en-US/docs/Web/CSS/transition-timing-function) or "swing".
 * @param {Function} [complete()] - A function to call once the animation is complete. Inside the function, `this` will
 * refer to the element that was animated.
 * @see {@link http://api.jquery.com/animate/ | .animate() | jQuery API Documentation}
 */
HTMLElementPrototype.animate = function(properties, duration, easing, complete) {
	//Massage arguments into their proper places
	if (isUndefined(duration) || typeof duration == 'function') {
		complete = duration;
		duration = ANIMATION_DEFAULT_DURATION;
		easing = ANIMATION_DEFAULT_EASING;
	}
	else if (typeofString(duration)) {
		complete = easing;
		easing = duration;
		duration = ANIMATION_DEFAULT_DURATION;
	}
	else if (!typeofString(easing)) {
		complete = easing;
		easing = ANIMATION_DEFAULT_EASING;
	}

	var _this = this,
		i = 0,
		propertyNames = keys(properties),
		inlineStyle = _this.style,
		currentStyle = getStyleObject(_this),
		isDisplayNone = isComputedDisplayNone(_this),
		originalInlineTransition = inlineStyle.transition || inlineStyle.webkitTransition,
		overflowToRestore,
		cssTextToRestore,
		hideOnComplete,
		camelProp,
		prop,
		val;

	//Parse properties
	for (; i < propertyNames.length; i++) {
		camelProp = camelize(prop = propertyNames[i]);

		//Should set overflow to "hidden" when animating height or width properties
		if ((prop == 'height' || prop == 'width') && isUndefined(overflowToRestore)) {
			overflowToRestore = inlineStyle.overflow;
			inlineStyle.overflow = 'hidden';
		}

		if (typeofString(val = properties[prop])) {
			if (val[0] === 't') { //"toggle"
				if (isDisplayNone) {
					if (isUndefined(cssTextToRestore)) {
						_this.show();
						cssTextToRestore = inlineStyle.cssText;
					}
					val = currentStyle[camelProp];
					inlineStyle[camelProp] = 0;
				}
				else {
					val = 0;
					cssTextToRestore = isUndefined(cssTextToRestore) ? inlineStyle.cssText : cssTextToRestore;
					hideOnComplete = 1;
				}
			}
			else if (val[1] === '=') { //"+=value" or "-=value"
				val = cssMath(parseFloat(currentStyle[camelProp]), parseFloat(val.replace('=', '')), val.replace(/.*\d/, ''), _this, camelProp);
			}

			properties[prop] = val; //Set the value in the object of properties in case it changed
		}
	}

	//Inline the element's current CSS styles (even if some properties were set to 0 in the loop because setting all at once here prevents bugs)
	_this.css(_this.css(propertyNames));

	//Set the CSS transition style
	inlineStyle.transition = inlineStyle.webkitTransition = 'all ' + duration + 'ms ' + (Firebolt.easing[easing] || easing);

	//Set the new values to transition to as soon as possible
	setTimeout(function() {
		_this.css(properties); //Setting the CSS values starts the transition

		//Set a timeout to call the complete callback after the transition is done
		setTimeout(function() {
			if (isUndefined(cssTextToRestore)) {
				//Give the element back its original inline transition style
				inlineStyle.transition = inlineStyle.webkitTransition = originalInlineTransition;
			}
			else {
				inlineStyle.cssText = cssTextToRestore;
			}

			if (typeofString(overflowToRestore)) {
				inlineStyle.overflow = overflowToRestore;
			}

			if (hideOnComplete) {
				_this.hide();
			}

			if (complete) {
				complete.call(_this); //Call the complete function in the context of the element
			}
		}, duration);
	}, 0);

	return _this;
};

/*
 * More performant version of Node#appendWith for HTMLElements.
 * @see Node#appendWith
 */
HTMLElementPrototype.appendWith = function() {
	var i = 0,
		arg;

	for (; i < arguments.length; i++) {
		if (typeofString(arg = arguments[i])) {
			this.insertAdjacentHTML('beforeend', arg);
		}
		else {
			//When arg is a collection of nodes, create a fragment by passing the collection in an array
			//(that is the form of input createFragment expects since it normally takes a function's arg list)
			this.appendChild(isNode(arg) ? arg : createFragment([arg]));
		}
	}

	return this;
};

/*
 * More performant version of Node#beforePut for HTMLElements.
 * @see Node#beforePut
 */
HTMLElementPrototype.beforePut = function() {
	var i = 0,
		arg;

	for (; i < arguments.length; i++) {
		if (typeofString(arg = arguments[i])) {
			this.insertAdjacentHTML('beforebegin', arg);
		}
		else {
			//When arg is a collection of nodes, create a fragment by passing the collection in an array
			//(that is the form of input createFragment expects since it normally takes a function's arg list)
			insertBefore(isNode(arg) ? arg : createFragment([arg]), this);
		}
	}

	return this;
};

/**
 * Gets the element's computed style object.
 * 
 * @function HTMLElement.prototype.css
 * @returns {Object.<String, String>} The element's computed style object.
 */
/**
 * Gets the value of the specified style property.
 * 
 * @function HTMLElement.prototype.css
 * @param {String} propertyName - The name of the style property who's value you want to retrieve.
 * @returns {String} The value of the specifed style property.
 */
/**
 * Explicitly sets the element's inline CSS style, replacing any current inline style properties.
 * 
 * @function HTMLElement.prototype.css
 * @param {String} cssText - A CSS style string. To clear the element's inline style, pass in an empty string.
 */
/**
 * Gets an object of property-value pairs for the input array of CSS properties.
 * 
 * @function HTMLElement.prototype.css
 * @param {String[]} propertyNames - An array of one or more CSS properties.
 * @returns {Object.<String, String>} An object of property-value pairs where the values are the computed style values of the input properties.
 */
/**
 * Sets the specified style property.
 * 
 * __Note:__ Unlike jQuery, if the passed in value is a number, it will not be converted to a string with `'px'` appended to it
 * to it prior to setting the CSS value. This helps keep the library small and fast and will force your code to be more obvious
 * as to how it is changing the element's style (which is a good thing).
 * 
 * @function HTMLElement.prototype.css
 * @param {String} propertyName - The name of the style property to set.
 * @param {?String|?Number} value - A value to set for the specified property.
 */
/**
 * Sets CSS style properties.
 * 
 * __Note:__ Just like the previous function, if a value in the object is a number, it will not be converted to a
 * string with `'px'` appended to it to it prior to setting the CSS value.
 * 
 * @function HTMLElement.prototype.css
 * @param {Object.<String, String|Number>} properties - An object of CSS property-values.
 */
HTMLElementPrototype.css = function(prop, value) {
	var _this = this, //Improves minification
		mustHide,
		retVal;

	if (isUndefined(prop)) {
		// Use the window.getComputedStyle function and not the custom one that caches the style object
		// just in case exposing the cached object could introduce the possibility of memory leaks
		return getComputedStyle(_this);
	}

	if (typeofString(prop)) {
		if (isUndefined(value)) {
			if (prop && prop.indexOf(':') < 0) {
				//In case the element has display style "none"
				mustHide = showIfHidden(_this);

				//Get the specified property
				retVal = getStyleObject(_this)[camelize(prop)];

				if (mustHide) {
					_this.hide(); //Hide the element since it was shown temporarily to obtain style value
				}

				return retVal;
			}

			//Set the element's inline CSS style text
			_this.style.cssText = prop;
		}
		else {
			//Set the specified property
			_this.style[camelize(prop)] = value;
		}
	}
	else {
		if (isArray(prop)) {
			//In case the element has display style "none"
			mustHide = showIfHidden(_this);

			//Build an object with the values specified by the input array of properties
			retVal = {};
			for (value = 0; value < prop.length; value++) { //Reuse the value argument in place of a new var
				retVal[prop[value]] = _this.__CSO__[camelize(prop[value])]; //The cached computed style object property must exist at this point
			}

			if (mustHide) {
				_this.hide(); //Hide the element since it was shown temporarily to obtain style values
			}

			return retVal;
		}

		//Set all specifed properties
		for (value in prop) { //Reuse the value argument in place of a new var
			_this.style[camelize(value)] = prop[value];
		}
	}

	return _this;
};

/**
 * Removes all of the element's child nodes.
 * 
 * @function HTMLElement.prototype.empty
 * @example
 * // HTML (before)
 * <div id="mydiv">
 *     <span>Inside Span</span>
 *     Some Text
 * </div>
 *
 * // JavaScript
 * $ID('mydiv').empty();
 *
 * // HTML (after)
 * <div id="mydiv"></div>
 */
HTMLElementPrototype.empty = function() {
	while (this.firstChild) {
		this.removeChild(this.firstChild);
	}

	return this;
};

/**
 * Displays the element by fading it to opaque.
 * 
 * @function HTMLElement.prototype.fadeIn
 * @param {Number} [duration=400] - A number of milliseconds that specifies how long the animation will run.
 * @param {String} [easing="swing"] - A string indicating which easing function to use for the transition. The string can be any
 * [CSS transition timing function](http://www.w3schools.com/cssref/css3_pr_transition-timing-function.asp) or "swing".
 * @param {Function} [complete()] - A function to call once the animation is complete. Inside the function, `this` will
 * refer to the element that was animated.
 */
HTMLElementPrototype.fadeIn = function(duration, easing, complete) {
	return isComputedDisplayNone(this) ? this.fadeToggle(duration, easing, complete) : this;
};

/**
 * Hides the element by fading it to transparent.
 * 
 * @function HTMLElement.prototype.fadeOut
 * @param {Number} [duration=400] - A number of milliseconds that specifies how long the animation will run.
 * @param {String} [easing="swing"] - A string indicating which easing function to use for the transition. The string can be any
 * [CSS transition timing function](http://www.w3schools.com/cssref/css3_pr_transition-timing-function.asp) or "swing".
 * @param {Function} [complete()] - A function to call once the animation is complete. Inside the function, `this` will
 * refer to the element that was animated.
 */
HTMLElementPrototype.fadeOut = function(duration, easing, complete) {
	return isComputedDisplayNone(this) ? this : this.fadeToggle(duration, easing, complete);
};

/**
 * Displays or hides the element by animating its opacity.
 * 
 * @function HTMLElement.prototype.fadeToggle
 * @param {Number} [duration=400] - A number of milliseconds that specifies how long the animation will run.
 * @param {String} [easing="swing"] - A string indicating which easing function to use for the transition. The string can be any
 * [CSS transition timing function](http://www.w3schools.com/cssref/css3_pr_transition-timing-function.asp) or "swing".
 * @param {Function} [complete()] - A function to call once the animation is complete. Inside the function, `this` will
 * refer to the element that was animated.
 */
HTMLElementPrototype.fadeToggle = function(duration, easing, complete) {
	return this.animate({opacity: 't'}, duration, easing, complete);
};

/**
 * Determines if the element's class list has the specified class name.
 * 
 * @function HTMLElement.prototype.hasClass
 * @param {String} className - A string containing a single class name.
 * @returns {Boolean} `true` if the class name is in the element's class list; else `false`.
 */
HTMLElementPrototype.hasClass = function(className) {
	return this.classList.contains(className);
};

/**
 * Hides the element by setting its display style to 'none'.
 * 
 * @function HTMLElement.prototype.hide
 */
HTMLElementPrototype.hide = function() {
	var _this = this;

	_this.__DS__ = _this.style.display; //Save currently display style
	_this.style.display = 'none';       //Hide the element by setting its display style to "none"

	return _this;
};

/**
 * Gets the element's inner HTML.
 * 
 * @function HTMLElement.prototype.html
 * @returns {String} The element's inner HTML.
 */
/**
 * Sets the element's inner HTML.
 * 
 * @function HTMLElement.prototype.html
 * @param {String} innerHTML - An HTML string.
 */
HTMLElementPrototype.html = function(innerHTML) {
	if (isUndefined(innerHTML)) {
		return this.innerHTML; //Get
	}
	this.innerHTML = innerHTML; //Set

	return this;
};

/**
 * Gets the element's current coordinates relative to the document.
 * 
 * @function HTMLElement.prototype.offset
 * @returns {{top: Number, left: Number}} An object containing the coordinates detailing the element's distance from the top and left of the document.
 * @example
 * <body style="margin: 0">
 *   <div id="mydiv" style="position: absolute; margin: 10px; left: 10px"></div>
 * </body>
 * 
 * <script>
 * $$('mydiv').offset();  // -> Object {top: 10, left: 20}
 * </script>
 */
/**
 * Sets the element's coordinates relative to the document.
 * 
 * @function HTMLElement.prototype.offset
 * @param {{top: Number, left: Number}} coordinates - An object containing the properties `top` and `left`,
 * which are numbers indicating the new top and left coordinates for the element.
 */
HTMLElementPrototype.offset = function(coordinates) {
	var el = this,
		top = 0,
		left = 0;

	if (coordinates) {
		//If the element's position is absolute or fixed, the coordinates can be directly set
		var position = this.css('position');
		if (position[0] === 'a' || position[0] === 'f') {
			return this.css({top: coordinates.top, left: coordinates.left});
		}

		//Otherwise, reset the element's top and left values so relative coordinates can be calculated
		this.css({top: 0, left: 0});
	}

	//Calculate the element's current offset
	do {
		top += el.offsetTop;
		left += el.offsetLeft;
	} while (el = el.offsetParent)

	//Set the element's coordinates with relative positioning or return the calculated coordinates
	return coordinates ? this.css({
			position: 'relative',
			top: 0 - top + coordinates.top,
			left: 0 - left + coordinates.left
		})
		: {top: top, left: left};
};

/*
 * More performant version of Node#prependWith for HTMLElements.
 * @see Node#prependWith
 */
HTMLElementPrototype.prependWith = function() {
	var i = arguments.length - 1,
		arg;

	for (; i >= 0; i--) {
		if (typeofString(arg = arguments[i])) {
			this.insertAdjacentHTML('afterbegin', arg);
		}
		else {
			//When arg is a collection of nodes, create a fragment by passing the collection in an array
			//(that is the form of input createFragment expects since it normally takes a function's arg list)
			prepend(isNode(arg) ? arg : createFragment([arg]), this);
		}
	}

	return this;
};

/**
 * @summary Removes the specified class(es) or all classes from the element.
 * 
 * @description
 * __Note:__ Unlike jQuery, the format of the space-separated classes required by Firebolt is strict. Each class must
 * be separated by only a single space character and there cannot be whitespace at the beginning or end of the string.
 * ```JavaScript
 * element.addClass('one  two').removeClass('three ');  // Bad syntax
 * element.addClass('one two').removeClass('three');    // Correct syntax
 * ```
 * 
 * @function HTMLElement.prototype.removeClass
 * @param {String} [className] - One or more space-separated classes to be removed from the element's class attribute.
 */
HTMLElementPrototype.removeClass = function(value) {
	if (isUndefined(value)) {
		this.className = ''; //Remove all classes
	}
	else {
		this.classList.remove.apply(this.classList, value.split(' '));
	}
	
	return this;
};

/**
 * Encode a form element or form control element as a string for submission in an HTTP request.
 * 
 * __Note:__ Unlike jQuery, successful `<select>` controls that have the `multiple` attribute will be encoded
 * using {@linkcode Firebolt.param|Firebolt.param()} with the `traditional` parameter set to `false`, so its
 * array value will be preserved in the encoded string.
 * 
 * @function HTMLElement.prototype.serialize
 * @returns {String} A URL-encoded string of the form element's value or an empty string if the element is
 * not a [successful control](http://www.w3.org/TR/html401/interact/forms.html#h-17.13.2).
 * @this HTMLFormElement|HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement
 */
HTMLElementPrototype.serialize = function() {
	var type = this.type,
		name = this.name,
		value = this.val();

	if (!name                                                 // Doesn't have a name
		|| this.disabled                                      // Is disabled
		|| value == null                                      // Is a <select> element and has no value or is not a form control
		|| rgxFormButton.test(type)                           // Is a form button (button|file|reset|submit)
		|| rgxCheckableElement.test(type) && !this.checked) { // Is a checkbox or radio button and is not checked
		return '';
	}

	//Check if the value is a string because <select> elements may return an array of selected options
	return typeofString(value) ? encodeURIComponent(name) + '=' + encodeURIComponent(value)
							   : serializeRecursive( HTMLElementPrototype.prop.call({}, name, value) );
};

/* For form elements, return the serialization of its form controls */
HTMLFormElement[prototype].serialize = function() {
	return this.elements.serialize();
};

/**
 * Shows the element if it is hidden.  
 * __Note:__ If the element's default display style is 'none' (such as is the case with `<script>` elements), it will not be shown.
 * Also, this method will not show an element if its `visibility` is set to 'hidden' or its `opacity` is `0`.
 * 
 * @function HTMLElement.prototype.show
 */
HTMLElementPrototype.show = function() {
	var inlineStyle = this.style;

	if (inlineStyle.display == 'none') {
		inlineStyle.display = this.__DS__ || ''; //Use the saved display style or clear the display style
	}

	if (isComputedDisplayNone(this)) {
		//Add an element of the same type as this element to the iframe's body to figure out what the default display value should be
		inlineStyle.display = getComputedStyle(
			document.head.appendChild(iframe).contentDocument.body.appendChild(iframe.contentDocument.createElement(this.tagName))
		).display;
		iframe.remove(); //Remove the iframe from the document (this also deletes its contents)
	}

	return this;
};

/**
 * Displays the element with a sliding motion.
 * 
 * @function HTMLElement.prototype.slideDown
 * @param {Number} [duration=400] - A number of milliseconds that specifies how long the animation will run.
 * @param {String} [easing="swing"] - A string indicating which easing function to use for the transition. The string can be any
 * [CSS transition timing function](http://www.w3schools.com/cssref/css3_pr_transition-timing-function.asp) or "swing".
 * @param {Function} [complete()] - A function to call once the animation is complete. Inside the function, `this` will
 * refer to the element that was animated.
 */
HTMLElementPrototype.slideDown = function(duration, easing, complete) {
	return isComputedDisplayNone(this) ? this.slideToggle(duration, easing, complete) : this;
};

/**
 * Displays or hides the element with a sliding motion.
 * 
 * @function HTMLElement.prototype.slideToggle
 * @param {Number} [duration=400] - A number of milliseconds that specifies how long the animation will run.
 * @param {String} [easing="swing"] - A string indicating which easing function to use for the transition. The string can be any
 * [CSS transition timing function](http://www.w3schools.com/cssref/css3_pr_transition-timing-function.asp) or "swing".
 * @param {Function} [complete()] - A function to call once the animation is complete. Inside the function, `this` will
 * refer to the element that was animated.
 */
HTMLElementPrototype.slideToggle = function(duration, easing, complete) {
	return this.animate({
		height: 't',
		marginTop: 't',
		marginBottom: 't',
		paddingTop: 't',
		paddingBottom: 't'
	}, duration, easing, complete);
};

/**
 * Hides the element with a sliding motion.
 * 
 * @function HTMLElement.prototype.slideUp
 * @param {Number} [duration=400] - A number of milliseconds that specifies how long the animation will run.
 * @param {String} [easing="swing"] - A string indicating which easing function to use for the transition. The string can be any
 * [CSS transition timing function](http://www.w3schools.com/cssref/css3_pr_transition-timing-function.asp) or "swing".
 * @param {Function} [complete()] - A function to call once the animation is complete. Inside the function, `this` will
 * refer to the element that was animated.
 */
HTMLElementPrototype.slideUp = function(duration, easing, complete) {
	return isComputedDisplayNone(this) ? this : this.slideToggle(duration, easing, complete);
};

/**
 * Shows the element if it is hidden or hides it if it is currently showing.
 * 
 * @function HTMLElement.prototype.toggle
 * @see HTMLElement#hide
 * @see HTMLElement#show
 */
HTMLElementPrototype.toggle = function() {
	return isComputedDisplayNone(this) ? this.show() : this.hide();
};

/**
 * @summary Add or remove one or more classes from the element depending on the class's presence (or lack thereof).
 * 
 * @description
 * __Note:__ Unlike jQuery, the format of the space-separated classes required by Firebolt is strict. Each class must
 * be separated by only a single space character and there cannot be whitespace at the beginning or end of the string.
 * ```JavaScript
 * element.toggleClass('one  two ');  // Bad syntax
 * element.toggleClass('one two');    // Correct syntax
 * ```
 * 
 * @function HTMLElement.prototype.toggleClass
 * @param {String} [className] - One or more space-separated classes to be toggled. If left empty, the element's current class is toggled.
 */
HTMLElementPrototype.toggleClass = function(value) {
	if (this.className) {
		if (value) {
			var togClasses = value.split(' '),
			curClasses = this.className.split(rgxSpaceChars),
			i = 0;

			//`value` will now be the new class name value
			value = '';

			//Remove existing classes from the array and rebuild the class string without those classes
			for (; i < curClasses.length; i++) {
				if (curClasses[i]) {
					var len = togClasses.length;
					if (togClasses.remove(curClasses[i]).length === len) {
						value += (value ? ' ' : '') + curClasses[i];
					}
				}
			}

			//If there are still classes in the array, they are to be added to the class name
			if (togClasses.length) {
				value += (value ? ' ' : '') + togClasses.join(' ');
			}
		}
		else {
			this.__TC__ = this.className; //Save the element's current class name
			value = ''; //Set to an empty string so the class name will be cleared
		}
	}
	else if (!value) {
		//Retrieve the saved class name or an empty string if there is no saved class name
		value = this.__TC__ || '';
	}

	//Set the new value
	this.className = value;

	return this;
};

/**
 * Retrieves the element's current value. If the element is a `<select>` element, `null` is returned if none of its options
 * are selected and an array of selected options is returned if the element's `multiple` attribute is present.
 * 
 * @function HTMLElement.prototype.val
 * @returns {String|Array|null} The element's value.
 */
/**
 * Sets the element's value.
 * 
 * @function HTMLElement.prototype.val
 * @param {String} value - The value to give to the element.
 */
/**
 * Checks the element if its current value is in the input array of values and deselects it otherwise (only `<input>` elements with
 * type `checkbox` or `radio`).  
 * If the element is a `<select>` element, all of its options with a value matching one in the input array of values will be selected
 * and all others deselected. If the select element does not allow multiple selection, only the first matching element is selected.
 * 
 * @function HTMLElement.prototype.val
 * @param {String[]} values - The array of values used to determine if the element (or its options) should be checked (or selected).
 */
HTMLElementPrototype.val = function(value) {
	//If `value` is not an array with values to check
	if (!isArray(value)) {
		return this.prop('value', value);
	}

	//Check or uncheck this depending on if this element's value is in the array of values to check
	this.checked = value.contains(this.value);

	return this;
};

HTMLSelectElementPrototype.val = function(value) {
	var multiple = this.multiple,
		options = this.options,
		i = 0;

	if (isUndefined(value)) {
		//If multiple selection is allowed and there is at least one selected item, return an array of selected values
		if (multiple && this.selectedIndex >= 0) {
			value = [];
			for (; i < options.length; i++) {
				if (options[i].selected) {
					value.push(options[i].value);
				}
			}
			return value;
		}

		//Else return the currently selected value or null
		//(If multiple is true, this.value will be an empty string so null will be returned)
		return this.value || null;
	}
	
	if (typeofString(value)) {
		this.value = value;
	}
	else {
		//Select or deselect each option depending on if its value is in the array of values to check.
		//Break once an option is selected if this select element does not allow multiple selection.
		for (; i < options.length; i++) {
			if ((options[i].selected = value.contains(options[i].value)) && !multiple) break;
		}
	}

	return this;
};

//#endregion HTMLElement


//#region ============================= Node =================================

/**
 * @class Node
 * @classdesc
 * The {@link https://developer.mozilla.org/en-US/docs/Web/API/Node|DOM Node interface}.  
 * It should be noted that all functions that do not have a specified return value, return the calling object,
 * allowing for function chaining.
 * @mixes Object
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/Node|Node - Web API Interfaces | MDN}
 */

/**
 * Inserts content after the node.
 * 
 * @function Node.prototype.afterPut
 * @param {...(String|Node|NodeCollection)} content - One or more HTML strings, nodes, or collections of nodes to insert.
 * @throws {TypeError|NoModificationAllowedError} The subject node must have a
 * {@link https://developer.mozilla.org/en-US/docs/Web/API/Node.parentNode|ParentNode}.
 */
NodePrototype.afterPut = function() {
	insertAfter(createFragment(arguments), this);

	return this;
};

/**
 * Appends this node to the end of the target element(s).
 * 
 * @function Node.prototype.appendTo
 * @param {String|ParentNode|NodeCollection} target - A specific node, collection of nodes, or a selector to find a set of nodes to which this node will be appended.
 * @throws {HierarchyRequestError} The target(s) must implement the {@link ParentNode} interface.
 */
NodePrototype.appendTo = function(target) {
	if (typeofString(target)) {
		target = Firebolt(target);
	}
	else if (isNode(target)) {
		return target.appendChild(this);
	}

	var i = 1,
		len = target.length;
	if (len) {
		target[0].appendChild(this);
		for (; i < len; i++) {
			target[0].appendChild(this.cloneNode(true));
		}
	}

	return this;
};

/**
 * Appends content to the end of the node.
 * 
 * @function Node.prototype.appendWith
 * @param {...(String|Node|NodeCollection)} content - One or more HTML strings, nodes, or collections of nodes to insert.
 * @throws {HierarchyRequestError} This node must implement the {@link ParentNode} interface.
 */
NodePrototype.appendWith = function() {
	this.appendChild(createFragment(arguments));

	return this;
};

/**
 * Inserts content before the node.
 * 
 * @function Node.prototype.beforePut
 * @param {...(String|Node|NodeCollection)} content - One or more HTML strings, nodes, or collections of nodes to insert.
 * @throws {TypeError|NoModificationAllowedError} The subject node must have a
 * {@link https://developer.mozilla.org/en-US/docs/Web/API/Node.parentNode|ParentNode}.
 */
NodePrototype.beforePut = function() {
	insertBefore(createFragment(arguments), this);

	return this;
};

/**
 * Gets the node's child elements, optionally filtered by a selector.
 * 
 * @function Node.prototype.childElements
 * @param {String} [selector] - A CSS selector used to filter the returned set of elements.
 * @returns {NodeCollection}
 */
NodePrototype.childElements = function(selector) {
	//If this node does not implement the ParentNode interface, this.children will be `undefined`,
	//so set children to an empty array so nothing will be added to the returned NodeCollection
	var children = this.children || [];

	if (!selector) {
		return children.toNC();
	}

	var nc = new NodeCollection(),
		i = 0;
	for (; i < children.length; i++) {
		if (children[i].matches(selector)) {
			nc.push(children[i]);
		}
	}
	return nc;
};

/**
 * Create a clone of the node.
 * 
 * @function Node.prototype.clone
 * @param {Boolean} [withDataAndEvents=false] - A boolean indicating if the node's data and events should be copied over to the clone.
 * @param {Boolean} [deepWithDataAndEvents=value of withDataAndEvents] - If `false`, data and events for the descendants of the cloned node will
 * not be copied over. If cloning with data and events and you know the descendants do not have any data or events that should be copied, using
 * this variable (by setting it to `false`) will improve performance.
 * @returns {NodeCollection}
 */
NodePrototype.clone = function(withDataAndEvents, deepWithDataAndEvents) {
	var clone = this.cloneNode(true);

	if (withDataAndEvents) {
		copyDataAndEvents(this, clone, deepWithDataAndEvents === false);
	}

	return clone;
};

/**
 * @summary Gets the first node that matches the selector by testing the node itself and traversing up through its ancestors in the DOM tree.
 * 
 * @description
 * __Note:__ Unlike jQuery, there is no version of this function where you can provide a "context" element, whose children that match
 * the input CSS selector will be searched for a match. This is because it is very easy to get the matching children of an element
 * youself using [`Element#querySelectorAll()`](https://developer.mozilla.org/en-US/docs/Web/API/Element.querySelectorAll) or Firebolt's
 * alias `Element#$QSA()`.
 * 
 * @function Node.prototype.closest
 * @param {String|Element|Node[]} selector - A CSS selector, a node, or a collection of nodes used to match the node and its parents against.
 * @returns {?Node} - The first node that matches the selector.
 */
NodePrototype.closest = function(selector) {
	var node = this,
		isClosest = getNodeMatchingFunction(selector);

	// If the selector is a string (meaning the isClosest function matches by CSS selector) and `this` doesn't have
	// the Element#matches function, it is not an element so skip to its parent
	if (typeofString(selector) && !node.matches) {
		node = node.parentElement;
	}

	//Search the node's parent elements until the first match (when isClosest returns `true`) or there are no more parents
	while (node && !isClosest(node)) {
		node = node.parentElement;
	}

	return node;
};

/**
 * Get the node's immediately following sibling element. If a selector is provided, it retrieves the next sibling only if it matches that selector.
 * 
 * @function Node.prototype.next
 * @param {String} [selector] - A CSS selector to match the next sibling against.
 * @returns {?Element}
 */
NodePrototype.next = getNextOrPrevFunc(nextElementSibling, 1);

/**
 * Gets all following siblings of the node, optionally filtered by a selector.
 * 
 * @function Node.prototype.nextAll
 * @param {String} [selector] - A CSS selector used to filter the returned set of elements.
 * @returns {NodeCollection} The set of following sibling elements in order beginning with the closest sibling.
 */
NodePrototype.nextAll = getGetDirElementsFunc(nextElementSibling);

/**
 * Gets the node's following siblings, up to but not including the element matched by the selector, DOM node,
 * or node in a collection.
 * 
 * @function Node.prototype.nextUntil
 * @param {String|Element|Node[]} [selector] - A CSS selector, an element, or a collection of nodes used to indicate
 * where to stop matching following sibling elements.
 * @param {String} [filter] - A CSS selector used to filter the returned set of elements.
 * @returns {NodeCollection} - The set of following sibling elements in order beginning with the closest sibling.
 */
NodePrototype.nextUntil = getGetDirElementsFunc(nextElementSibling, 0);

/* 
 * Used by Node.prototype.off
 * Removes the passed in handler from the array of handlers or removes all handlers if handler is undefined.
 * Deletes the array of handlers if it is empty after handlers have been removed.
 */
function removeSelectorHandler(selectorHandlers, selector, handler) {
	var handlers = selectorHandlers[selector];
	if (handlers) {
		if (handler) {
			for (var i = 0; i < handlers.length; i++) {
				if (handlers[i].fn === handler) {
					handlers.splice(i--, 1); //Use i-- so that i has the same value when the loop completes and i++ happens
				}
			}
		}
		else {
			handlers.clear();
		}

		if (!handlers.length) {
			//The array of handlers is now empty so it can be deleted
			delete selectorHandlers[selector];
		}
	}
}

/**
 * Removes one or more event handlers set by `.on()` or `.one()`.
 * 
 * @function Node.prototype.off
 * @param {String} events - One or more space-separated event types, such as "click" or "click keypress".
 * @param {String} [selector] - A selector which should match the one originally passed to `.on()` when attaching event handlers.
 * @param {Function} [handler] - A handler function previously attached for the event(s), or the special value `false` (see `Node#on()`).
 * @see {@link http://api.jquery.com/off/#off-events-selector-handler|.off() | jQuery API Documentation}
 */
/**
 * Removes one or more event handlers set by `.on()` or `.one()`.
 * 
 * @function Node.prototype.off
 * @param {Object} events - An object where the string keys represent one or more space-separated event types and the values represent
 * handler functions previously attached for the event(s).
 * @param {String} [selector] - A selector which should match the one originally passed to `.on()` when attaching event handlers.
 * @see {@link http://api.jquery.com/off/#off-events-selector|.off() | jQuery API Documentation}
 */
/**
 * Removes all event handlers set by `.on()` or `.one()`.
 * 
 * @function Node.prototype.off
 * @see {@link http://api.jquery.com/off/#off|.off() | jQuery API Documentation}
 */
NodePrototype.off = function(events, selector, handler) {
	var eventHandlers = this.__E__,
		eventType,
		selectorHandlers,
		sel,
		i;

	//Don't bother doing anything if there haven't been any Firebolt handlers set
	if (eventHandlers) {
		if (typeofObject(events)) {
			//Call this function for each event and handler in the object
			for (i in events) {
				this.off(i, selector, events[i]);
			}
		}
		else {
			//If events was passed in, remove those events, else remove all events
			events = events ? events.split(' ') : keys(eventHandlers);

			if (!isUndefined(selector) && !typeofString(selector)) {
				//The handler was in the selector argument and there is no real selector argument
				handler = selector;
				selector = 0;
			}

			//If the handler is the value false, the handler should be a function that returns false
			if (handler === false) {
				handler = returnFalse;
			}

			for (i = 0; i < events.length; i++) {
				if (selectorHandlers = eventHandlers[eventType = events[i]]) {
					//If a selector was provided, remove handlers for that particular selector
					if (selector) {
						removeSelectorHandler(selectorHandlers, selector, handler);
					}
					else { //Remove handlers for all selectors
						for (sel in selectorHandlers) {
							removeSelectorHandler(selectorHandlers, sel, handler);
						}
					}

					// If there are no more selectors left, the object for the current event can be deleted
					// and the event listener must be removed
					if (isEmptyObject(selectorHandlers)) {
						delete eventHandlers[eventType];
						this.removeEventListener(eventType, nodeEventHandler);
					}
				}
			}
		}
	}

	return this;
};

/* Slightly alter the Event#stopPropagation() method for more convenient use in Node#on() */
EventPrototype._stopPropagation = EventPrototype.stopPropagation;
EventPrototype.stopPropagation = function() {
	this._stopPropagation();
	this.propagationStopped = true;
};

/* This is the function that will be invoked for each event type when a handler is set with Node.prototype.on() */
function nodeEventHandler(eventObject) {
	var _this = this, //Improves minification
		target = eventObject.target,
		eType = eventObject.type,
		selectorHandlers = _this.__E__[eType],
		selectorHandlersCopy = {},
		selectors = keys(selectorHandlers).remove(''), //Don't want the non-selector (for non-delegated handlers) in the array
		numSelectors = selectors.length,
		i = 0,
		j = 0,
		k,
		selector,
		path,
		pathElement,
		handlers,
		handler;

	// Only do delegated events if there are selectors that can be used to delegate events and if the target
	// was not this element (since if it was this element there would be nothing to bubble up from)
	if (numSelectors && target !== _this) {
		//Build a copy of the selector handlers so they won't be altered if `off` is ever called
		for (; j < numSelectors; j++) {
			selectorHandlersCopy[selectors[j]] = selectorHandlers[selectors[j]].clone();
		}

		//The bubble path is the elements from the target up to (but not including) this node
		path = target.parentsUntil(_this);

		//Add the target to the front of the path if it has the matches function (meaning it is an element)
		if (target.matches) {
			path.unshift(target);
		}

		//Call the handlers for each selector on each element in the path or until propagation is stopped
		for (; i < path.length && !eventObject.propagationStopped; i++) {
			pathElement = path[i];

			for (j = 0; j < numSelectors; j++) {
				//Only call handlers if the element matches the current selector
				if (pathElement.matches(selector = selectors[j])) {
					handlers = selectorHandlersCopy[selector];

					for (k = 0; k < handlers.length; k++) {
						handler = handlers[k];

						eventObject.data = handler.d; //Set data in the event object

						//Call the function on the current element and stop stuff if it returns false
						if (handler.fn.call(pathElement, eventObject) === false) {
							eventObject.stopPropagation();
							eventObject.preventDefault();
						}

						//Remove the handler if it should only occur once
						if (handler.o) {
							_this.off(eType, selector, handler.fn);
							handler.o = 0; //Make the handler's "one" value falsy so this part doesn't try to remove it again
						}
					} //End handlers looop
				}
			} //End selectors loop
		} //End path loop
	} //End delegated events section

	//If propagation has not been stopped, call the non-delegated handlers (if there are any)
	if (!eventObject.propagationStopped && (handlers = selectorHandlers[''])) {
		handlers = handlers.clone(); //Use a clone so it won't be altered if `off` is ever called

		for (k = 0; k < handlers.length; k++) {
			handler = handlers[k];

			eventObject.data = handler.d; //Set data in the event object

			//Call the function on the element and stop stuff if it returns false
			if (handler.fn.call(_this, eventObject) === false) {
				eventObject.stopPropagation();
				eventObject.preventDefault();
			}

			//Remove the handler if it should only occur once
			if (handler.o) {
				_this.off(eType, handler.fn);
			}
		}
	}
}

/**
 * @summary Attaches an event handler function for one or more events to the node.
 *  
 * @description Check out [jQuery's documentation](http://api.jquery.com/on/) for details. There are only a couple minor differences:
 * 1. Firebolt does not offer event namespacing.
 * 2. The native [Event](https://developer.mozilla.org/en-US/docs/Web/API/Event) object is passed to the handler (with an added
 * `data` property, and if propagation is stopped, there will be a `propagationStopped` property set to `true`).
 * 
 * @function Node.prototype.on
 * @param {String} events - One or more space-separated event types, such as "click" or "click keypress".
 * @param {String} [selector] - A selector string to filter the descendants of the selected elements that trigger the event.
 * If the selector is `null` or omitted, the event is always triggered when it reaches the selected element.
 * @param {*} [data] - Data to be passed to the handler in `eventObject.data` when an event is triggered.
 * @param {Function} handler(eventObject) - A function to execute when the event is triggered. Inside the function, `this` will refer to
 * the node the event was triggered on. The value `false` is also allowed as a shorthand for a function that simply does `return false`.
 * @see {@link http://api.jquery.com/on/#on-events-selector-data-handler|.on() | jQuery API Documentation}
 */
/**
 * @summary Attaches an event handler function for one or more events to the node.
 *  
 * @description Check out [jQuery's documentation](http://api.jquery.com/on/) for details. There are only a couple minor differences:
 * 1. Firebolt does not offer event namespacing.
 * 2. The native [Event](https://developer.mozilla.org/en-US/docs/Web/API/Event) object is passed to the handler (with an added
 * `data` property, and if propagation is stopped, there will be a `propagationStopped` property set to `true`).
 * 
 * @function Node.prototype.on
 * @param {Object} events - An object where the string keys represent one or more space-separated event types and the values represent
 * handler functions to be called for the event(s).
 * @param {String} [selector] - A selector string to filter the descendants of the selected elements that trigger the event.
 * If the selector is `null` or omitted, the event is always triggered when it reaches the selected element.
 * @param {*} [data] - Data to be passed to the handler in `eventObject.data` when an event is triggered.
 * @see {@link http://api.jquery.com/on/#on-events-selector-data|.on() | jQuery API Documentation}
 */
NodePrototype.on = function(events, selector, data, handler, one) { //one is for internal use
	var _this = this, //Improves minification
		eventHandlers = _this.__E__ || (_this.__E__ = {}),
		selectorIsString = typeofString(selector),
		savedHandlers,
		eventType,
		i;

	if (typeofString(events)) {
		events = events.split(' ');

		//Organize arguments into their proper places
		if (isUndefined(handler)) {
			if (isUndefined(data)) {
				handler = selector; //The handler was in the selector argument
			}
			else {
				handler = data; //The handler was in the data argument
				data = selectorIsString ? undefined : selector; //Data was in the selector argument or undefined if selector is a string
			}
		}

		if (!selectorIsString) {
			selector = ''; //Make the selector an empty string to be used as an object key
		}

		//If the handler is the value false, the handler should be a function that returns false
		if (handler === false) {
			handler = returnFalse;
		}

		for (i = 0; i < events.length; i++) {
			//Sanity check in case the user had multiple consecutive spaces in the input string of event types
			if (eventType = events[i]) {
				//Get the saved handlers object for the event type
				savedHandlers = eventHandlers[eventType];

				//If the object for the event doesn't exist, create it and add Firebolt's event function as a listener
				if (!savedHandlers) {
					savedHandlers = eventHandlers[eventType] = {}
					_this.addEventListener(eventType, nodeEventHandler);
				}

				//Get the array of handlers for the selector or create it if it doesn't exist
				savedHandlers = savedHandlers[selector] || (savedHandlers[selector] = []);

				//Add the user-input handler and data to the array of handlers
				savedHandlers.push({fn: handler, d: data, o: one});
			}
		}
	}
	else {
		//Call this function for each event and handler in the object
		for (i in events) {
			_this.on(i, selector, data, events[i], one);
		}
	}

	return _this;
};

/**
 * Attaches a handler to an event for the node. The handler is executed at most once per event type.  
 * Exactly the same as `Node#on()` except the event handler is removed after it executes for the first time.
 * 
 * @function Node.prototype.one
 * @param {String} events
 * @param {String} [selector]
 * @param {*} [data]
 * @param {Function} handler(eventObject)
 * @see {@link http://api.jquery.com/one/#one-events-selector-data-handler|.one() | jQuery API Documentation}
 */
/**
 * Attaches a handler to an event for the node. The handler is executed at most once per event type.  
 * Exactly the same as `Node#on()` except the event handler is removed after it executes for the first time.
 * 
 * @function Node.prototype.one
 * @param {Object} events
 * @param {String} [selector]
 * @param {*} [data]
 * @see {@link http://api.jquery.com/one/#one-events-selector-data|.one() | jQuery API Documentation}
 */
NodePrototype.one = function(events, selector, data, handler) {
	return this.on(events, selector, data, handler, 1);
};

/**
 * Gets the node's ancestors, optionally filtered by a selector.
 * 
 * @function Node.prototype.parents
 * @param {String} [selector] - A CSS selector used to filter the returned set of elements.
 * @returns {NodeCollection} - The set of the node's ancestors, ordered from the immediate parent on up.
 */
NodePrototype.parents = getGetDirElementsFunc('parentElement');

/**
 * Gets the node's ancestors, up to but not including the element matched by the selector, DOM node,
 * or node in a collection.
 * 
 * @function Node.prototype.parentsUntil
 * @param {String|Element|Node[]} [selector] - A CSS selector, an element, or a collection of nodes used to indicate
 * where to stop matching ancestor elements.
 * @param {String} [filter] - A CSS selector used to filter the returned set of elements.
 * @returns {NodeCollection} - The set of the node's ancestors, ordered from the immediate parent on up.
 */
NodePrototype.parentsUntil = getGetDirElementsFunc('parentElement', 0);

/**
 * Prepends content to the beginning of the node.
 * 
 * @function Node.prototype.prependWith
 * @param {...(String|Node|NodeCollection)} content - One or more HTML strings, nodes, or collections of nodes to insert.
 * @throws {HierarchyRequestError} This node must implement the {@link ParentNode} interface.
 */
NodePrototype.prependWith = function() {
	prepend(createFragment(arguments), this);

	return this;
};

/**
 * Prepends this node to the beginning of the target element(s).
 * 
 * @function Node.prototype.prependTo
 * @param {String|ParentNode|NodeCollection} target - A specific node, collection of nodes, or a selector to find a set of nodes to which this node will be prepended.
 * @throws {HierarchyRequestError} The target(s) must implement the {@link ParentNode} interface.
 */
NodePrototype.prependTo = getNodeInsertingFunction(prepend);

/**
 * Get the node's immediately preceeding sibling element. If a selector is provided, it retrieves the previous sibling only if it matches that selector.
 * 
 * @function Node.prototype.prev
 * @param {String} [selector] - A CSS selector to match the previous sibling against.
 * @returns {?Element}
 */
NodePrototype.prev = getNextOrPrevFunc(previousElementSibling, 1);

/**
 * Gets all preceeding siblings of the node, optionally filtered by a selector.
 * 
 * @function Node.prototype.prevAll
 * @param {String} [selector] - A CSS selector used to filter the returned set of elements.
 * @returns {NodeCollection} The set of preceeding sibling elements in order beginning with the closest sibling.
 */
NodePrototype.prevAll = getGetDirElementsFunc(previousElementSibling);

/**
 * Gets the node's preceeding siblings, up to but not including the element matched by the selector, DOM node,
 * or node in a collection.
 * 
 * @function Node.prototype.prevUntil
 * @param {String|Element|Node[]} [selector] - A CSS selector, an element, or a collection of nodes used to indicate
 * where to stop matching preceeding sibling elements.
 * @param {String} [filter] - A CSS selector used to filter the returned set of elements.
 * @returns {NodeCollection} - The set of preceeding sibling elements in order beginning with the closest sibling.
 */
NodePrototype.prevUntil = getGetDirElementsFunc(previousElementSibling, 0);

/**
 * Inserts this node directly after the specified target(s).
 * 
 * @function Node.prototype.putAfter
 * @param {String|Node|NodeCollection} target - A specific node, collection of nodes, or a selector to find a set of nodes after which this node will be inserted.
 * @throws {TypeError} The target node(s) must have a {@link https://developer.mozilla.org/en-US/docs/Web/API/Node.parentNode|ParentNode}.
 */
NodePrototype.putAfter = getNodeInsertingFunction(insertAfter);

/**
 * Inserts this node directly before the specified target(s).
 * 
 * @function Node.prototype.putBefore
 * @param {String|Node|NodeCollection} target - A specific node, collection of nodes, or a selector to find a set of nodes after which this node will be inserted.
 * @throws {TypeError} The target node(s) must have a {@link https://developer.mozilla.org/en-US/docs/Web/API/Node.parentNode|ParentNode}.
 */
NodePrototype.putBefore = getNodeInsertingFunction(insertBefore);

/**
 * Replace the target with this node.
 * 
 * @function Node.prototype.replaceAll
 * @param {String|Node|NodeCollection} target - A specific node, collection of nodes, or a selector to find a set of nodes to be replaced by this node.
 * @throws {TypeError} The target node(s) must have a {@link https://developer.mozilla.org/en-US/docs/Web/API/Node.parentNode|ParentNode}.
 */
NodePrototype.replaceAll = getNodeInsertingFunction(replaceWith);

/**
 * Replace the node with some other content.
 * 
 * @function Node.prototype.replaceWith
 * @param {...(String|Node|NodeCollection)} content - A specific node, a collection of nodes, or some HTML to replace the subject node.
 * @throws {TypeError} The subject node must have a {@link https://developer.mozilla.org/en-US/docs/Web/API/Node.parentNode|ParentNode}.
 */
NodePrototype.replaceWith = function() {
	replaceWith(createFragment(arguments), this);

	return this;
};

/**
 * Removes this node from the DOM.
 * 
 * @function Node.prototype.remove
 * @returns void (undefined)
 */
NodePrototype.remove = function() {
	if (this.parentNode) {
		this.parentNode.removeChild(this);
	}
};

/**
 * Gets the node's siblings, optionally filtered by a selector.
 * 
 * @function Node.prototype.siblings
 * @param {String} [selector] - A CSS selector used to filter the returned set of elements.
 * @returns {NodeCollection} - The set of the node's ancestors, ordered from the immediate parent on up.
 * @throws {TypeError} The subject node must have a
 * {@link https://developer.mozilla.org/en-US/docs/Web/API/Node.parentNode|ParentNode}.
 */
NodePrototype.siblings = function(selector) {
	return array_remove.call(this.parentNode.childElements(selector), this);
};

/**
 * Gets this node's text content (specifically uses the native JavaScript property `Node.textContent`).
 * 
 * @function Node.prototype.text
 * @returns {String} The node's text content.
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/Node.textContent|Node.textContent - Web API Interfaces | MDN}
 */
/**
 * Sets this node's text content (specifically uses the native JavaScript property `Node.textContent`).
 * 
 * @function Node.prototype.text
 * @param {String|*} text - The text or content that will be converted to a string to be set as the node's text content.
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/Node.textContent|Node.textContent - Web API Interfaces | MDN}
 */
NodePrototype.text = function(text) {
	if (isUndefined(text)) {
		return this.textContent; //Get
	}

	this.textContent = text; //Set

	return this;
};

/**
 * Remove the node's parent from the DOM, leaving the node in its place.
 * 
 * @function Node.prototype.unwrap
 * @throws {TypeError} The subject node must have a {@link https://developer.mozilla.org/en-US/docs/Web/API/Node.parentNode|ParentNode},
 * which in turn must also have a ParentNode.
 */
NodePrototype.unwrap = function() {
	this.parentNode.replaceWith(this);

	return this;
};

/**
 * Wrap an HTML structure around the node.
 * 
 * @function Node.prototype.wrap
 * @param {String|Element|Element[]} wrappingElement - CSS selector&mdash;to select wrapping element(s)&mdash;, HTML string&mdash;to
 * create wrapping element(s)&mdash;, element, or collection of elements used to specify the structure to wrap around the node.
 * @throws {TypeError} The subject node must have a {@link https://developer.mozilla.org/en-US/docs/Web/API/Node.parentNode|ParentNode}.
 */
NodePrototype.wrap = function(wrappingElement) {
	if (wrappingElement = getWrappingElement(wrappingElement)) {
		getWrappingInnerElement(wrappingElement).appendChild(this.replaceWith(wrappingElement));
	}

	return this;
};

/**
 * Wrap an HTML structure around the content of the node.
 * 
 * @function Node.prototype.wrapInner
 * @param {String|Element|Element[]} wrappingElement - CSS selector&mdash;to select wrapping element(s)&mdash;, HTML string&mdash;to
 * create wrapping element(s)&mdash;, element, or collection of elements used to specify the structure to wrap the node's contents.
 * @throws {HierarchyRequestError} The node must implement the {@link ParentNode} interface.
 */
NodePrototype.wrapInner = function(wrappingElement) {
	if (wrappingElement = getWrappingElement(wrappingElement)) {
		this.appendChild(getWrappingInnerElement(wrappingElement).appendWith(this.childNodes));
	}

	return this;
};

/**
 * @class ParentNode
 * @classdesc Interface implemented by {@link https://developer.mozilla.org/en-US/docs/Web/API/Element|Element},
 * {@link https://developer.mozilla.org/en-US/docs/Web/API/Document|Document}, and
 * {@link https://developer.mozilla.org/en-US/docs/Web/API/DocumentFragment|DocumentFragment} objects.
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/ParentNode|ParentNode - Web API Interfaces | MDN}
 */

//#endregion Node


//#region ======================== NodeCollection ============================

//Save the clone function to toNC to be a way to make shallow copies of the NodeCollection/NodeList/HTMLCollection
prototypeExtensions.toNC = prototypeExtensions.clone;

/**
 * Create a deep copy of the collection of nodes.
 * 
 * __Protip:__ If you want a shallow copy of the collection, use `.toNC()` (even thought that's a NodeList function,
 * NodeCollections also have it in their prototype).
 * 
 * @function NodeCollection.prototype.clone
 * @param {Boolean} [withDataAndEvents=false] - A boolean indicating if each node's data and events should be copied over to its clone.
 * @param {Boolean} [deepWithDataAndEvents=value of withDataAndEvents] - If `false`, data and events for the descendants of the cloned nodes will
 * not be copied over. If cloning with data and events and you know the descendants do not have any data or events that should be copied, using
 * this variable (by setting it to `false`) will improve performance.
 * @returns {NodeCollection}
 */
prototypeExtensions.clone = function(withDataAndEvents, deepWithDataAndEvents) {
	var len = this.length,
		clone = new NodeCollection(len),
		i = 0;

	for (; i < len; i++) {
		clone[i] = this[i].clone(withDataAndEvents, deepWithDataAndEvents);
	}

	return clone;
};

/**
 * Same constructor as {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array|Array}.
 * 
 * @class NodeCollection
 * @mixes Array
 * @classdesc
 * A mutable collection of DOM nodes. It subclasses the native {@link Array} class (but take note that the `.clone()`, `.clean()`,
 * `.remove()`, and `.filter()` functions have been overridden), and has all of the main DOM-manipulating functions.
 * 
 * __Note:__ Since it is nearly impossible to fully subclass the Array class in JavaScript, there is one minor hiccup
 * with the way NodeCollection subclasses Array. The `instanceof` operator will not report that NodeCollection is an
 * instance of anything other than a NodeCollection. It also will not report that `NodeCollection` is a function.
 * This is demonstrated in the following code:
 * ```javascript
 * var nc = new NodeCollection();
 * nc instanceof NodeCollection; // true
 * nc instanceof Array;          // false
 * nc instanceof Object;         // false
 * nc.constructor instanceof Function; // false
 * ```
 * All other operations, such as `Array.isArray()` and `typeof`, will work correctly.
 * 
 * It should be noted that all functions that do not have a specified return value, return the calling object,
 * allowing for function chaining.
 */
var
	//<iframe> Array subclassing
	NodeCollection = window.NodeCollection = document.head.appendChild(iframe).contentWindow.Array,

	//Extend NodeCollection's prototype with the Array functions
	NodeCollectionPrototype = extend(NodeCollection[prototype], prototypeExtensions),

	//Save a reference to the original filter function for use later on
	ncFilter = NodeCollectionPrototype.filter;

iframe.remove(); //Remove the iframe that was made to subclass Array

/* Set the private constructor (which will be inherited by NodeList and HTMLCollection) */
NodeCollectionPrototype.__C__ = NodeCollection;

/**
 * Adds the queried elements to a copy of the existing collection (if they are not already in the collection)
 * and returns the result.
 * 
 * Do not assume that this method appends the elements to the existing collection in the order they are passed to the method
 * (that's what `concat` is for). When all elements are members of the same document, the resulting collection will be sorted
 * in document order; that is, in order of each element's appearance in the document. If the collection consists of elements
 * from different documents or ones not in any document, the sort order is undefined (but elements in the collection that are
 * in the same document will still be in document order).
 * 
 * @function NodeCollection.prototype.add
 * @param {String} selector - A CSS selector to use to find elements to add to the collection.
 * @returns {NodeCollection} The result of unioning the queried elements with the current collection.
 */
/**
 * Adds the newly created elements to a copy of the existing collection and returns the result.
 * 
 * @function NodeCollection.prototype.add
 * @param {String} html - An HTML fragment to add to the collection.
 * @returns {NodeCollection} The result adding the elements created with the HTML to current collection.
 */
/**
 * Adds the element to a copy of the existing collection (if it is not already in the collection)
 * and returns the result.
 * 
 * @function NodeCollection.prototype.add
 * @param {Element|Node} element - A DOM Element or Node.
 * @returns {NodeCollection} The result of adding the element to the current collection.
 */
/**
 * Returns the union of the current collection and the input one.
 * 
 * Do not assume that this method appends the elements to the existing collection in the order they are passed to the method
 * (that's what `concat` is for). When all elements are members of the same document, the resulting collection will be sorted
 * in document order; that is, in order of each element's appearance in the document. If the collection consists of elements
 * from different documents or ones not in any document, the sort order is undefined (but elements in the collection that are
 * in the same document will still be in document order).
 * 
 * @function NodeCollection.prototype.add
 * @param {NodeCollection|NodeList|HTMLCollection|Node[]} elements
 * @returns {NodeCollection} The result of adding the input elements to the current collection.
 */
NodeCollectionPrototype.add = function(input) {
	var newCollection;
	if (input.nodeType) {
		if (this.contains(input)) { //This collection already contains the input node
			return this.toNC(); //Return a shallow clone of the current collection
		}
		newCollection = this.concat(input);
	}
	else {
		newCollection = this.union(typeofString(input) ? Firebolt(input) : input);
	}

	return newCollection.sort(sortDocOrder);
};

/**
 * Adds the input class name to all elements in the collection.
 * 
 * @function NodeCollection.prototype.addClass
 * @param {String} className - The class to be added to each element in the collection.
 */
NodeCollectionPrototype.addClass = callOnEachElement(HTMLElementPrototype.addClass);

/**
 * Alias of {@link NodeCollection#afterPut} provided for similarity with jQuery.
 * 
 * Note that Firebolt does not define a method called "after" for {@link Node}. This is because the DOM Living Standard has defined
 * a native function called `after` for the {@link http://dom.spec.whatwg.org/#interface-childnode|ChildNode Interface} that
 * does not function in the same way as `.afterPut()`.
 * 
 * @function NodeCollection.prototype.after
 * @see NodeCollection#afterPut
 */
/**
 * Inserts content after each node in the collection.
 * 
 * @function NodeCollection.prototype.afterPut
 * @param {...(String|Node|NodeCollection)} content - One or more HTML strings, nodes, or collections of nodes to insert.
 * @throws {TypeError|NoModificationAllowedError} The subject collection of nodes must only contain nodes that have a
 * {@link https://developer.mozilla.org/en-US/docs/Web/API/Node.parentNode|ParentNode}.
 */
NodeCollectionPrototype.afterPut = NodeCollectionPrototype.after = function() {
	var len = this.length,
		firstNode = this[0];
	if (len > 1) {
		var fragment = createFragment(arguments),
			i = 1;
		for (; i < len; i++) {
			insertAfter(fragment.cloneNode(true), this[i]);
		}
		insertAfter(fragment, firstNode);
	}
	else if (len) { //This collection only has one node
		firstNode.afterPut.apply(firstNode, arguments);
	}

	return this;
};

/**
 * @summary Performs a custom animation of a set of CSS properties.
 * 
 * @description
 * Just like NodeCollection#css, CSS properties must be specified the same way they would be in a style sheet since Firebolt
 * does not append "px" to input numeric values (i.e. 1 != 1px).
 * 
 * Unlike jQuery, an object that specifies different easing types for different properties is not supported.
 * (Should it be supported? [Tell me why](https://github.com/FireboltJS/Firebolt/issues).)
 * 
 * However, relative properties (indicated with `+=` or `-=`) and the `toggle` indicator are supported (although only
 * the `"t"` is needed for toggling since Firebolt only looks at the first character to check if it is a "t").
 * 
 * For more `easing` options, use Firebolt's [easing extension](https://github.com/FireboltJS/firebolt-extensions/tree/master/easing)
 * (or just grab some functions from it and use them as the `easing` parameter).
 * 
 * @function NodeCollection.prototype.animate
 * @param {Object} properties - An object of CSS properties and values that the animation will move toward.
 * @param {Number} [duration=400] - A number of milliseconds that specifies how long the animation will run.
 * @param {String} [easing="swing"] - A string indicating which easing function to use for the transition. The string can be any
 * [CSS transition timing function](https://developer.mozilla.org/en-US/docs/Web/CSS/transition-timing-function) or "swing".
 * @param {Function} [complete()] - A function to call once the animation is complete. Inside the function, `this` will
 * refer to the element that was animated.
 * @see {@link http://api.jquery.com/animate/ | .animate() | jQuery API Documentation}
 */
NodeCollectionPrototype.animate = callOnEachElement(HTMLElementPrototype.animate);

/**
 * Appends each node in this collection to the end of the specified target(s).
 * 
 * @function NodeCollection.prototype.appendTo
 * @param {String|ParentNode|NodeCollection} target - A specific node, collection of nodes, or a selector to find a set of nodes to which each node will be appended.
 * @throws {HierarchyRequestError} The target(s) must implement the {@link ParentNode} interface.
 */
NodeCollectionPrototype.appendTo = getPutToOrAllFunction('appendWith');

/**
 * Alias of {@link NodeCollection#appendWith} provided for similarity with jQuery.
 * 
 * Note that Firebolt does not define a method called "append" for {@link Node}. This is because the DOM Living Standard has defined
 * a native function called `append` for the {@link http://dom.spec.whatwg.org/#interface-parentnode|ParentNode Interface} that
 * does not function in the same way as `.appendWith()`.
 * 
 * @function NodeCollection.prototype.append
 * @see NodeCollection#appendWith
 */
/**
 * Appends content to the end of each element in the collection.
 * 
 * @function NodeCollection.prototype.appendWith
 * @param {...(String|Node|NodeCollection)} content - One or more HTML strings, nodes, or collections of nodes to insert.
 * @throws {HierarchyRequestError} The nodes in the collection must implement the {@link ParentNoded} interface.
 */
NodeCollectionPrototype.appendWith = NodeCollectionPrototype.append = function() {
	var len = this.length,
		firstNode = this[0];
	if (len > 1) {
		var fragment = createFragment(arguments),
			i = 1;
		for (; i < len; i++) {
			this[i].appendChild(fragment.cloneNode(true));
		}
		firstNode.appendChild(fragment);
	}
	else if (len) { //Only one element to append to
		firstNode.appendWith.apply(firstNode, arguments);
	}

	return this;
}

/**
 * Gets the value of the specified attribute of the first element in the collection.
 * 
 * @function NodeCollection.prototype.attr
 * @param {String} attribute - The name of the attribute who's value you want to get.
 * @returns {String} The value of the attribute.
 */
/**
 * Sets the specified attribute for each element in the collection.
 * 
 * @function NodeCollection.prototype.attr
 * @param {String} attribute - The name of the attribute who's value should be set.
 * @param {String} value - The value to set the specified attribute to.
 */
/**
 * Sets attributes for each element in the collection.
 * 
 * @function NodeCollection.prototype.attr
 * @param {Object} attributes - An object of attribute-value pairs to set.
 */
NodeCollectionPrototype.attr = getFirstSetEachElement(HTMLElementPrototype.attr, function(numArgs) {
	return numArgs < 2;
});

/**
 * Alias of {@link NodeCollection#beforePut} provided for similarity with jQuery.
 * 
 * Note that Firebolt does not define a method called "before" for {@link Node}. This is because the DOM Living Standard has defined
 * a native function called `before` for the {@link http://dom.spec.whatwg.org/#interface-childnode|ChildNode Interface} that
 * does not function in the same way as `.beforePut()`.
 * 
 * @function NodeCollection.prototype.before
 * @see NodeCollection#beforePut
 */
/**
 * Inserts content before each node in the collection.
 * 
 * @function NodeCollection.prototype.beforePut
 * @param {...(String|Node|NodeCollection)} content - One or more HTML strings, nodes, or collections of nodes to insert.
 * @throws {TypeError|NoModificationAllowedError} The subject collection of nodes must only contain nodes that have a
 * {@link https://developer.mozilla.org/en-US/docs/Web/API/Node.parentNode|ParentNode}.
 */
NodeCollectionPrototype.beforePut = NodeCollectionPrototype.before = function() {
	var len = this.length,
		firstNode = this[0];
	if (len > 1) {
		var fragment = createFragment(arguments),
			i = 1;
		for (; i < len; i++) {
			insertBefore(fragment.cloneNode(true), this[i]);
		}
		insertBefore(fragment, firstNode);
	}
	else if (len) { //This collection only has one node
		firstNode.beforePut.apply(firstNode, arguments);
	}

	return this;
}

/**
 * Gets the child elements of each element in the collection, optionally filtered by a selector.
 * 
 * @function NodeCollection.prototype.children
 * @param {String} [selector] - A CSS selector used to filter the returned set of elements.
 * @returns {NodeCollection} The set of children, sorted in document order.
 */
NodeCollectionPrototype.children = getGetDirElementsFunc(HTMLElementPrototype.childElements, sortDocOrder);

/**
 * Returns a clone of the collection with all non-elements removed.
 * 
 * @returns {NodeCollection} A reference to the new collection.
 */
NodeCollectionPrototype.clean = function() {
	return this.filter(function(node) {
		return node.nodeType === 1;
	});
}

/**
 * Clicks each element in the collection.
 * 
 * @function NodeCollection.prototype.click
 */
NodeCollectionPrototype.click = callOnEachElement(HTMLElementPrototype.click);

/**
 * @summary For each node in the collection, gets the first node that matches the selector by testing the node itself
 * and traversing up through its ancestors in the DOM tree.
 * 
 * @description
 * __Note:__ Unlike jQuery, there is no version of this function where you can provide a "context" element, whose children that match
 * the input CSS selector will be searched for a match. This is because it is very easy to get the matching children of an element
 * youself using [`Element#querySelectorAll()`](https://developer.mozilla.org/en-US/docs/Web/API/Element.querySelectorAll) or Firebolt's
 * alias `Element#$QSA()`.
 * 
 * @function NodeCollection.prototype.closest
 * @param {String|Element|Node[]} selector - A CSS selector, a node, or a collection of nodes used to match the node and its parents against.
 * @returns {Node[]} - A collection of "closest" nodes.
 */
NodeCollectionPrototype.closest = function(selector) {
	var nc = new NodeCollection(),
		i = 0,
		node;

	for (; i < this.length; i++) {
		if (node = this[i].closest(selector)) {
			nc.push(node);
		}
	}

	return nc;
};

/**
 * Gets the computed style object of the first element in the collection.
 * 
 * @function NodeCollection.prototype.css
 * @returns {Object.<String, String>} The element's computed style object.
 */
/**
 * Gets the value of the specified style property of the first element in the collection.
 * 
 * @function NodeCollection.prototype.css
 * @param {String} propertyName - The name of the style property who's value you want to retrieve.
 * @returns {String} The value of the specifed style property.
 */
/**
 * Explicitly sets each elements' inline CSS style, replacing any current inline style properties.
 * 
 * @function NodeCollection.prototype.css
 * @param {String} cssText - A CSS style string. To clear each element's inline style, pass in an empty string.
 */
/**
 * Gets an object of property-value pairs for the input array of CSS properties for the first element in the collection.
 * 
 * @function NodeCollection.prototype.css
 * @param {String[]} propertyNames - An array of one or more CSS properties.
 * @returns {Object.<String, String>} An object of property-value pairs where the values are the computed style values of the input properties.
 */
/**
 * Sets the specified style property for each element in the collection.
 * 
 * __Note:__ Unlike jQuery, if the passed in value is a number, it will not be converted to a string with `'px'` appended to it
 * to it prior to setting the CSS value. This helps keep the library small and fast and will force your code to be more obvious
 * as to how it is changing the element's style (which is a good thing).
 * 
 * @function NodeCollection.prototype.css
 * @param {String} propertyName - The name of the style property to set.
 * @param {String|Number} value - A value to set for the specified property.
 */
/**
 * Sets CSS style properties for each element in the collection.
 * 
 * __Note:__ Just like the previous function, if a value in the object is a number, it will not be converted to a
 * string with `'px'` appended to it to it prior to setting the CSS value.
 * 
 * @function NodeCollection.prototype.css
 * @param {Object.<String, String|Number>} properties - An object of CSS property-values.
 */
NodeCollectionPrototype.css = getFirstSetEachElement(HTMLElementPrototype.css, function(numArgs, firstArg) {
	return !numArgs || numArgs < 2 && firstArg && (typeofString(firstArg) && !firstArg.contains(':') || isArray(firstArg));
});

/**
 * Gets the first element's stored data object.
 * 
 * @function NodeCollection.prototype.data
 * @returns {Object} The element's stored data object.
 */
/**
 * Get the value at the named data store for the first element as set by .data(key, value) or by an HTML5 data-* attribute.
 * 
 * @function NodeCollection.prototype.data
 * @param {String} key - The name of the stored data.
 * @returns {*} The value of the stored data.
 */
/**
 * Stores arbitrary data associated with each element in the collection.
 * 
 * @function NodeCollection.prototype.data
 * @param {String} key - A string naming the data to set.
 * @param {*} value - Any arbitrary data to store.
 */
/**
 * Stores arbitrary data associated with each element in the collection
 * 
 * @function NodeCollection.prototype.data
 * @param {Object} obj - An object of key-value pairs to add to each element's stored data.
 */
NodeCollectionPrototype.data = getFirstSetEachElement(ElementPrototype.data, function(numArgs, firstArg) {
	return !numArgs || numArgs < 2 && typeofString(firstArg);
});

/**
 * Removes all child nodes from each element in the list.
 * 
 * @function NodeCollection.prototype.empty
 */
NodeCollectionPrototype.empty = callOnEachElement(HTMLElementPrototype.empty);

/**
 * Displays each element in the collection by fading it to opaque.
 * 
 * @function NodeCollection.prototype.fadeIn
 * @param {Number} [duration=400] - A number of milliseconds that specifies how long the animation will run.
 * @param {String} [easing="swing"] - A string indicating which easing function to use for the transition. The string can be any
 * [CSS transition timing function](http://www.w3schools.com/cssref/css3_pr_transition-timing-function.asp) or "swing".
 * @param {Function} [complete()] - A function to call once the animation is complete. Inside the function, `this` will
 * refer to the element that was animated.
 */
NodeCollectionPrototype.fadeIn = callOnEachElement(HTMLElementPrototype.fadeIn);

/**
 * Hides each element in the collection by fading it to transparent.
 * 
 * @function NodeCollection.prototype.fadeOut
 * @param {Number} [duration=400] - A number of milliseconds that specifies how long the animation will run.
 * @param {String} [easing="swing"] - A string indicating which easing function to use for the transition. The string can be any
 * [CSS transition timing function](http://www.w3schools.com/cssref/css3_pr_transition-timing-function.asp) or "swing".
 * @param {Function} [complete()] - A function to call once the animation is complete. Inside the function, `this` will
 * refer to the element that was animated.
 */
NodeCollectionPrototype.fadeOut = callOnEachElement(HTMLElementPrototype.fadeOut);

/**
 * Displays or hides each element in the collection by animating its opacity.
 * 
 * @function NodeCollection.prototype.fadeToggle
 * @param {Number} [duration=400] - A number of milliseconds that specifies how long the animation will run.
 * @param {String} [easing="swing"] - A string indicating which easing function to use for the transition. The string can be any
 * [CSS transition timing function](http://www.w3schools.com/cssref/css3_pr_transition-timing-function.asp) or "swing".
 * @param {Function} [complete()] - A function to call once the animation is complete. Inside the function, `this` will
 * refer to the element that was animated.
 */
NodeCollectionPrototype.fadeToggle = callOnEachElement(HTMLElementPrototype.fadeToggle);

/**
 * Creates a new NodeCollection containing only the elements that match the provided selector.
 * (If you want to filter against another set of elements, use the {@linkcode Array#intersect|intersect} function.)
 * 
 * @function NodeCollection.prototype.filter
 * @param {String} selector - CSS selector string to match the current collection of elements against.
 * @returns {NodeCollection}
 */
/**
 * Creates a new NodeCollection with all elements that pass the test implemented by the provided function.
 * (If you want to filter against another set of elements, use the {@linkcode Array#intersect|intersect} function.)
 * 
 * @function NodeCollection.prototype.filter
 * @param {Function} function(value, index, collection) - A function used as a test for each element in the collection.
 * @returns {NodeCollection}
 * @see [Array.prototype.filter() - JavaScript | MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/filter)
 */
NodeCollectionPrototype.filter = function(selector) {
	return ncFilter.call(this, 
		typeofString(selector)
			? function(node) { return node.matches && node.matches(selector); } //Use CSS string filter
			: selector //Use given filter function
	);
};

/**
 * Gets the descendants of each element in the collection, filtered by a selector, collection of elements, or a single element.
 * 
 * @function NodeCollection.prototype.find
 * @param {String|Element|Element[]} selector - A CSS selector, a collection of elements, or a single element used to match descendant elements against.
 * @returns {NodeList|NodeCollection}
 */
NodeCollectionPrototype.find = getGetDirElementsFunc(ElementPrototype.find, sortDocOrder);

/**
 * Hides each element in the collection.
 * 
 * @function NodeCollection.prototype.hide
 * @see HTMLElement#hide
 */
NodeCollectionPrototype.hide = callOnEachElement(HTMLElementPrototype.hide);

/**
 * Gets the inner HTML of the first element in the list.
 * 
 * @function NodeCollection.prototype.html
 * @returns {String} The element's inner HTML.
 */
/**
 * Sets the inner HTML of each element in the list.
 * 
 * @function NodeCollection.prototype.html
 * @param {String} innerHTML - An HTML string.
 */
NodeCollectionPrototype.html = getFirstSetEachElement(HTMLElementPrototype.html, function(numArgs) {
	return !numArgs;
});

/**
 * Returns the `index`th item in the collection. If `index` is greater than or equal to the number of nodes in the list, this returns `null`.
 * 
 * @function NodeCollection.prototype.item
 * @param {Number} index
 * @returns {?Node}
 * @see http://www.w3.org/TR/DOM-Level-3-Core/core.html#ID-844377136
 */
NodeCollectionPrototype.item = function(index) {
	return this[index] || null;
};

/**
 * Alias of {@link NodeCollection#putAfter} provided for similarity with jQuery.
 * 
 * @function NodeCollection.prototype.insertAfter
 * @see NodeCollection#putAfter
 */

/**
 * Alias of {@link NodeCollection#putBefore} provided for similarity with jQuery.
 * 
 * @function NodeCollection.prototype.insertBefore
 * @see NodeCollection#putBefore
 */

/**
 * Get the each node's immediately following sibling element. If a selector is provided, it retrieves the next sibling only if it matches that selector.
 * 
 * @function NodeCollection.prototype.next
 * @param {String} [selector] - A CSS selector to match the next sibling against.
 * @returns {NodeCollection} The collection of sibling elements.
 */
NodeCollectionPrototype.next = getNextOrPrevFunc(nextElementSibling);

/**
 * Gets all following siblings of each node in the collection, optionally filtered by a selector.
 * 
 * @function NodeCollection.prototype.nextAll
 * @param {String} [selector] - A CSS selector used to filter the returned set of elements.
 * @returns {NodeCollection} The set of following sibling elements in order beginning with the closest sibling.
 */
NodeCollectionPrototype.nextAll = getGetDirElementsFunc(HTMLElementPrototype.nextAll, sortDocOrder);

/**
 * Gets the following siblings of each node in the collection, up to but not including the elements matched by the selector,
 * DOM node, or node in a collection.
 * 
 * @function NodeCollection.prototype.nextUntil
 * @param {String|Element|Node[]} [selector] - A CSS selector, an element, or a collection of nodes used to indicate
 * where to stop matching following sibling elements.
 * @param {String} [filter] - A CSS selector used to filter the returned set of elements.
 * @returns {NodeCollection} - The set of following sibling elements in order beginning with the closest sibling.
 */
NodeCollectionPrototype.nextUntil = getGetDirElementsFunc(HTMLElementPrototype.nextUntil, sortDocOrder);

/**
 * Removes one or more event handlers set by `.on()` or `.one()`.
 * 
 * @function NodeCollection.prototype.off
 * @param {String} events - One or more space-separated event types, such as "click" or "click keypress".
 * @param {String} [selector] - A selector which should match the one originally passed to `.on()` when attaching event handlers.
 * @param {Function} [handler] - A handler function previously attached for the event(s), or the special value `false` (see `NodeCollection#on()`).
 * @see {@link http://api.jquery.com/off/#off-events-selector-handler|.off() | jQuery API Documentation}
 */
/**
 * Removes one or more event handlers set by `.on()` or `.one()`.
 * 
 * @function NodeCollection.prototype.off
 * @param {Object} events - An object where the string keys represent one or more space-separated event types and the values represent
 * handler functions previously attached for the event(s).
 * @param {String} [selector] - A selector which should match the one originally passed to `.on()` when attaching event handlers.
 * @see {@link http://api.jquery.com/off/#off-events-selector|.off() | jQuery API Documentation}
 */
/**
 * Removes all event handlers set by `.on()` or `.one()`.
 * 
 * @function NodeCollection.prototype.off
 * @see {@link http://api.jquery.com/off/#off|.off() | jQuery API Documentation}
 */
NodeCollectionPrototype.off = callOnEach(NodePrototype.off);

/**
 * Gets the current coordinates of the first element in the collection relative to the document.
 * 
 * @function NodeCollection.prototype.offset
 * @returns {{top: Number, left: Number}} An object containing the coordinates detailing the element's distance from the top and left of the document.
 * @see HTMLElement#offset
 */
/**
 * Sets the each element's coordinates relative to the document.
 * 
 * @function NodeCollection.prototype.offset
 * @param {{top: Number, left: Number}} coordinates - An object containing the properties `top` and `left`,
 * which are numbers indicating the new top and left coordinates to set for each element.
 */
NodeCollectionPrototype.offset = getFirstSetEachElement(HTMLElementPrototype.offset, function(numArgs) {
	return !numArgs;
});

/**
 * @summary Attaches an event handler function for one or more events to each node in the collection.
 *  
 * @description Check out [jQuery's documentation](http://api.jquery.com/on/) for details. There are only a couple minor differences:
 * 1. Firebolt does not offer event namespacing.
 * 2. The native [Event](https://developer.mozilla.org/en-US/docs/Web/API/Event) object is passed to the handler (with an added
 * `data` property, and if propagation is stopped, there will be a `propagationStopped` property set to `true`).
 * 
 * @function NodeCollection.prototype.on
 * @param {String} events - One or more space-separated event types, such as "click" or "click keypress".
 * @param {String} [selector] - A selector string to filter the descendants of the selected elements that trigger the event.
 * If the selector is `null` or omitted, the event is always triggered when it reaches the selected element.
 * @param {*} [data] - Data to be passed to the handler in `eventObject.data` when an event is triggered.
 * @param {Function} handler(eventObject) - A function to execute when the event is triggered. Inside the function, `this` will refer to
 * the node the event was triggered on. The value `false` is also allowed as a shorthand for a function that simply does `return false`.
 * @see {@link http://api.jquery.com/on/#on-events-selector-data-handler|.on() | jQuery API Documentation}
 */
/**
 * @summary Attaches an event handler function for one or more events to each node in the collection.
 *  
 * @description Check out [jQuery's documentation](http://api.jquery.com/on/) for details. There are only a couple minor differences:
 * 1. Firebolt does not offer event namespacing.
 * 2. The native [Event](https://developer.mozilla.org/en-US/docs/Web/API/Event) object is passed to the handler (with an added
 * `data` property, and if propagation is stopped, there will be a `propagationStopped` property set to `true`).
 * 
 * @function NodeCollection.prototype.on
 * @param {Object} events - An object where the string keys represent one or more space-separated event types and the values represent
 * handler functions to be called for the event(s).
 * @param {String} [selector] - A selector string to filter the descendants of the selected elements that trigger the event.
 * If the selector is `null` or omitted, the event is always triggered when it reaches the selected element.
 * @param {*} [data] - Data to be passed to the handler in `eventObject.data` when an event is triggered.
 * @see {@link http://api.jquery.com/on/#on-events-selector-data|.on() | jQuery API Documentation}
 */
NodeCollectionPrototype.on = callOnEach(NodePrototype.on);

/**
 * Attaches a handler to an event for each node in the collection. The handler is executed at most once per node, per event type.  
 * Exactly the same as `NodeCollection#on()` except the event handler is removed after it executes for the first time.
 * 
 * @function NodeCollection.prototype.one
 * @param {String} events
 * @param {String} [selector]
 * @param {*} [data]
 * @param {Function} handler(eventObject)
 * @see {@link http://api.jquery.com/one/#one-events-selector-data-handler|.one() | jQuery API Documentation}
 */
/**
 * Attaches a handler to an event for each node in the collection. The handler is executed at most once per node, per event type.  
 * Exactly the same as `NodeCollection#on()` except the event handler is removed after it executes for the first time.
 * 
 * @function NodeCollection.prototype.one
 * @param {Object} events
 * @param {String} [selector]
 * @param {*} [data]
 * @see {@link http://api.jquery.com/one/#one-events-selector-data|.one() | jQuery API Documentation}
 */
NodeCollectionPrototype.one = callOnEach(NodePrototype.one);

/**
 * Gets the parent of each node in the collection, optionally filtered by a selector.
 * 
 * @function NodeCollection.prototype.parent
 * @param {String} [selector] - A CSS selector used to filter the returned set of elements.
 * @returns {NodeCollection} - The set of parents. Unlike the `.parents()` function, this set may include Document and DocumentFragment nodes.
 */
NodeCollectionPrototype.parent = function(selector) {
	var nc = new NodeCollection(),
		i = 0,
		parent;
	for (; i < this.length; i++) {
		parent = this[i].parentNode;
		if ((!selector || (parent.matches && parent.matches(selector))) && nc.indexOf(parent) < 0) {
			nc.push(parent);
		}
	}
	return nc;
};

/**
 * Gets the ancestors of each node in the collection, optionally filtered by a selector.
 * 
 * @function NodeCollection.prototype.parents
 * @param {String} [selector] - A CSS selector used to filter the returned set of elements.
 * @returns {NodeCollection} - The set of ancestors, sorted in reverse document order.
 */
NodeCollectionPrototype.parents = getGetDirElementsFunc(HTMLElementPrototype.parents, sortRevDocOrder);

/**
 * Gets the ancestors of each node in the collection, up to but not including the elements matched by the selector,
 * DOM node, or node in a collection.
 * 
 * @function NodeCollection.prototype.parentsUntil
 * @param {String|Element|Node[]} [selector] - A CSS selector, an element, or a collection of nodes used to indicate
 * where to stop matching ancestor elements.
 * @param {String} [filter] - A CSS selector used to filter the returned set of elements.
 * @returns {NodeCollection} - The set of ancestors, sorted in reverse document order.
 */
NodeCollectionPrototype.parentsUntil = getGetDirElementsFunc(HTMLElementPrototype.parentsUntil, sortRevDocOrder);

/**
 * Alias of {@link NodeCollection#prependWith} provided for similarity with jQuery.
 * 
 * Note that Firebolt does not define a method called "prepend" for {@link Node}. This is because the DOM Living Standard has defined
 * a native function called `prepend` for the {@link http://dom.spec.whatwg.org/#interface-parentnode|ParentNode Interface} that
 * does not function in the same way as `.prependWith()`.
 * 
 * @function NodeCollection.prototype.prepend
 * @see NodeCollection#prependWith
 */
/**
 * Prepends content to the beginning of each element in the collection.
 * 
 * @function NodeCollection.prototype.prependWith
 * @param {...(String|Node|NodeCollection)} content - One or more HTML strings, nodes, or collections of nodes to insert.
 * @throws {HierarchyRequestError} The nodes in the collection must implement the {@link ParentNoded} interface.
 */
NodeCollectionPrototype.prependWith = NodeCollectionPrototype.prepend = function() {
	var len = this.length,
		firstNode = this[0];
	if (len > 1) {
		var fragment = createFragment(arguments),
			i = 1;
		for (; i < len; i++) {
			prepend(fragment.cloneNode(true), this[i]);
		}
		prepend(fragment, firstNode);
	}
	else if (len) { //Only one element to append to
		firstNode.prependWith.apply(firstNode, arguments);
	}

	return this;
};

/**
 * Prepends each node in this collection to the beginning of the specified target(s).
 * 
 * @function NodeCollection.prototype.prependTo
 * @param {String|ParentNode|NodeCollection} target - A specific node, collection of nodes, or a selector to find a set of nodes to which each node will be prepended.
 * @throws {HierarchyRequestError} The target(s) must implement the {@link ParentNode} interface.
 */
NodeCollectionPrototype.prependTo = getPutToOrAllFunction('prependWith');

/**
 * Get the each node's immediately preceeding sibling element. If a selector is provided, it retrieves the previous sibling only if it matches that selector.
 * 
 * @function NodeCollection.prototype.prev
 * @param {String} [selector] - A CSS selector to match the previous sibling against.
 * @returns {NodeCollection} The collection of sibling elements.
 */
NodeCollectionPrototype.prev = getNextOrPrevFunc(previousElementSibling);

/**
 * Gets all preceeding siblings of each node in the collection, optionally filtered by a selector.
 * 
 * @function NodeCollection.prototype.prevAll
 * @param {String} [selector] - A CSS selector used to filter the returned set of elements.
 * @returns {NodeCollection} The set of preceeding sibling elements in order beginning with the closest sibling.
 */
NodeCollectionPrototype.prevAll = getGetDirElementsFunc(HTMLElementPrototype.prevAll, sortRevDocOrder);

/**
 * Gets the preceeding siblings of each node in the collection, up to but not including the elements matched by the selector,
 * DOM node, or node in a collection.
 * 
 * @function NodeCollection.prototype.prevUntil
 * @param {String|Element|Node[]} [selector] - A CSS selector, an element, or a collection of nodes used to indicate
 * where to stop matching preceeding sibling elements.
 * @param {String} [filter] - A CSS selector used to filter the returned set of elements.
 * @returns {NodeCollection} - The set of preceeding sibling elements in order beginning with the closest sibling.
 */
NodeCollectionPrototype.prevUntil = getGetDirElementsFunc(HTMLElementPrototype.prevUntil, sortRevDocOrder);

/**
 * Gets the value of the specified property of the first element in the list.
 * 
 * @function NodeCollection.prototype.prop
 * @param {String} property - The name of the property who's value you want to get.
 * @returns {?} The value of the property being retrieved.
 */
/**
 * Sets the specified property for each element in the list.
 * 
 * @function NodeCollection.prototype.prop
 * @param {String} property - The name of the property to be set.
 * @param {*} value - The value to set the property to.
 */
/**
 * Sets the specified properties of each element in the list.
 * 
 * @function NodeCollection.prototype.prop
 * @param {Object} properties - An object of property-value pairs to set.
 */
NodeCollectionPrototype.prop = getFirstSetEachElement(HTMLElementPrototype.prop, function(numArgs, firstArg) {
	return numArgs < 2 && typeofString(firstArg);
});

/**
 * Inserts each node in this collection directly after the specified target(s).
 * 
 * @function NodeCollection.prototype.putAfter
 * @param {String|Node|NodeCollection} target - A specific node, collection of nodes, or a selector to find a set of nodes after which each node will be inserted.
 * @throws {TypeError} The target node(s) must have a {@link https://developer.mozilla.org/en-US/docs/Web/API/Node.parentNode|ParentNode}.
 */
NodeCollectionPrototype.putAfter = NodeCollectionPrototype.insertAfter = getPutToOrAllFunction('afterPut');

/**
 * Inserts each node in this collection directly before the specified target(s).
 * 
 * @function NodeCollection.prototype.insertBefore
 * @param {String|Node|NodeCollection} target - A specific node, collection of nodes, or a selector to find a set of nodes before which each node will be inserted.
 * @throws {TypeError} The target node(s) must have a {@link https://developer.mozilla.org/en-US/docs/Web/API/Node.parentNode|ParentNode}.
 */
NodeCollectionPrototype.putBefore = NodeCollectionPrototype.insertBefore = getPutToOrAllFunction('beforePut');

/**
 * Removes nodes in the collection from the DOM tree.
 * 
 * @function NodeCollection.prototype.remove
 * @param {String} [selector] - A selector that filters the set of elements to be removed.
 */
NodeCollectionPrototype.remove = function(selector) {
	var nodes = selector ? this.filter(selector) : this,
		i = 0;
	for (; i < nodes.length; i++) {
		nodes[i].remove();
	}

	return this;
};

/**
 * Removes the specified attribute from each element in the list.
 * 
 * @function NodeCollection.prototype.removeAttr
 * @param {String} attribute - The name of the attribute to be removed.
 */
NodeCollectionPrototype.removeAttr = callOnEachElement(HTMLElementPrototype.removeAttr);

/**
 * Removes the input class name from all elements in the list.
 * 
 * @function NodeCollection.prototype.removeClass
 * @param {String} className - The class to be removed from each element in the collection.
 */
NodeCollectionPrototype.removeClass = callOnEachElement(HTMLElementPrototype.removeClass);

/**
 * Removes a previously stored piece of Firebolt data from each element.  
 * When called without any arguments, all data is removed.
 * 
 * @function NodeCollection.prototype.removeData
 * @param {String} [name] - The name of the data to remove.
 */
/**
 * Removes previously stored Firebolt data from each element.  
 * When called without any arguments, all data is removed.
 * 
 * @function NodeCollection.prototype.removeData
 * @param {Array|String} [list] - An array or space-separated string naming the pieces of data to remove.
 */
NodeCollectionPrototype.removeData = callOnEachElement(HTMLElementPrototype.removeData);

/**
 * Removes the specified property from each element in the list.
 * 
 * @function NodeCollection.prototype.removeProp
 * @param {String} property - The name of the property to remove.
 */
NodeCollectionPrototype.removeProp = callOnEachElement(HTMLElementPrototype.removeProp);

/**
 * Replace the target with the nodes in this collection.
 * 
 * @function NodeCollection.prototype.replaceAll
 * @param {String|Node|NodeCollection} target - A specific node, collection of nodes, or a selector to find a set of nodes to be replaced
 * by the nodes in this collection.
 * @throws {TypeError} The target node(s) must have a {@link https://developer.mozilla.org/en-US/docs/Web/API/Node.parentNode|ParentNode}.
 */
NodeCollectionPrototype.replaceAll = getPutToOrAllFunction('replaceWith');

/**
 * Replace each node in the collection with some other content.
 * 
 * @function NodeCollection.prototype.replaceWith
 * @param {...(String|Node|NodeCollection)} content - A specific node, a collection of nodes, or some HTML to replace each node in the collection.
 * @throws {TypeError|NoModificationAllowedError} The subject collection of nodes must only contain nodes that have a
 * {@link https://developer.mozilla.org/en-US/docs/Web/API/Node.parentNode|ParentNode}.
 */
NodeCollectionPrototype.replaceWith = function() {
	var len = this.length,
		firstNode = this[0];
	if (len > 1) {
		var fragment = createFragment(arguments),
			i = 1;
		for (; i < len; i++) {
			replaceWith(fragment.cloneNode(true), this[i]);
		}
		replaceWith(fragment, firstNode);
	}
	else if (len) { //This collection only has one node
		firstNode.replaceWith.apply(firstNode, arguments);
	}

	return this;
};

/**
 * Encode a set of form elements or form control elements as a string for submission in an HTTP request.  
 * Note that only [successful controls](http://www.w3.org/TR/html401/interact/forms.html#h-17.13.2) will
 * have their values added to the serialized string. All button elements (including file input buttons)
 * are also ignored.
 * 
 * __Protip:__ The best way to serialize a single form is to select the form element and  call `.serialize()`
 * directly on it (see {@link HTMLElement#serialize}).
 * 
 * @function NodeCollection.prototype.serialize
 * @returns {String} A URL-encoded string of the elements' serialized values or an empty string if no element could be successfully serialized.
 * @throws {TypeError} Each element in the collection must be an HTMLElement.
 * @see HTMLElement#serialize
 * @see {@link http://api.jquery.com/serialize/|.serialize() | jQuery API Documentation}
 */
NodeCollectionPrototype.serialize = function() {
	var retStr = '',
		i = 0,
		val;

	for (; i < this.length; i++) {
		if (val = this[i].serialize()) {
			retStr += (retStr ? '&' : '') + val;
		}
	}

	return retStr;
};

/**
 * Shows each element in the collection. For specifics, see {@link HTMLElement#show}.
 * 
 * @function NodeCollection.prototype.show
 * @see HTMLElement#show
 */
NodeCollectionPrototype.show = callOnEachElement(HTMLElementPrototype.show);

/**
 * Gets the sibling elements of each node in the collection, optionally filtered by a selector.
 * 
 * @function NodeCollection.prototype.siblings
 * @param {String} [selector] - A CSS selector used to filter the returned set of elements.
 * @returns {NodeCollection} The set of siblings, sorted in document order.
 * @throws {TypeError} The target node(s) must have a {@link https://developer.mozilla.org/en-US/docs/Web/API/Node.parentNode|ParentNode}.
 */
NodeCollectionPrototype.siblings = getGetDirElementsFunc(HTMLElementPrototype.siblings, sortDocOrder);

/**
 * Displays each element in the collection with a sliding motion.
 * 
 * @function NodeCollection.prototype.slideDown
 * @param {Number} [duration=400] - A number of milliseconds that specifies how long the animation will run.
 * @param {String} [easing="swing"] - A string indicating which easing function to use for the transition. The string can be any
 * [CSS transition timing function](http://www.w3schools.com/cssref/css3_pr_transition-timing-function.asp) or "swing".
 * @param {Function} [complete()] - A function to call once the animation is complete. Inside the function, `this` will
 * refer to the element that was animated.
 */
NodeCollectionPrototype.slideDown = callOnEachElement(HTMLElementPrototype.slideDown);

/**
 * Displays or hides each element in the collection with a sliding motion.
 * 
 * @function NodeCollection.prototype.slideToggle
 * @param {Number} [duration=400] - A number of milliseconds that specifies how long the animation will run.
 * @param {String} [easing="swing"] - A string indicating which easing function to use for the transition. The string can be any
 * [CSS transition timing function](http://www.w3schools.com/cssref/css3_pr_transition-timing-function.asp) or "swing".
 * @param {Function} [complete()] - A function to call once the animation is complete. Inside the function, `this` will
 * refer to the element that was animated.
 */
NodeCollectionPrototype.slideToggle = callOnEachElement(HTMLElementPrototype.slideToggle);

/**
 * Hides each element in the collection with a sliding motion.
 * 
 * @function NodeCollection.prototype.slideUp
 * @param {Number} [duration=400] - A number of milliseconds that specifies how long the animation will run.
 * @param {String} [easing="swing"] - A string indicating which easing function to use for the transition. The string can be any
 * [CSS transition timing function](http://www.w3schools.com/cssref/css3_pr_transition-timing-function.asp) or "swing".
 * @param {Function} [complete()] - A function to call once the animation is complete. Inside the function, `this` will
 * refer to the element that was animated.
 */
NodeCollectionPrototype.slideUp = callOnEachElement(HTMLElementPrototype.slideUp);

/**
 * Shows each element in the collection if it is hidden or hides it if it is currently showing.
 * 
 * @function NodeCollection.prototype.toggle
 * @see HTMLElement#hide
 * @see HTMLElement#show
 */
NodeCollectionPrototype.toggle = callOnEachElement(HTMLElementPrototype.toggle);

/**
 * Gets the combined text contents of each node in the list.
 * 
 * @function NodeCollection.prototype.text
 * @returns {String} The node's text content.
 */
/**
 * Sets the text content of each node in the list.
 * 
 * @function NodeCollection.prototype.text
 * @param {String|*} text - The text or content that will be converted to a string to be set as each nodes' text content.
 */
NodeCollectionPrototype.text = function(text) {
	var len = this.length,
		i = 0;
	//Get
	if (isUndefined(text)) {
		for (text = ''; i < len; i++) {
			text += this[i].textContent;
		}
		return text;
	}
	//Set
	for (; i < len; i++) {
		this[i].textContent = text;
	}

	return this;
};

/**
 * Toggles the input class name for all elements in the list.
 * 
 * @function NodeCollection.prototype.toggleClass
 * @param {String} className - The class to be toggled for each element in the collection.
 */
NodeCollectionPrototype.toggleClass = callOnEachElement(HTMLElementPrototype.toggleClass);

/**
 * Remove the each node's parent from the DOM, leaving the node in its place.
 * 
 * @function NodeCollection.prototype.unwrap
 * @throws {TypeError} Each node must have a {@link https://developer.mozilla.org/en-US/docs/Web/API/Node.parentNode|ParentNode},
 * which in turn must also have a ParentNode.
 */
NodeCollectionPrototype.unwrap = function() {
	var parents = this.parent(),
		i = 0,
		parent;
	for (; i < parents.length; i++) {
		parent = parents[i];
		if (parent.nodeName != 'BODY') {
			parent.replaceWith(parent.childNodes);
		}
	}

	return this;
};

/**
 * Retrieves the current value of the first element in the collection. If the element is a `<select>` element, `null` is returned if
 * none of its options are selected and an array of selected options is returned if the element's `multiple` attribute is present.
 * 
 * @function NodeCollection.prototype.val
 * @returns {String|Array|null} The first element's value.
 */
/**
 * Sets the value of each element in the collection.
 * 
 * @function NodeCollection.prototype.val
 * @param {String} value - The value to give to each element.
 */
/**
 * Checks each element in the collection if its current value is in the input array of values and deselects it otherwise
 * (only `<input>` elements with type `checkbox` or `radio`).  
 * If an element is a `<select>` element, all of its options with a value matching one in the input array of values will be selected
 * and all others deselected. If the select element does not allow multiple selection, only the first matching element is selected.
 * 
 * @function NodeCollection.prototype.val
 * @param {String[]} values - The array of values used to determine if each element (or its options) should be checked (or selected).
 */
NodeCollectionPrototype.val = function(value) {
	//Get first
	if (isUndefined(value)) {
		return this[0].val();
	}

	//Set each
	for (var i = 0; i < this.length; i++) {
		this[i].val(value);
	}

	return this;
};

/**
 * Wrap an HTML structure around each node in the collection.
 * 
 * @function NodeCollection.prototype.wrap
 * @param {String|Element|Element[]) wrappingElement - CSS selector&mdash;to select wrapping element(s)&mdash;, HTML string&mdash;to
 * create wrapping element(s)&mdash;, element, or collection of elements used to specify the wrapping structure.
 * @throws {TypeError} The target node(s) must have a {@link https://developer.mozilla.org/en-US/docs/Web/API/Node.parentNode|ParentNode}.
 */
NodeCollectionPrototype.wrap = function(wrappingElement) {
	if (wrappingElement = getWrappingElement(wrappingElement)) {
		for (var i = 0; i < this.length; i++) {
			this[i].wrap(wrappingElement);
		}
	}

	return this;
};

/**
 * Wrap an HTML structure around the contents of each node in the collection.
 * 
 * @function NodeCollection.prototype.wrapInner
 * @param {String|Element|Element[]) wrappingElement - CSS selector&mdash;to select wrapping element(s)&mdash;, HTML string&mdash;to
 * create wrapping element(s)&mdash;, element, or collection of elements used to specify the wrapping structure.
 * @throws {HierarchyRequestError} The target node(s) must implement the {@link ParentNode} interface.
 */
NodeCollectionPrototype.wrapInner = function(wrappingElement) {
	if (wrappingElement = getWrappingElement(wrappingElement)) {
		for (var i = 0; i < this.length; i++) {
			this[i].wrapInner(wrappingElement);
		}
	}

	return this;
};

//#endregion NodeCollection


//#region =========================== NodeList ===============================

/**
 * @classdesc
 * The HTML DOM NodeList interface. This is the main object returned by {@link Firebolt#Firebolt|Firebolt}.  
 *   
 * Represents a collection of DOM Nodes. NodeLists have almost the exact same API as {@link NodeCollection}.  
 * However, unlike NodeCollections, NodeLists are immutable and therefore do not have any of the following functions:
 * 
 * + clear
 * + pop
 * + push
 * + reverse
 * + shift
 * + splice
 * + unshift
 * 
 * If you want to manipulate a NodeList using these functions, you must retrieve it as a NodeCollection by
 * calling {@linkcode NodeList#toNC|.toNC()} on the NodeList.
 * 
 * Also note that the following functions return the NodeCollection equivalent of the NodeList instead of
 * the NodeList itself:
 * 
 * + afterPut / after
 * + appendWith / append
 * + appendTo
 * + beforePut / before
 * + each
 * + putAfter / insertAfter
 * + putBefore / insertBefore
 * + prependWith / prepend
 * + prependTo
 * + remove
 * + removeClass
 * + replaceAll
 * + replaceWith
 * + toggleClass
 * + unwrap
 * + wrap
 * + wrapInner
 * 
 * This is because the functions my alter live NodeLists, as seen in this example:
 * 
 * ```JavaScript
 * var $blueThings = $CLS('blue');
 * $blueThings.length = 10;  // for example
 * $blueThings.removeClass('blue'); // returns $blueThings as a NodeCollection
 * $blueThings.length === 0; // true - since now there are no elements with the 'blue' class
 * ```
 * 
 * Returning a NodeCollection allows for correct functionality when chaining calls originally made on a NodeList,
 * but be aware that a live NodeList saved as a variable may be altered by these functions.
 * 
 * Finally, since it is not possible to manually create a new NodeList in JavaScript (there are tricks but
 * they are slow and not worth it), the following functions return a NodeCollection instead of a NodeList:
 * 
 * + add
 * + clean
 * + clone
 * + concat
 * + filter
 * + intersect
 * + map
 * + slice
 * + sort
 * + union
 * + unique
 * + without
 * 
 * This, however, should not be worrisome since NodeCollections have all of the same functions as NodeLists
 * with the added benefits of being mutable and static (not live).  
 * <br />
 * 
 * @class NodeList
 * @see NodeCollection
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/NodeList|NodeList - Web API Interfaces | MDN}
 */

/* Give NodeLists and HTMLCollections many of the same prototype functions as NodeCollections */
Object.getOwnPropertyNames(NodeCollectionPrototype)
	.remove( //These properties should not be added to the NodeList prototype
		'clear',
		'length',
		'pop',
		'push',
		'reverse',
		'shift',
		'splice',
		'unshift'
	).forEach(function(methodName) {
		if (rgxDifferentNL.test(methodName)) { //Convert to a NodeCollection first
			HTMLCollectionPrototype[methodName] = NodeListPrototype[methodName] = function() {
				return NodeCollectionPrototype[methodName].apply(this.toNC(), arguments);
			}
		}
		else if (!NodeListPrototype[methodName]) {
			HTMLCollectionPrototype[methodName] = NodeListPrototype[methodName] = NodeCollectionPrototype[methodName];
		}
	});

/**
 * Returns the specific node whose ID or, as a fallback, name matches the string specified by `name`.
 * 
 * @function NodeCollection.prototype.namedItem
 * @param {String} name
 * @returns {?Element}
 * @see https://developer.mozilla.org/en-US/docs/Web/API/HTMLCollection
 */
/**
 * Returns the specific node whose ID or, as a fallback, name matches the string specified by `name`.
 * 
 * @function NodeList.prototype.namedItem
 * @param {String} name
 * @returns {?Element}
 * @see https://developer.mozilla.org/en-US/docs/Web/API/HTMLCollection
 */
NodeListPrototype.namedItem = NodeCollectionPrototype.namedItem = function(name) {
	var i = 0,
		node;
	for (; i < this.length; i++) {
		node = this[i];
		if (node.id == name || node.name == name) {
			return node;
		}
	}
	return null;
};

/**
 * Returns the NodeCollection equivalent of the NodeList.
 * 
 * @function NodeList.prototype.toNC
 * @returns {NodeCollection}
 */
//This function was added to the NodeList prototype in the loop above (because NodeCollection actually has this function too)

/* HTMLCollections are always clean (since they can only contain HTMLElements) */
HTMLCollectionPrototype.clean =

/* NodeLists/HTMLCollections always contain unique elements */
NodeListPrototype.uniq = HTMLCollectionPrototype.uniq =

/* All of the above functions are equivalent to calling NodeCollection#toNC() on the NodeList/HTMLCollection */
NodeCollectionPrototype.toNC;

//#endregion NodeList


//#region ============================ Number ================================

/**
 * @class Number
 * @classdesc The JavaScript Number object.
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number|Number - JavaScript | MDN}
 */

/**
 * Returns a string representation of the number padded with leading 0s so that the string's length is at least equal to length.
 * Takes an optional radix argument which specifies the base to use for conversion.
 * 
 * @function Number.prototype.toPaddedString
 * @param {Number} length - The minimum length for the resulting string.
 * @param {Number} [radix=10] - Defines which base to use for representing the numeric value. Must be an integer between 2 and 36.
 * @example
 * (255).toPaddedString(4);     // "0255"
 * (255).toPaddedString(4, 16); // "00ff"
 * (25589).toPaddedString(4);   // "25589"
 * (3).toPaddedString(5, 2);    // "00011"
 * (-3).toPaddedString(5, 2);   // "-0011"
 */
Number[prototype].toPaddedString = function(length, radix) {
	var sNumber = this.toString(radix);
	if (length > sNumber.length) {
		sNumber = '0'.repeat(length - sNumber.length) + sNumber;
	}
	return this < 0 ? '-' + sNumber.replace('-', '') : sNumber;
}; 

//#endregion Number


//#region ============================ String ================================

/**
 * @class String
 * @classdesc The JavaScript String object.
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String|String - JavaScript | MDN}
 */

//Reuse the prototype extensions variable to hold an object of String extensions
prototypeExtensions = {
	/**
	 * Appends query string parameters to a URL.
	 *
	 * @function String.prototype.appendParams
	 * @param {String} params - Query string parameters.
	 * @returns {String} A reference to the string (chainable).
	 * @example
	 * var url = "www.google.com";
	 * url = url.appendParams('lang=en'); // -> "www.google.com?lang=en"
	 * url = url.appendParams('a=1&b=2'); // -> "www.google.com?lang=en&a=1&b=2"
	 */
	appendParams: function(params) {
		return this + (this.contains('?') ? '&' : '?') + params;
	},

	/**
	 * HTML-encodes the string by converting HTML special characters to their entity equivalents and returns the result.
	 * 
	 * @example
	 * '<img src="//somesite.com" />'.escapeHTML();  // -> '&lt;img src="//somesite.com" /&gt;'
	 * 
	 * @function String.prototype.escapeHTML
	 * @returns {String} The HTML-escaped text.
	 */
	escapeHTML: function() {
		return createElement('div').text(this).innerHTML;
	},

	/**
	 * Returns the string split into an array of substrings (tokens) that were separated by white-space.
	 *
	 * @function String.prototype.tokenize
	 * @returns {String[]} An array of tokens.
	 * @example
	 * var str = "The boy who lived.";
	 * str.tokenize();  // returns ["The", "boy", "who", "lived."]
	 */
	tokenize: function() {
		return this.match(rgxNonWhitespace) || [];
	},

	/**
	 * HTML-decodes the string by converting entities of HTML special characters to their normal form and returns the result.
	 * 
	 * @example
	 * '&lt;img src="//somesite.com" /&gt;'.unescapeHTML();  // -> '<img src="//somesite.com" />'
	 * 
	 * @function String.prototype.unescapeHTML
	 * @returns {String} The HTML-unescaped text.
	 */
	unescapeHTML: function() {
		return createElement('div').html(this).textContent;
	}
};


/* Add ES6 functions to String.prototype */

if (!StringPrototype.contains) {
	/**
	 * Determines whether the passed in string is in the current string.
	 *
	 * @function String.prototype.contains
	 * @param {String} searchString - The string to be searched for.
	 * @param {Number} [position=0] - The position in this string at which to begin the search.
	 * @returns {Boolean} `true` if this string contains the search string; else `false`.
	 * @example
	 * var str = "Winter is coming.";
	 * alert( str.contains(" is ") );    // true
	 * alert( str.contains("summer") );  // false
	 */
	prototypeExtensions.contains = function(searchString, position) {
		return this.toString().indexOf(searchString, position) >= 0;
	};
}

if (!StringPrototype.endsWith) {
	/**
	 * Determines if a string ends with the characters of another string.
	 *
	 * @function String.prototype.endsWith
	 * @param {String} searchString - The characters to be searched for at the end of this string.
	 * @param {Number} [position=this.length] - Search within this string as if this string were only this long;
	 * clamped within the range established by this string's length.
	 * @returns {Boolean} `true` if this string ends with `searchString`; else `false`.
	 * @example
	 * var str = "Who am I, Gamling?";
	 * alert( str.endsWith("Gamling?") );  // true
	 * alert( str.endsWith("am I") );      // false
	 * alert( str.endsWith("am I", 8) );   // true
	 */
	prototypeExtensions.endsWith = function(searchString, position) {
		var str = this.toString(),
			strLen = str.length;
		position = (position < strLen ? position : strLen) - searchString.length;
		return position >= 0 && str.indexOf(searchString, position) === position;
	};
}

if (!StringPrototype.repeat) {
	/**
	 * Copies the current string a given number of times and returns the new string.
	 *
	 * @function String.prototype.repeat
	 * @param {Number} count - An integer between 0 and +∞ : [0, +∞).
	 * @returns {String}
	 * @throws {RangeError} The repeat count must be positive and less than infinity.
	 * @example
	 * "abc".repeat(0)   // ""
	 * "abc".repeat(1)   // "abc"
	 * "abc".repeat(2)   // "abcabc"
	 * "abc".repeat(3.5) // "abcabcabc" (count will be converted to integer)
	 * "0".repeat(5)     // "00000"
	 */
	prototypeExtensions.repeat = function(count) {
		count = parseInt(count || 0);
		if (isNaN(count) || count < 0) {
			throw new RangeError('The repeat count must be positive and less than infinity.');
		}
		for (var str = '', i = 0; i < count; i++) {
			str += this;
		}
		return str;
	};
}

if (!StringPrototype.startsWith) {
	/**
	 * Determines whether a string starts with the characters of another string.
	 *
	 * @function String.prototype.startsWith
	 * @param {String} searchString - The characters to be searched for at the start of this string.
	 * @param {Number} [position=0] - The position in this string at which to begin searching for `searchString`.
	 * @returns {Boolean} `true` if this string starts with the search string; else `false`.
	 * @example
	 * var str = "Who am I, Gamling?";
	 * alert( str.endsWith("Who") );      // true
	 * alert( str.endsWith("am I") );     // false
	 * alert( str.endsWith("am I", 4) );  // true
	 */
	prototypeExtensions.startsWith = function(searchString, position) {
		return this.toString().lastIndexOf(searchString, position = position || 0) === position;
	};
}

//Define the prototype properties on String.prototype
definePrototypeExtensionsOn(StringPrototype);

//#endregion String


//#region ============ Browser Compatibility and Speed Boosters ==============

var isOldIE = createElement('div').html('<!--[if IE]><i></i><![endif]-->').$TAG('i').length,
	noMultiParamClassListFuncs = (function() {
		var elem = createElement('div');
		if (elem.classList) {
			elem.classList.add('one', 'two');
		}
		return elem.className.length !== 7;
	})(),
	textNode = Firebolt.text(' ');

if (isOldIE) { //IE9 compatibility

	HTMLElementPrototype.hasClass = function(className) {
		return new RegExp('(?:^|\\s)' + className + '(?:\\s|$)').test(this.className);
	};

}

/* Browser (definitely IE) compatibility and speed boost for removeClass() */
if (noMultiParamClassListFuncs || (usesWebkit && !isIOS)) {
	HTMLElementPrototype.removeClass = function(value) {
		if (isUndefined(value)) {
			this.className = ''; //Remove all classes
		}
		else {
			var remClasses = value.split(' '),
				curClasses = this.className.split(rgxSpaceChars),
				newClassName = '',
				i = 0;
			for (; i < curClasses.length; i++) {
				if (curClasses[i] && remClasses.indexOf(curClasses[i]) < 0) {
					newClassName += (newClassName ? ' ' : '') + curClasses[i];
				}
			}
			//Only assign if the new class name is different (shorter) to avoid unnecessary rendering
			if (newClassName.length < this.className.length) {
				this.className = newClassName;
			}
		}

		return this;
	};
}

//Fix the parentElement property for Nodes in browsers than only support it on Element
if (isUndefined(textNode.parentElement)) {
	defineProperty(NodePrototype, 'parentElement', {
		get: function() {
			var parent = this.parentNode;
			return parent && parent.nodeType === 1 ? parent : null;
		}
	});
}

//Fix the nextElementSibling property for Nodes in browsers than only support it on Element
if (isUndefined(textNode[nextElementSibling])) {
	defineProperty(NodePrototype, nextElementSibling, {
		get: function() {
			var sibling = this;
			while (sibling = sibling.nextSibling) {
				if (sibling.nodeType === 1) break;
			}
			return sibling;
		}
	});
}

//Fix the previousElementSibling property for Nodes in browsers than only support it on Element
if (isUndefined(textNode[previousElementSibling])) {
	defineProperty(NodePrototype, previousElementSibling, {
		get: function() {
			var sibling = this;
			while (sibling = sibling.previousSibling) {
				if (sibling.nodeType === 1) break;
			}
			return sibling;
		}
	});
}

//Fix the children property for Document and DocumentFragment in browsers than only support it on Element
if (!document.children) {
	[Document[prototype], DocumentFragment[prototype]].forEach(function(proto) {
		defineProperty(proto, 'children', {
			get: function() {
				//This method is faster in IE and slower in WebKit-based browsers, but it takes less code
				//and calling children on Documents and DocumentFragments is rare so it's not a big deal.
				//Also not using NodeCollection#clean() because that function is sort of on probation.
				return ncFilter.call(this.childNodes, function(node) {
					return node.nodeType === 1;
				});
			}
		});
	});
}

//#endregion Browser Compatibility and Speed Boosters

})(self, document, Array, Object, decodeURIComponent, encodeURIComponent, getComputedStyle, parseFloat); //self === window
