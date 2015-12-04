// import * as _ from "underscore";
import Trackr from "trackr";
// import Context from "./context";
import { patch } from "../idom";
// import { load as loadPlugin } from "./plugins";
// import assignProps from "assign-props";
// import * as Events from "backbone-events-standalone";
// import subclass from "backbone-extend-standalone";
import * as _ from "lodash";
import {EventEmitter} from "events";
import {Map as ReactiveMap, Variable as ReactiveVar} from "trackr-objects";
import assignProps from "assign-props";
import {emptyNode} from "../utils";
// import {getValue} from "./proxies";

export default function View(data, parent, options) {
	EventEmitter.call(this);
	options = options || {};
	let defaults = _.result(this, "defaults");

	// internal view state
	this.s = {
		// parent view for scope
		parent: null,
		// holds lexical data
		scope: new ReactiveMap(_.assign({}, defaults, data)),
		// holds "this" data
		data: new ReactiveVar(),
		// whether or not the view is mounted
		mounted: false,
		// whether or not the view is currently rendering
		rendering: false,
		// whether or not this is the first mount
		firstMount: true
	};

	if (parent) {
		if (!(parent instanceof View)) {
			throw new Error("Expecting view for parent.");
		}

		this.s.parent = parent;
	} else {
		// set the this var to the data that was passed in
		// but only if this is a root view
		this.s.data.set(data);
	}

	if (Object.getPrototypeOf(this) === View.prototype) {
		this.initialize(options);
	}
}

View.prototype = Object.create(EventEmitter.prototype);

View.prototype.type = "view";
View.prototype.initialize = function() {};

assignProps(View.prototype, {
	scope: function() { return this.s.scope; },
	dataVar: function() { return this.s.data; },
	data: function() { return this.s.data.get(); },
	parent: function() { return this.s.parent; },
	mounted: function() { return this.s.mounted; },
	rendering: function() { return this.s.rendering; },
	firstMount: function() { return this.s.firstMount; }
});

View.prototype.set = function(key, value) {
	if (typeof key === "object") {
		_.forEach(key, (v, k) => this.set(k, v));
		return this;
	}

	if (key === "this") {
		this.s.data.set(value);
	} else {
		this.s.scope.set(key, value);
	}

	return this;
};

View.prototype.get = function(key) { return this.scope.get(key); };

View.prototype.parentData = function(dist) {
	if (typeof dist !== "number" || isNaN(dist)) dist = 1;

	if (dist >= 0) {
		let v = this;
		while (dist && v) {
			dist--;
			v = v.parent;
		}
		return v ? v.data : void 0;
	}

	let views = [];
	let v = this;

	while (v) {
		views.push(v);
		v = v.parent;
	}

	let view = views[Math.abs(dist) - 1];
	return view ? view.data : void 0;
};

View.prototype.lookup = function(key) {
	let view;

	// 0. check for this
	if (!key || key === "this") {
		view = this;
		while (view) {
			let val = view.data;
			if (val !== void 0) return val;
			view = view.parent;
		}
	}

	// 1. special key $parent
	if (key === "$parent") {
		return (d) => this.parentData(d);
	}

	// 2. check closest template's helpers
	view = this;
	while (view) {
		if (view.type === "template") {
			let val = view._helpers.get(key);
			if (val !== void 0) return val;
			break;
		}

		view = view.parent;
	}

	// 3. check lexical scope
	view = this;
	while (view) {
		let val = view.get(key);
		if (val !== void 0) return val;
		view = view.parent;
	}

	// 4. check global helpers
};

View.prototype.autorun = function(fn, options) {
	if (!this.rendering) {
		throw new Error("Can only call this autorun while rendering");
	}

	let comp = Trackr.autorun(fn.bind(this), options);
	let stop = () => comp.stop();
	comp.onStop(this.removeListener.bind(this, "destroy", stop));
	this.on("destroy", stop);
	return comp;
};

View.prototype.mount = function() {
	if (this.rendering) {
		throw new Error("Cannot recursively render.");
	}

	try {
		this.s.rendering = true;

		if (!this.mounted) {
			Trackr.nonreactive(() => this.emit("mount:before"));
		}

		this.render.apply(this, arguments);
		this.emit("render");

		if (!this.mounted) {
			this.s.firstMount = false;
			this.s.mounted = true;
			Trackr.nonreactive(() => this.emit("mount:after"));
		}
	} finally {
		this.s.rendering = false;
	}

	return this;
};

View.prototype.destroy = function() {
	if (this.rendering) {
		throw new Error("Cannot destroy while rendering.");
	}

	if (this.mounted) {
		this.s.firstMount = true;
		this.s.mounted = false;
		this.emit("destroy");
	}

	return this;
};

View.render = function(type, data, parent, fn, ctx, options) {
	let v = new View(data, parent, options);
	v.type = type;
	v.render = fn;
	if (ctx) v.dataVar.set(ctx);
	v.mount();

	let comp = Trackr.currentComputation;
	if (comp) comp.onInvalidate(() => v.destroy());

	return v;
};

View.prototype.paint = function(node) {
	if (typeof node === "string") node = document.querySelector(node);
	if (node == null) throw new Error("Expecting a valid DOM element to paint.");

	this.destroy();

	let comp = Trackr.autorun(() => {
		patch(node, () => this.mount());
	});
	comp.onStop(() => this.destroy());
	this.once("destroy", () => {
		emptyNode(node);
		comp.stop();
	});
	return comp;
};

//
// class View extends EventEmitter {
// 	constructor
//
//
//
// 	// options = options || {};
// 	//
// 	// var parent;
// 	// if (Context.isContext(data)) {
// 	// 	parent = data;
// 	// 	data = null;
// 	// }
// 	//
// 	// // load initial data
// 	// this.context = this.dataContext = new Context(data, parent, options);
// 	//
// 	// // create element from tag name
// 	// let tag = _.result(this, "tagName");
// 	// if (!tag) throw new Error("Missing tag name.");
// 	// this.el = document.createElement(this.extends || tag, this.extends ? tag : null);
// 	//
// 	// // load plugins that the class loaded
// 	// if (this.constructor._loaded_plugins) {
// 	// 	for (let p of this.constructor._loaded_plugins) {
// 	// 		this.use.apply(this, [p.name || p.plugin].concat(p.args));
// 	// 	}
// 	// }
// 	//
// 	// // initialize with options
// 	// this.initialize.call(this, options);
// }

// _.extend(View.prototype, Events, {
// 	initialize: function(){},
//
// 	autorun: function(fn, options) {
// 		let comp = Trackr.autorun(fn.bind(this), options);
// 		comp.onStop(this.off.bind(this, "stop", comp.stop));
// 		this.on("stop", comp.stop, comp);
// 		return comp;
// 	},
//
// 	// a generalized reactive workflow helper
// 	mount: function() {
// 		let self = this;
// 		let args = arguments;
//
// 		Trackr.nonreactive(function() {
// 			// stop existing mount
// 			self.stop();
//
// 			// the first event in the cycle, before everything else
// 			self.trigger("mount:before");
// 		});
//
// 		// the autorun computation
// 		let c = Trackr.autorun(function(comp) {
// 			self.comp = comp;
//
// 			// event about invalidations
// 			comp.onInvalidate(function() {
// 				self.trigger("invalidate");
// 			});
//
// 			// run the render
// 			self.render.apply(self, args);
// 		});
//
// 		// clean when the computation stops
// 		c.onStop(function() {
// 			delete self.comp;
// 			self.trigger("stop");
// 		});
//
// 		// remaining mount events happen after the first render
// 		Trackr.nonreactive(function() {
// 			self.trigger("mount");
// 			self.trigger("mount:after");
// 		});
//
// 		return this;
// 	},
//
// 	stop: function() {
// 		if (this.comp) this.comp.stop();
// 		return this;
// 	},
//
// 	render: function() {
// 		let ctx = this.context;
// 		let args = [ctx].concat(_.toArray(arguments));
// 		patchElement(this.el, () => {
// 			this.trigger("render:before", ctx);
// 			this._render.apply(this, args);
// 			this.trigger("render", ctx);
// 			this.trigger("render:after", ctx);
// 		});
// 	},
//
// 	_render: function(){},
//
// 	// attach + mount
// 	attach: function(parent, before) {
// 		if (typeof parent === "string") parent = document.querySelector(parent);
// 		if (parent == null) throw new Error("Expecting a valid DOM element to attach in.");
// 		if (typeof before === "string") {
// 			before = parent.querySelector ?
// 				parent.querySelector(before) :
// 				document.querySelector(before);
// 		}
//
// 		parent.insertBefore(this.el, before);
// 		this.trigger("attach", this.el);
//
// 		return this;
// 	},
//
// 	paint: function(parent, before) {
// 		this.detach(); // full detach
// 		this.mount(); // mount before render batches new DOM writes
// 		this.attach(parent, before);
// 		return this;
// 	},
//
// 	// stop and remove dom
// 	detach: function() {
// 		this.stop();
// 		if (this.el && this.el.parentNode) {
// 			this.el.parentNode.removeChild(this.el);
// 		}
// 		return this;
// 	}
// });
//
// // brand the class
// assignProps(View.prototype, {
// 	__temple: true,
// 	__temple_type: "view",
// 	data: function() {
// 		return this.getTopContext().data;
// 	}
// });
//
// View.isView = function(o) {
// 	return o && o.__temple && o.__temple_type === "view";
// };
//
// // proxy a few computation methods
// [ "invalidate", "onInvalidate" ].forEach(function(method) {
// 	View.prototype[method] = function() {
// 		if (!this.comp) {
// 			throw new Error("Cannot run " + method + "(). This view is not mounted.");
// 		}
//
// 		this.comp[method].apply(this.comp, arguments);
// 		return this;
// 	};
// });
//
// // // chainable methods to proxy to context
// // []
// // .forEach(function(method) {
// // 	View.prototype[method] = function() {
// // 		this.context[method].apply(this.context, arguments);
// // 		return this;
// // 	};
// // });
//
// // methods to proxy to context which don't return this
// [ "query", "find", "findContext", "getTopContext",
//   "getRootContext", "getContextAtOffset", "getAllContexts"
// ].forEach(function(method) {
// 	View.prototype[method] = function() {
// 		return this.context[method].apply(this.context, arguments);
// 	};
// });
//
// // plugin API
// View.use = View.prototype.use = function use(p) {
// 	return loadPlugin(this, p, _.toArray(arguments).slice(1));
// };
//
// // modify extend so subclasses use the same plugins
// View.extend = function() {
// 	var klass = subclass.apply(this, arguments);
//
// 	if (this._loaded_plugins) {
// 		for (let p of this._loaded_plugins) {
// 			klass.use.apply(klass, [p.name || p.plugin].concat(p.args));
// 		}
// 	}
//
// 	return klass;
// };
//
// // default plugins
// View.use("helpers");
// View.use("decorators");
// View.use("partials");
// View.use("components");
//
// // export view
// export default View;