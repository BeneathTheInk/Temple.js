import _resolve from "rollup-plugin-node-resolve";
import commonjs from 'rollup-plugin-commonjs';
import babel from "rollup-plugin-babel";
import pegjs from "pegjs";
import json from "rollup-plugin-json";
import path from "path";
// import include from "rollup-plugin-includepaths";
import builtins from "browserify/lib/builtins.js";
import inject from "rollup-plugin-inject";
import {has,forEach} from "lodash";

const emptyModule = require.resolve("browserify/lib/_empty.js");
const rollupEmptyModule = require.resolve("rollup-plugin-node-resolve/src/empty.js");

forEach(builtins, function(p, id) {
	if (p === emptyModule) builtins[id] = rollupEmptyModule;
});

const resolve = _resolve({
	jsnext: false,
	main: true,
	browser: true
});

const commonOpts = {
   include: [ /*"src/*.pegjs"*/ ],
   exclude: [ "src/**" ],
   extensions: [ /*".pegjs",*/ ".js" ],
   namedExports: {
	//    "src/m+xml.pegjs": [ "parse" ]
   }
};

if (process.env.TARGET !== "common") {
	commonOpts.include.push("node_modules/**");
	commonOpts.namedExports["source-map/lib/util.js"] = [ "createMap" ];
	commonOpts.namedExports.events = [ "EventEmitter" ];
}

const plugins = [
	{
		resolveId: function(id, p) {
			if (process.env.TARGET === "common" &&
				!/^incremental-dom/.test(id) &&
				!/^\.{0,2}\//.test(id)) return null;

			if (has(builtins, id)) return builtins[id];
			if (id === "templejs") return path.resolve("src/index.js");
			return resolve.resolveId(id, p);
		}
	},
	{
		transform: function(code, id) {
			if (path.extname(id) !== ".pegjs") return;
			let parts = code.split("#####");
			let source = pegjs.buildParser(parts[parts.length > 1 ? 1 : 0], {
				output: "source",
				optimize: "size"
			});

			return {
				code: `${parts.length > 1 ? parts[0] : ""}
const parser = ${source};
export default parser;
export var parse = parser.parse;`,
				map: { mappings: "" }
			};
		}
	},
	json(),
	commonjs(commonOpts),
	babel({
		exclude: [ "node_modules/**"/*, "*.pegjs" */ ],
		include: [ "node_modules/incremental-dom/**", "src/**" ]
	})
];

if (process.env.TARGET !== "common") {
	plugins.push(inject({
		process: builtins._process,
		Buffer: [ builtins.buffer, "Buffer" ]
	}));
}

export default { plugins };
