import {assign,invokeMap} from "lodash";
import { SourceNode } from "source-map";
import {parse} from "./m+xml.pegjs";
import * as Temple from "./";
// import * as AST from "./ast";

// var parse = require("./m+xml").parse;
var url = "sourceMappingURL=data:application/json;charset=utf-8;base64,";

export function getSource(nodes, src, options) {
	let source = new SourceNode(null, null, options.originalFilename, nodes);
	if (!options.sourceMap) return source.toString();

	if (src) source.setSourceContent(options.originalFilename, src);
	let result = source.toStringWithSourceMap();
	let map64 = new Buffer(result.map.toString(), "utf-8").toString("base64");
	return result.code + "//# " + url + map64;
}

export function compile(tree, options) {
	options = assign({
		originalFilename: "template.js"
	}, options);

	let src;
	if (typeof tree === "string") {
		src = tree;
		tree = parse(src, options);
	}

	let nodes = invokeMap([].concat(tree), "compile", options);
	return getSource(nodes, src, options);
}

export function exec(tpl, options) {
	/* jshint -W054 */
	var r = compile(tpl, options);
	// console.log(r);
	return (new Function("Temple", r))(Temple);
}

// export function compileHTML(html, options) {
// 	options = options || {};
// 	var node = new AST.HTML(null, html);
// 	return getSource(node.compile(options), html, options);
// }
//
// export function renderHTML(html, options) {
// 	/* jshint -W054 */
// 	var r = compileHTML(html, options);
// 	// console.log(r);
// 	return (new Function("Temple", r))(require("./"));
// }
