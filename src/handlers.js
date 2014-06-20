var Temple = require("./temple"),
	_ = require("underscore"),
	util = require("./util");

var defaultHandler = {
	match			: function(target)				{ return false; },
	construct		: function(target)				{ },
	isLeaf			: function(target)				{ return true; },
	get				: function(target, path)		{ },
	set				: function(target, path, val)	{ return false; },
	keys			: function(target)				{ return []; },
	deleteProperty	: function(target, path)		{ return false; },
	merge			: function(target, mixin)		{ return false; },
	destroy			: function(target)				{ }
};

var objectHandler = _.defaults({
	match: function(target) {
		return util.isPlainObject(target);
	},
	isLeaf: function(target) {
		return false;
	},
	get: function(target, path) {
		return target[path];
	},
	set: function(target, path, val) {
		target[path] = val;
		return true;
	},
	keys: function(target) {
		return Object.keys(target);
	},
	merge: function(target, mixin) {
		if (!util.isPlainObject(mixin)) return false;
		_.each(mixin, function(v, k) { this.set(k, v); }, this);
		return true;
	},
	deleteProperty: function(target, path) {
		delete target[path];
	}
}, defaultHandler);

var arrayHandler = _.defaults({
	match: function(val) {
		return Array.isArray(val);
	},

	construct: function(arr) {
		util.patchArray(arr);
		this.set("length", arr.length);
		
		arr.observe(this._arrayObserver = (function(index, nval, oval) {
			this.set(index.toString(), nval, { remove: nval === void 0 });
			// this.notify(index.toString(), oval, { remove: nval === void 0 });
			this.set("length", arr.length);
		}).bind(this));
	},

	set: function(arr, path, val) {
		// sets on length *should* be ok but we need to notify
		// of any new or removed values. for now, ignored
		if (path === "length") return false;
		arr[path] = val;
		return true;
	},

	deleteProperty: function(arr, path) {
		var index = parseInt(path, 10);
		delete arr[path];
		
		// make the array smaller if we are deleting the last element
		if (!isNaN(index) && index >= 0 && index === arr.length - 1) {
			arr.length = arr.length - 1;
		}

		return true;
	},

	// arrays don't merge with any value
	merge: function() { return false; },

	destroy: function(arr) {
		arr.stopObserving(this._arrayObserver);
	}
}, objectHandler);

module.exports = [ arrayHandler, objectHandler ];
module.exports.default = defaultHandler;