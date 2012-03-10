/*global define*/
define([],function () {
	// This module creates an implementation ecma-5 Function.prototype.bind for browsers that don't have it 
	// (i.e. Safari).
	
	/**
	 * @param context Value to be used as the returned function's <code>this</code> value.
	 * @param [arg1, arg2, ...] Fixed argument values that will prepend any arguments passed to the returned function when it is invoked.
	 * @returns {Function} A function that always executes this function in the given <code>context</code>.
	 */
	function bind(context) {
			var fn = this,
			    fixed = Array.prototype.slice.call(arguments, 1);
			if (fixed.length) {
				return function() {
					return arguments.length ? fn.apply(context, fixed.concat(Array.prototype.slice.call(arguments)))
											: fn.apply(context, fixed);
				};
			}
			return function() {
				return arguments.length ? fn.apply(context, arguments) : fn.call(context);
			};
		}		
		
		
	if (!Function.prototype.bind) {
		Function.prototype.bind = bind;
	}

	//The bind function is only exported so that it can be tested. 
	//Outside of testing scenarios it should only be used indirectly
	//via Function.prototype.bind
	return {bind: bind};
});