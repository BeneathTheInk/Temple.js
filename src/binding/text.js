var _ = require("underscore"),
	util = require("../util"),
	Binding = require("./index");

module.exports = Binding.extend({
	constructor: function(value, data) {
		if (_.isString(value)) {
			var str = value;
			value = function() { return str; }
		}

		if (!_.isFunction(value))
			throw new Error("Expecting string or function for text binding value.");

		this.compute = value;
		this.value = "";
		this.node = document.createTextNode("");

		Binding.call(this, data);
		this.render();
	},

	appendChild: function() {
		throw new Error("Text bindings can't have children.");
	},

	render: function() {
		this.autorun("render", function(comp) {
			var val = this.compute();
			val = val != null ? val.toString() : "";
			this.node.nodeValue = this.value = val;
		});
	},

	appendTo: function(parent, before) {
		parent.insertBefore(this.node, before);
		return Binding.prototype.appendTo.apply(this, arguments);
	},

	find: function(selector) { return null; },
	findAll: function() { return []; },

	toString: function() {
		return this.value;
	},

	destroy: function() {
		var parent = this.node.parentNode;
		if (parent != null) parent.removeChild(this.node);

		return Binding.prototype.destroy.apply(this, arguments);
	}
});