﻿/*
 * FireBolt current core file.
 * @author Nathan Woltman
 */

(function() {

/*
 * Local variables that are compressed when this file is minified.
 */
var $window = window,
	document = $window.document,
	prototype = 'prototype',
	ArrayPrototype = Array[prototype],
	ElementPrototype = Element[prototype],
	HTMLElementPrototype = HTMLElement[prototype],
	NodePrototype = Node[prototype],
	NodeListPrototype = NodeList[prototype],
	StringPrototype = String[prototype];


//#region ======================= Global Selectors ===========================

/**
 * Returns the first element within the document that matches the specified CSS selector.<br />
 * Alias of `document.querySelector()`.
 * 
 * @global
 * @param {String} selector
 * @returns {?Element}
 */
$window.$1 = function(selector) {
	return document.querySelector(selector);
}

/**
 * Returns a list of the elements within the document with the specified class name.<br />
 * Alias of `document.getElementsByClassName()`.
 * 
 * @global
 * @param {String} className
 * @returns {HTMLCollection|NodeList} A list of elements with the specified class name.
 */
$window.$class = function(className) {
	return document.getElementsByClassName(className);
}

/**
 * Returns the first element within the document with the specified id.<br />
 * Alias of `document.getElementById()`.
 * 
 * @global
 * @param {String} id
 * @returns {Element} The element with the specified id.
 */
$window.$id = function(id) {
	return document.getElementById(id);
}

/**
 * Returns a list of the elements within the document with the specified name attribute.<br />
 * Alias of `document.getElementsByName()`.
 * 
 * @global
 * @param {String} name
 * @returns {HTMLCollection|NodeList} A collection of elements with the specified name attribute.
 */
$window.$name = function(name) {
	return document.getElementsByName(name);
}

/**
 * Returns a list of the elements within the document with the specified tag name.<br />
 * Alias of `document.getElementsByTagName()`.
 * 
 * @global
 * @param {String} tagName
 * @returns {HTMLCollection|NodeList} A collection of elements with the specified tag name.
 */
$window.$tag = function(tagName) {
	return document.getElementsByTagName(tagName);
}

//#endregion Global Selectors


//#region ============================ Array =================================

/**
 * The JavaScript Array object.
 * @namespace Array
 */

/**
 * Removes all `null`, `undefined`, and zero-length strings (unless the `allowEmptyStrings` parameter is set to a truthy value) from the array.
 * 
 * @function Array.prototype.clean
 * @param {Boolean} [allowEmptyStrings=false] - Set this to `true` to keep zero-length strings in the array.
 * @returns {Array} A reference to the array.
 * @see Firebolt#isEmpty
 */
ArrayPrototype.clean = function(allowEmptyStrings) {
	for (var i = 0; i < this.length; i++) {
		while (i < this.length && FireBolt.isEmpty(this[i], allowEmptyStrings)) {
			this.splice(i, 1);
		}
	}
	return this;
};

/**
 * Returns a duplicate of the array, leaving the original array intact.
 * 
 * @function Array.prototype.clone
 * @returns {Array} A copy of the array.
 */
ArrayPrototype.clone = function() {
	for (var len = this.length,
			 arr = new Array(len),
			 i = 0; i < len; i++) {
		arr[i] = this[i];
	}
	return arr;
};

/**
 * Determines if the input item is in the array.
 * 
 * @function Array.prototype.contains
 * @returns {Boolean} `true` if the item is in the array; else `false`.
 */
ArrayPrototype.contains = function(e) {
	return this.indexOf(e) != -1;
};

/**
 * Determines if the arrays are equal by doing a shallow comparison of their elements using strict equality.<br />
 * NOTE: The order of elements in the arrays DOES matter. The elements must be found in the same order for the arrays to be considered equal.
 * 
 * @function Array.prototype.equals
 * @param {Array} array - An array to compare the current array to.
 * @returns {Boolean} `true` if the arrays are equal; else `false`.
 */
ArrayPrototype.equals = function(array) {
	if (this === array) { //Easy check
		return true;
	}
	if (this.length != array.length) {
		return false;
	}
	for (var i = 0; i < array.length; i++) {
		if (this[i] !== array[i]) {
			return false;
		}
	}
	return true;
};

/**
 * Returns an array containing every item that is in both this array and the input array.
 * 
 * @function Array.prototype.intersect
 * @returns {Array} An array that is the intersection of this array and the input array.
 * @example
 * [1, 2, 3].intersect([2, 3, 4]);  // [2, 3]
 */
ArrayPrototype.intersect = function(b) {
	for (var intersection = [], i = 0; i < b.length; i++) {
		if (this.contains(b[i]) && !intersection.contains(b[i])) {
			intersection.push(b[i]);
		}
	}
	return intersection;
};

/**
 * Returns the last item of the array.
 * 
 * @function Array.prototype.last
 * @returns {*} The last item in the array, or undefined if the array is empty.
 */
ArrayPrototype.last = function() {
	return this[this.length - 1];
};

/**
 * Removes all occurrences of the passed in items from the array if they exist in the array.
 * 
 * @function Array.prototype.remove
 * @param {...*} items - Items to remove from the array.
 * @returns {Array} A reference to the array.
 */
ArrayPrototype.remove = function() {
	for (var i = 0, rindex; i < arguments.length; i++) {
		while ((rindex = this.indexOf(arguments[i])) >= 0) {
			this.splice(rindex, 1);
		}
	}
	return this;
};

/**
 * Returns an array containing every item that is only in one of this array or the input array.
 * 
 * @function Array.prototype.union
 * @returns {Array} An array that is the union of this array and the input array.
 * @example
 * [1, 2, 3].union([2, 3, 4]);  // returns [1, 2, 3, 4]
 */
ArrayPrototype.union = function(b) {
	for (var union = this.unique(), i = 0; i < b.length; i++) {
		if (!union.contains(b[i])) {
			union.push(b[i]);
		}
	}
	return union;
};

/**
 * Returns a duplicate-free clone of the array.
 * 
 * @function Array.prototype.unique
 * @returns {Array} An array of unique items.
 * @example
 * [1, 2, 3, 2, 1].unique();  // returns [1, 2, 3]
 */
ArrayPrototype.unique = function() {
	for (var uniqueClone = [], i = 0; i < this.length; i++) {
		if (!uniqueClone.contains(this[i])) {
			uniqueClone.push(this[i]);
		}
	}
	return uniqueClone;
};

/**
 * Returns a copy of the current array without any elements from the input parameters.
 * 
 * @function Array.prototype.without
 * @param {...*} items - One or more items to leave out of the returned array.
 * @returns {Array}
 * @example
 * [1, 2, 3, 4, 5, 6].without(3, 4, 6); // returns [1, 2, 5]
 */
ArrayPrototype.without = function() {
	var array = [],
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
};

// #endregion Array


//#region =========================== Document ===============================

/**
 * The HTML DOM Document interface.
 * @namespace Document
 */

/**
 * Specify a function to execute when the DOM is fully loaded.<br />
 * Executes the function immediately if the DOM has already finished loading.
 * 
 * @function Document.ready
 * @param {Function} callback - A function to execute once the DOM has been loaded.
 */
document.ready = function(callback) {
	if (document.readyState == 'loading') {
		document.addEventListener("DOMContentLoaded", callback);
	}
	else {
		callback();
	}
};

// #endregion Document


//#region =========================== Element ================================

/**
 * The HTML DOM Element interface.
 * @namespace Element
 */

/**
 * Returns a list of the elements within the element that match the specifed CSS selector.<br />
 * Alias of `Element.querySelectorAll()`.
 * 
 * @function Element.prototype.$
 * @param {String} selector
 * @returns {NodeList} A list of selected elements.
 */
ElementPrototype.$ = function(selector) {
	return this.querySelectorAll(selector);
};

/**
 * Returns the first element within the element that matches the specified CSS selector.<br />
 * Alias of `Element.querySelector()`.
 * 
 * @function Element.prototype.$1
 * @param {String} selector
 * @returns {?Element}
 */
ElementPrototype.$1 = function(selector) {
	return this.querySelector(selector);
};

/**
 * Returns a list of the elements within the element with the specified class name.<br />
 * Alias of `Element.getElementsByClassName()`.
 * 
 * @function Element.prototype.$class
 * @param {String} className
 * @returns {HTMLCollection|NodeList} A collection of elements with the specified class name.
 */
ElementPrototype.$class = function(className) {
	return this.getElementsByClassName(className);
};

/**
 * Returns a list of the elements within the element with the specified tag name.<br />
 * Alias of `Element.getElementsByTagName()`.
 * 
 * @function Element.prototype.$tag
 * @param {String} tagName
 * @returns {HTMLCollection|NodeList} A collection of elements with the specified tag name.
 */
ElementPrototype.$tag = function(tagName) {
	return this.getElementsByTagName(tagName);
};

/**
 * Adds the specified class to the element if the element doesn't already have it.
 * 
 * @function Element.prototype.addClass
 * @param {String} className - The class to be added to the element.
 */
ElementPrototype.addClass = function(className) {
	if (!this.className) {
		this.className = className;
	}
	else if (!_isOldIE) {
		this.classList.add(className);
	}
	else if (!this.hasClass(className)) {
		this.className += ' ' + className;
	}

	return this;
};

/**
 * Gets the value of the element's specified attribute.
 * 
 * @function Element.prototype.attr
 * @param {String|Object} attribute - The name of the attribute who's value you want to get.
 * @returns {String} The value of the attribute being retrieved.
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
 * @param {Object.<String, String>} attributes - The name of the attribute who's value should be set or an object of attribute-value pairs to set.
 */
ElementPrototype.attr = function(attr, value) {
	if (typeof value == 'undefined') {
		if (typeof attr == 'string') {
			return this.getAttribute(attr);
		}
		for (var attribute in attr) {
			this.setAttribute(attribute, attr[attribute]);
		}
	}
	else {
		this.setAttribute(attr, value);
	}

	return this;
};

/**
 * Removes all of the element's child nodes.
 * 
 * @function Element.prototype.empty
 */
ElementPrototype.empty = function() {
	return this.html('');
};

/**
 * Determines if the element's class list has the specified class name.
 * 
 * @function Element.prototype.hasClass
 * @param {String} className - A string containing a single class name.
 * @returns {Boolean} `true` if the class name is in the element's class list; else `false`.
 */
ElementPrototype.hasClass = function(className) {
	if (!_isOldIE) return this.classList.contains(className);
	return new RegExp('(?:\\s|^)' + className + '(?:\\s|$)').test(this.className);
};

/**
 * Gets the element's inner HTML.
 * 
 * @function Element.prototype.html
 * @returns {String} The element's inner HTML.
 */
/**
 * Set the element's inner HTML.
 * 
 * @function Element.prototype.html
 * @param {String} innerHTML - A string of HTML to set as the content of the element.
 */
ElementPrototype.html = function(innerHTML) {
	if (typeof innerHTML == 'undefined') {
		return this.innerHTML; //Get
	}
	this.innerHTML = innerHTML; //Set

	return this;
};

/**
 * Determines if the element matches the specified CSS selector.
 * 
 * @function Element.prototype.matches
 * @param {String} selector - A CSS selector string.
 * @returns {Boolean} `true` if the element matches the selector; else `false`.
 */
ElementPrototype.matches = ElementPrototype.matches || ElementPrototype.webkitMatchesSelector || ElementPrototype.mozMatchesSelector || ElementPrototype.msMatchesSelector;

/**
 * Gets or set the element's inner HTML.
 * 
 * @function Element.prototype.prepend
 * @param {...(String|Node|Array.<Node>)} content - One or more DOM elements, arrays of elements, or HTML strings to insert at the beginning of this element.
 */
ElementPrototype.prepend = function() {
	for (var items = arguments, i = 0; i < items.length; i++) {
		
	}

	return this;
};

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
 * @param {Object.<String, *>} properties - An object of property-value pairs to set.
 */
ElementPrototype.prop = function(prop, value) {
	if (typeof value == 'undefined') {
		if (typeof prop == 'string') {
			return this[prop]; //Get
		}
		for (var property in prop) {
			this[property] = prop[property]; //Set multiple
		}
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
 * Removes the input class from the element if the element currently has it.
 * 
 * @function Element.prototype.removeClass
 * @param {String} className - The class to be removed from the element.
 */
ElementPrototype.removeClass = function(className) {
	if (_isChrome || _isOldIE) {
		var changed = false,
			classes = this.className.split(/\s+/),
			newClassName = '',
			i = 0;
		for (; i < classes.length; i++) {
			if (!classes[i]) continue;
			if (classes[i] != className) {
				if (newClassName) newClassName += ' ';
				newClassName += classes[i];
			}
			else {
				changed = true;
			}
		}
		if (changed) {
			this.className = newClassName;
		}
	}
	else {
		this.classList.remove(className);
	}

	return this;
};

/**
 * Removes the specified property from the element.
 * 
 * @function Element.prototype.removeProp
 * @param {String} property - The name of the property to remove.
 */
ElementPrototype.removeProp = function(property) {
	this[property] = null;

	return this;
};

/**
 * Toggles the specified class for the element.
 * 
 * @function Element.prototype.toggleClass
 * @param {String} className - The class to be toggled.
 */
ElementPrototype.toggleClass = function(className) {
	if (this.className) {
		if (this.hasClass(className)) {
			var classes = this.className.split(rgxWhitespace),
				newClassName = '',
				i = 0;
			for (; i < classes.length; i++) {
				if (classes[i] && classes[i] != className) {
					if (newClassName) newClassName += ' ';
					newClassName += classes[i];
				}
			}
			this.className = newClassName;
		}
		else {
			this.className += ' ' + className;
		}
	}
	else {
		this.className = className;
	}

	return this;
};

// #endregion Element


//#region =========================== FireBolt ===============================

/**
 * The FireBolt namespace.
 * @namespace FireBolt
 */

/**
 * Returns a list of the elements either found in the DOM that match the passed in CSS selector or created by passing an HTML string.<br />
 * When passed a CSS selector string, acts as an alias of `document.querySelectorAll()`.<br />
 * Also represents the global FireBolt singleton object and can be referenced by the synonyms FB and $ (on pages without jQuery).
 * 
 * @function
 * @param {String} str - A CSS selector string or an HTML string.
 * @returns {NodeList} A non-live list of selected or created elements.
 * @memberOf FireBolt
 * @example
 * $('button.btn-success') // Returns all button elements with the class "btn-success"
 * $('str <p>content</p>') // Creates a set of nodes and returns it as a NodeList (in this case ["str ", <p>content</p>])
 * $('1<br>2<br>3 >');     // Returns ["1", <br>​, "2", <br>​, "3 >"]
 * $.create('div')         // Calls FireBolt's `create()` method to create a new div element 
 */
function FireBolt(str) {
	if (rgxHtml.test(str)) {
		return FireBolt.create('div').html(str).childNodes;
	}
	//else
	return document.querySelectorAll(str);
}

/**
 * Creates a new element with the specified tag name and attributes (optional).<br />
 * Partially an alias of `document.createElement()`.
 * 
 * @param {String} tagName
 * @param {Object} [attributes] - The JSON-formatted attributes that the element should have once constructed.
 * @returns {Element}
 * @memberOf FireBolt
 */
FireBolt.create = function(tagName, attributes) {
	var el = document.createElement(tagName);
	if (attributes) {
		el.attr(attributes);
	}
	return el;
};

/**
 * Calls the passed in function after the specified amount of time in milliseconds.
 * 
 * @param {Function} callback - A function to be called after the specified amount of time.
 * @param {Number} ms - An integer between 0 and +∞ : [ 0, +∞).
 * @returns {Object} An object that can be used to cancel the callback before it is executed by calling `object.clear()`.
 * @memberOf FireBolt
 */
FireBolt.delay = function(callback, ms) {
	return new function() {
		var clearRef = setTimeout(callback, ms);
		this.clear = function() {
			clearTimeout(clearRef);
		};
	};
};

/**
 * Determines if the passed in value is considered empty. The value is considered empty if it is one of the following:
 * <ul>
 * <li>`null`</li>
 * <li>`undefined`</li>
 * <li>a zero-length array</li>
 * <li>an empty string (unless the `allowEmptyString` parameter is set to `true`)</li>
 * </ul>
 * 
 * @param {*} value - The value to be tested.
 * @param {Boolean} [allowEmptyString=false] - Set this to true to deem zero-length strings as not empty.
 * @returns {Boolean}
 * @memberOf FireBolt
 */
FireBolt.isEmpty = function(value, allowEmptyString) {
	return value == null || typeof value == 'object' && value.length == 0 || typeof value == 'string' && !allowEmptyString && !value;
};

/**
 * Determines if the user is on a touchscreen device.
 * 
 * @returns {Boolean} `true` if the user is on a touchscreen device; else `false`.
 * @memberOf FireBolt
 */
FireBolt.isTouchDevice = function() {
	return 'ontouchstart' in $window || 'onmsgesturechange' in $window;
};

/**
 * Same as {@link Document.ready|document.ready()}
 * 
 * @function
 * @see Document.ready
 * @memberOf FireBolt
 */
FireBolt.ready = document.ready;

/**
 * Converts an array of nodes to a non-live NodeList containing only DOM Elements.
 * 
 * @param {Array.<Node>|NodeList} elements - An array containing nodes that are in the current documentElement (this will not work if the nodes are not in the current documentElement).
 * @returns {NodeList} The original array of elements converted to a NodeList containing only nodes of the original list that are of node type 1 (Element).
 * @memberOf FireBolt
 */
FireBolt.toDeadNodeList = function(elements) {
	NodeListPrototype.attr.call(elements, NodeListIdentifier, '');
	return this('[' + NodeListIdentifier + ']').removeAttr(NodeListIdentifier);
};

//#endregion FireBolt


//#region =========================== Function ===============================

/**
 * The JavaScript Function interface.
 * @namespace Function
 */

/**
 * Delays a function call for the specified number of milliseconds.
 * 
 * @function Function.prototype.delay
 * @param {Number} ms - The number of milliseconds to wait before calling the functions.
 * @returns {Object} An object that can be used to cancel the callback before it is executed by calling `object.clear()`.
 */
Function[prototype].delay = function(ms) {
	var that = this;
	return new function() {
		var clearRef = setTimeout(that, ms);
		this.clear = function() {
			clearTimeout(clearRef);
		};
	};
};

// #endregion Function


//#region ========================== HTMLElement =============================

/**
 * The HTML DOM HTMLElement interface.
 * @namespace HTMLElement
 */

/**
 * Gets the element's computed style object.
 * 
 * @function HTMLElement.prototype.css
 * @returns {Object.<String, String>} The element's computed style object.
 */
/**
 * Gets the value of element's specified style property.
 * 
 * @function HTMLElement.prototype.css
 * @param {String} propertyName - The name of the style property who's value you want to retrieve.
 * @returns {String} The value of the specifed style property.
 */
/**
 * Sets the element's specified style property.
 * 
 * @function HTMLElement.prototype.css
 * @param {String} propertyName - The name of the style property to set.
 * @param {String|Number} value - A value to set for the specified property.
 */
/**
 * Sets CSS style properties.
 * 
 * @function HTMLElement.prototype.css
 * @param {Object.<String, String|Number>} properties - An object of CSS property-values.
 */
/**
 * Explicitly sets the element's CSS style, removing or replacing any current inline style properties.
 * 
 * @function HTMLElement.prototype.css
 * @param {String} CSS - A CSS style string.
 */
HTMLElementPrototype.css = function(prop, value) {
	if (typeof prop == 'string') {
		if (typeof value == 'undefined') {
			if (!/:/.test(prop)) {
				//Get the specified property
				return getComputedStyle(this)[prop];
			}
			//Else set the element's css text
			this.style.cssText = prop;
		}
		else {
			//Set the specified property
			this.style[prop] = value;
		}
	}
	else if (typeof prop == 'object') {
		//Set all specifed properties
		for (var propName in prop) {
			this.style[propName] = prop[propName];
		}
	}
	else {
		return getComputedStyle(this);
	}

	return this;
};

/**
 * Hides the element by setting its display style to 'none'.
 * 
 * @function HTMLElement.prototype.hide
 */
HTMLElementPrototype.hide = function() {
	//if (getComputedStyle(this).display !== "none") {
		this.style.display = 'none';
	//}

	return this;
};

/**
 * Gets the element's current coordinates relative to the document.
 * 
 * @function HTMLElement.prototype.offset
 * @returns {{top: Number, left: Number}} An object containing the coordinates detailing the element's distance from the top and left of the screen.
 * @example
 * // HTML
 * <body style="margin: 0">
 *   <div id='a' style="position: absolute; margin: 10px; left: 10px"></div>
 * </body>
 * 
 * // JavaScript
 * var offset = $id('a').offset();
 * alert( offset.top + ', ' + offset.left );  //  10, 20
 */
HTMLElementPrototype.offset = function() {
	var el = this,
		offset = {
			top: 0,
			left: 0
		};
	do {
		offset.top += el.offsetTop + el.clientTop;
		offset.left += el.offsetLeft + el.clientLeft;
	} while (el = el.offsetParent)
	return offset;
};

/**
 * Shows an element by giving it a certain display style. If no parameter is passed in,
 * FireBolt determines the element's default display style and sets it to that (NOTE:
 * the element's default display style may be 'none' and hence the element would not be shown).
 * 
 * @function HTMLElement.prototype.show
 * @param {Number|String} [style] - The style of display the element should be shown with. Possibilities are:
 * <ul>
 * <li>0 => 'block'</li>
 * <li>1 => 'inline-block'</li>
 * <li>2 => 'inline'</li>
 * </ul>
 * For other display types, only the string parameter will be accepted.<br />
 * If the arguement is left blank, the element's default style will be used.
 */
HTMLElementPrototype.show = function(style) {
	if (typeof style == 'number') {
		switch (style) {
			case 0:
				style = 'block';
				break;
			case 1:
				style = 'inline-block';
				break;
			case 2:
				style = 'inline';
		}
	}
	if (typeof style !== 'string') {
		//Create a temporary element of the same type as this element to figure out what the default display value should be
		var temp = FireBolt.create(this.tagName, { style: 'width:0;height:0;border:0;margin:0;padding:0' }).insertAfter(document.body.lastChild);
		style = temp.css('display');
		temp.remove();
	}
	this.style.display = style;

	return this;
};

// #endregion HTMLElement


//#region ============================= Node =================================

/**
 * The HTML DOM Node interface.
 * @namespace Node
 */

/**
 * Inserts the specified node directly after this node.
 * 
 * @function Node.prototype.after
 * @param {Node|String|?} node - The node to insert. If the input parameter is not a Node, it is converted to a TextNode before being inserted.
 * @returns {Node} The node being inserted.
 */
NodePrototype.after = function(node) {
	if (!node.nodeType) {
		node = document.createTextNode(node);
	}
	this.parentNode.insertBefore(node, this.nextSibling);

	return node;
};

/**
 * Inserts the specified node directly before this node.
 * 
 * @function Node.prototype.before
 * @param {Node|String|?} node - The node to insert. If the input parameter is not a Node, it is converted to a TextNode before being inserted.
 * @returns {Node} The inserted node.
 */
NodePrototype.before = function(node) {
	if (!node.nodeType) {
		node = document.createTextNode(node);
	}
	this.parentNode.insertBefore(node, this);

	return node;
};


/**
 * Inserts this node directly after the specified node.
 * 
 * @function Node.prototype.insertAfter
 * @param {Node} node - The node after which this node should be inserted.
 * @returns {Node} This node.
 */
NodePrototype.insertAfter = function(node) {
	node.parentNode.insertBefore(this, node.nextSibling);

	return this;
};

/**
 * Removes this node from the DOM.
 * 
 * @function Node.prototype.remove
 */
NodePrototype.remove = function() {
	this.parentNode.removeChild(this);
};

/**
 * Gets this node's text content (specifically uses the native JavaScript property `Node.textContent`).
 * 
 * @function Node.prototype.text
 * @returns {String} The node's text content.
 */
/**
 * Sets this node's text content (specifically uses the native JavaScript property `Node.textContent`).
 * 
 * @function Node.prototype.text
 * @param {String|*} text - The text or content that will be converted to a string to be set as the node's text content.
 */
NodePrototype.text = function(text) {
	if (typeof text == 'undefined') {
		return this.textContent;
	}
	//else
	this.textContent = text;

	return this;
};

// #endregion Node


//#region =========================== NodeList ===============================

/**
 * The HTML DOM NodeList interface.<br />
 * It should be noted that elements in a NodeList are always unique in the order they are found in the document.
 * Furthermore, NodeLists cannot have their elements removed or have elements added them. To do these types of
 * things, you must first convert the NodeList to an Array (see {@linkcode NodeList#toArray|NodeList.toArray()});
 * @namespace NodeList
 */

/* Give NodeLists the same prototype functions as Arrays */
Object.getOwnPropertyNames(ArrayPrototype).forEach(function(methodName) {
	if (!NodeListPrototype[methodName]) {
		switch (methodName) {
			case 'contains':
			case 'equals':
			case 'forEach':
			case 'indexOf':
			case 'lastIndexOf':
			case 'last':
			case 'reduce':
			case 'reduceRight':
			case 'some':
				NodeListPrototype[methodName] = ArrayPrototype[methodName];
				break;
			//For these methods, the result must be converted back to a NodeList
			case 'clone':
			case 'concat':
			case 'intersect':
			case 'slice':
			case 'union':
			case 'without':
				NodeListPrototype[methodName] = function() {
					return FireBolt.toDeadNodeList(ArrayPrototype[methodName].apply(this, arguments));
				}	
		}
	}
});

/** 
 * Calls the function with the passed in name on each element in an enumerable.
 * 
 * @param {String} funcName - The name of a function.
 * @returns {Array|NodeList|HTMLCollection} A reference to the enumerable
 * @this An enumerable such as an Array, NodeList, or HTMLCollection.
 */
function callOnEachElement(funcName) {
	return function() {
		for (var i = 0; i < this.length; i++) {
			if (this[i].nodeType == 1) this[i][funcName].apply(this[i], arguments);
		}
		return this;
	};
}

/** 
 * Returns a function that calls the function with the passed in name on each element in an enumerable
 * unless the number of arguments passed to the function is less than the specified number or the first
 * argument passed in is an object, in which case the result of calling the function of the first element
 * is returned.
 * 
 * @param {String} funcName - The name of a function.
 * @param {Number} numArgs - The number of arguments that will be given to the function for setting. Anything less is for getting.
 * @returns {Array|NodeList|HTMLCollection} A reference to the enumerable.
 * @this An enumerable such as an Array, NodeList, or HTMLCollection.
 */
function getFirstSetEachElement(funcName, numArgs) {
	return function() {
		var items = this,
			i = 0;
		if (arguments.length < numArgs && typeof arguments[0] != 'object') {
			for (; i < items.length; i++) {
				if (items[i].nodeType == 1) return items[i][funcName](arguments[0]);
			}
			return null;
		}
		for (; i < items.length; i++) {
			if (items[i].nodeType == 1) items[i][funcName].apply(items[i], arguments);
		}
		return items;
	};
}

/**
 * Adds the element, list of elements, or queried elements to a copy of the existing list and returns the result.
 * 
 * @function NodeList.prototype.add
 * @param {Element|NodeList|HTMLCollection|String} e
 * @returns {NodeList} The result of adding the new item(s) to the current list.
 */
NodeListPrototype.add = function(e) {
	if (typeof e == 'string') {
		e = $(e);
	}
	else if (!e.length) {
		e = [e];
	}
	return this.concat(e);
};

/**
 * Adds the input class name to all elements in the collection.
 * 
 * @function NodeList.prototype.addClass
 * @param {String} className - The class to be added to each element in the collection.
 */
NodeListPrototype.addClass = callOnEachElement('addClass');

/**
 * Gets the value of the specified attribute of the first element in the list.
 * 
 * @function NodeList.prototype.attr
 * @param {String} attribute - The name of the attribute who's value you want to get.
 * @returns {String} The value of the attribute being retrieved.
 */
/**
 * Sets the specified attribute for each element in the list.
 * 
 * @function NodeList.prototype.attr
 * @param {String} attribute - The name of the attribute who's value should be set.
 * @param {String} value - The value to set the specified attribute to.
 */
/**
 * Sets attributes for each element in the list.
 * 
 * @function NodeList.prototype.attr
 * @param {Object.<String, String>} attributes - The name of the attribute who's value should be set or an object of attribute-value pairs to set.
 */
NodeListPrototype.attr = getFirstSetEachElement('attr', 2);

/**
 * Clicks each element in the list.
 * 
 * @function NodeList.prototype.click
 */
NodeListPrototype.click = callOnEachElement('click');

/**
 * Gets the computed style object of the first element in the list.
 * 
 * @function NodeList.prototype.css
 * @returns {Object.<String, String>} The element's computed style object.
 */
/**
 * Gets the value of the specified style property of the first element in the list.
 * 
 * @function NodeList.prototype.css
 * @param {String} propertyName - The name of the style property who's value you want to retrieve.
 * @returns {String} The value of the specifed style property.
 */
/**
 * Sets the specified style property for each element in the list.
 * 
 * @function NodeList.prototype.css
 * @param {String} propertyName - The name of the style property to set.
 * @param {String|Number} value - A value to set for the specified property.
 */
/**
 * Sets CSS style properties for each element in the list.
 * 
 * @function NodeList.prototype.css
 * @param {Object.<String, String|Number>} properties - An object of CSS property-values.
 */
/**
 * Explicitly sets each elements' CSS style, removing or replacing any current inline style properties.
 * 
 * @function NodeList.prototype.css
 * @param {String} CSS - A CSS style string.
 */
NodeListPrototype.css = getFirstSetEachElement('css', 2);

/**
 * Removes all child nodes from each element in the list.
 * 
 * @function NodeList.prototype.empty
 */
NodeListPrototype.empty = callOnEachElement('empty');

/**
 * Reduce the set of matched elements to those that match the selector or pass the function's test.
 * 
 * @function NodeList.prototype.filter
 * @param {String|Function} selector - CSS selector string or function that returns a truthy value if the element should not be filtered out.
 * @returns {NodeList} 
 */
NodeListPrototype.filter = function(selector) {
	var filtration = [],
		i = 0;
	if (typeof selector == 'string') {
		for (; i < this.length; i++) {
			if (this[i].nodeType == 1 && this[i].matches(selector)) {
				filtration.push(this[i]);
			}
		}
	}
	else {
		var nodes = FireBolt.toDeadNodeList(this);
		for (; i < nodes.length; i++) {
			if (selector(i)) {
				filtration.push(nodes[i]);
			}
		}
	}

	return FireBolt.toDeadNodeList(filtration);
};

/**
 * Hides each element in the collection.
 * 
 * @function NodeList.prototype.hide
 * @see HTMLElement#hide
 */
NodeListPrototype.hide = callOnEachElement('hide');

/**
 * Gets the inner HTML of the first element in the list.
 * 
 * @function NodeList.prototype.html
 * @returns {String} The element's inner HTML.
 */
/**
 * Set the element's inner HTML.
 * 
 * @function Element.prototype.html
 * @param {String} innerHTML - A string of HTML to set as the content of the element.
 */
NodeListPrototype.html = getFirstSetEachElement('html', 1);

/**
 * Converts a NodeList to a non-live NodeList.
 * 
 * @function NodeList.prototype.kill
 * @returns {NodeList} A non-live NodeList containing only nodes of the original list that are of node type 1 ({@linkcode http://dom.spec.whatwg.org/#node|ELEMENT_NODE}).
 */
NodeListPrototype.kill = function() {
	this.attr(NodeListIdentifier, '');
	return FireBolt('[' + NodeListIdentifier + ']').removeAttr(NodeListIdentifier);
};

/**
 * Gets the value of the specified property of the first element in the list.
 * 
 * @function NodeList.prototype.prop
 * @param {String} property - The name of the property who's value you want to get.
 * @returns {?} The value of the property being retrieved.
 */
/**
 * Sets the specified property for each element in the list.
 * 
 * @function NodeList.prototype.prop
 * @param {String} property - The name of the property to be set.
 * @param {*} value - The value to set the property to.
 */
/**
 * Sets the specified properties of each element in the list.
 * 
 * @function NodeList.prototype.prop
 * @param {Object.<String, *>} properties - An object of property-value pairs to set.
 */
NodeListPrototype.prop = getFirstSetEachElement('prop', 2);

/**
 * Removes all nodes in the collection from the DOM tree.
 * 
 * @function NodeList.prototype.remove
 */
NodeListPrototype.remove = function() {
	var origLen = this.length;
	if (origLen == 0) return;
	this[0].remove();
	if (this.length == origLen) { //Non-live
		for (var i = 1; i < origLen; i++) {
			this[i].remove();
		}
	}
	else { //Live
		while (this.length) {
			this[0].remove();
		}
	}
};

/**
 * Removes the specified attribute from each element in the list.
 * 
 * @function NodeList.prototype.removeAttr
 * @param {String} attribute - The name of the attribute to be removed.
 */
NodeListPrototype.removeAttr = callOnEachElement('removeAttr');

/**
 * Removes the input class name from all elements in the list.
 * 
 * <h5><strong>Warning:</strong></h5>
 * 
 * Due to the fact that NodeLists returned by the {@linkcode $class|$class()} function
 * are live, the following code will produce undesirable behaviour:
 * 
 * <pre class="prettyprint">$class('someClass').removeClass('someClass');</pre>
 * 
 * To avoid problems caused by this, use a non-live NodeList such as in the following alternative methods:
 * 
 * <pre class="prettyprint">
 * $('.someClass').removeClass('someClass');
 * $class('someClass').kill().removeClass('someClass');
 * </pre>
 * 
 * @function NodeList.prototype.removeClass
 * @param {String} className - The class to be removed from each element in the collection.
 */
NodeListPrototype.removeClass = callOnEachElement('removeClass');

/**
 * Removes the specified property from each element in the list.
 * 
 * @function NodeList.prototype.removeProp
 * @param {String} property - The name of the property to remove.
 */
NodeListPrototype.removeProp = callOnEachElement('removeProp');

/**
 * Shows each element in the set. For specifics, see {@link HTMLElement#show}.
 * 
 * @function NodeList.prototype.show
 * @param {Number|String} [style] - The style of display the element should be shown with.
 * @see HTMLElement.show
 */
NodeListPrototype.show = callOnEachElement('show');

/**
 * Gets the text content of the first node in the list.
 * 
 * @function NodeList.prototype.text
 * @returns {String} The node's text content.
 */
/**
 * Sets text content of each node in the list.
 * 
 * @function NodeList.prototype.text
 * @param {String|*} text - The text or content that will be converted to a string to be set as each nodes' text content.
 */
NodeListPrototype.text = function(text) {
	var i = 0;
	if (typeof text == 'undefined') {
		for (text = ''; i < this.length; i++) {
			text += this[i].textContent;
		}
		return text;
	}
	//else
	for (; i < this.length; i++) {
		this[i].textContent = text;
	}

	return this;
};

/**
 * Converts the current NodeList to an Array.
 * 
 * @function NodeList.prototype.toArray
 * @returns {Array.<Node>} An Array containing the same elements as the NodeList;
 */
NodeListPrototype.toArray = function() {
	return ArrayPrototype.clone.call(this);
};

/**
 * Toggles the input class name for all elements in the list.
 * 
 * @function NodeList.prototype.toggleClass
 * @param {String} className - The class to be toggled for each element in the collection.
 */
NodeListPrototype.toggleClass = callOnEachElement('toggleClass');

// #endregion NodeList


/**
 * The DOM HTMLCollection interface.<br />
 * Has all the same functions as {@link NodeList}.
 * @namespace HTMLCollection
 * @see NodeList
 */

/* Give HTMLCollections the same prototype functions as NodeLists (if they don't already have them) */
Object.getOwnPropertyNames(NodeListPrototype).forEach(function(methodName) {
	if (methodName != 'length' && !HTMLCollection[prototype][methodName]) {
		HTMLCollection[prototype][methodName] = NodeListPrototype[methodName];
	}
});


//#region ============================ Number ================================

/**
 * The JavaScript Number object.
 * @namespace Number
 */

/**
 * Returns a string representation of the number padded with leading 0s so that the string's length is at least equal to length. Takes an optional radix argument which specifies the base to use for conversion.
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
 * The JavaScript String object.
 * @namespace String
 */

if (!"".contains) {
	/**
	 * Determines whether the passed in string is in the current string.
	 *
	 * @function String.prototype.contains
	 * @param {String} searchString - The string to be searched for.
	 * @param {Number} [position=0] - The position in this string at which to begin the search; defaults to 0.
	 * @returns {Boolean} `true` if this string contains the search string; else `false`.
	 * @example
	 * var str = "Winter is coming.";
	 * alert( str.contains(" is ") );    // true
	 * alert( str.contains("summer") );  // false
	 */
	StringPrototype.contains = function(searchString, position) {
		return this.indexOf(searchString, position) >= 0;
	};
}

if (!"".endsWith) {
	/**
	 * Determines whether a string ends with the characters of another string.
	 *
	 * @function String.prototype.endsWith
	 * @param {String} searchString - The characters to be searched for at the end of this string.
	 * @returns {Boolean} `true` if this string ends with the search string; else `false`.
	 * @example
	 * var str = "Who am I, Gamling?";
	 * alert( str.endsWith("Gamling?") );  // true
	 * alert( str.endsWith("am I") );      // false
	 */
	StringPrototype.endsWith = function(searchString) {
		return this.indexOf(searchString, this.length - searchString.length) >= 0;
	};
}

if (!"".repeat) {
	/**
	 * Copies the current string a given number of times and returns the new string.
	 *
	 * @function String.prototype.repeat
	 * @param {Number} count - An integer between 0 and +∞ : [ 0, +∞).
	 * @returns {String}
	 * @example
	 * "abc".repeat(0)  // ""
	 * "abc".repeat(1)  // "abc"
	 * "abc".repeat(2)  // "abcabc"
	 * "0".repeat(5)    // "00000" 
	 */
	StringPrototype.repeat = function(count) {
		var str = this,
			i = 1;
		for (; i < count; i++) {
			str += this;
		}
		return str;
	};
}

if (!"".startsWith) {
	/**
	 * Determines whether a string starts with the characters of another string.
	 *
	 * @function String.prototype.startsWith
	 * @param {String} searchString - The characters to be searched for at the start of this string.
	 * @returns {Boolean} `true` if this string starts with the search string; else `false`.
	 * @example
	 * var str = "Who am I, Gamling?";
	 * alert( str.endsWith("Who") );   // true
	 * alert( str.endsWith("am I") );  // false
	 */
	StringPrototype.startsWith = function(searchString) {
		return this.lastIndexOf(searchString, 0) == 0;
	};
}

/**
 * Returns the string split into an array of substrings (tokens) that were separated by white-space.
 *
 * @function String.prototype.tokenize
 * @returns {String[]} An array of tokens.
 * @example
 * var str = "The boy who lived.";
 * str.tokenize();  // returns ["The", "boy", "who", "lived."]
 */
StringPrototype.tokenize = function() {
	return this.match(rgxNonWhitespace) || [];
};

//#endregion String


/*
 * Private variables for improving function performance and compatibility with IE 9
 */
var
	/* Private Constants */
	_isChrome = !!$window.chrome && !($window.opera || navigator.userAgent.indexOf(' OPR/') >= 0),
	_isOldIE = FireBolt.create('div').html('<!--[if lte IE9]><i></i><![endif]-->').$tag('i').length > 0,
	NodeListIdentifier = '_fbnlid_',
	
	/* Pre-built RegExps */
	rgxHtml = /^[^[]*?</,
	rgxNonWhitespace = /\S+/g,
	rgxWhitespace = /\s+/;


// Global FireBolt reference objects
$window.FB = $window.FireBolt = FireBolt;
if (!$window.jQuery) {
	$window.$ = FireBolt;
}

/**
 * The JavaScript Window object. Alias of `window`.
 * 
 * @global
 * @constant
 * @example window === $wnd  // true
 */
$window.$wnd = $window;

/**
 * The HTML document. Alias of `window.document`.
 * 
 * @global
 * @constant
 * @example window.document === $doc  // true
 */
$window.$doc = document;

})();

//#region ============================ Timer =================================

/**
 * @class
 * @example
 * // HTML
 * <div id="display">0</div>
 * 
 * // JavaScript
 * var seconds = 0,
 *     counter = new Timer(function() {
 *         seconds++;
 *         $id('display').text(seconds);
 *     }, 1000).start();
 */
function Timer(callback, interval, onstart, onstop) {
	// Private
	var _clearRef,
		_isRunning = false,
		_this = this;

	// Public
	_this.callback = callback;

	_this.interval = interval;

	_this.onstart = onstart;

	_this.onstop = onstop;

	_this.isRunning = function() {
		return _isRunning;
	};

	_this.start = function() {
		if (!_isRunning) {
			_clearRef = setInterval(function() {
				_this.callback();
			}, interval);
			_isRunning = true;
			if (_this.onstart) {
				_this.onstart();
			}
		}
		return _this;
	};

	_this.stop = function() {
		if (_isRunning) {
			clearInterval(_clearRef);
			_isRunning = false;
			if (_this.onstop) {
				_this.onstop();
			}
		}
		return _this;
	};
}

//#endregion Timer