/**
 * Firebolt tests loader
 */

// Hide passed tests by default
QUnit.config.hidepassed = true;

// Load the test modules
[
	'Array',
	'Firebolt',
	'NodeList',
	'Object',
	'String'
].forEach(function(module) {
	$.getScript('tests/' + module + '.js');
});
