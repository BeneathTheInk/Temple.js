import Node from "./node";
import Branch from "./branch";
import If from "./if";
import Each from "./each";
import Render from "./render";
import Set from "./set";
import With from "./with";
var parse = require("./m+xml.js");

export default class SectionTag extends Node {
	static convert(nodes) {
		nodes = nodes.slice(0);
		var stack = [new Node(null, null, { children: [] })], n;

		function push(item) {
			stack[stack.length - 1].children.push(item);
		}

		function open(item) {
			push(item);
			stack.push(item);
		}

		function close(name, Type, check) {
			var last = stack.pop();
			if (!(last instanceof Type) || (check && !check(last))) {
				throw new Error("Unexpected " + name + " section.");
			}
		}

		function notelse(n) {
			return n instanceof Branch && n.expression != null;
		}

		while(nodes.length) {
			n = nodes.shift();
			if (!(n instanceof SectionTag)) {
				push(n);
				continue;
			}

			switch(n.name) {
				case "if":
					open(new If(n._line, n._column, { children: [] }));
					open(new Branch(n._line, n._column, {
						expression: n.expression,
						children: []
					}));
					break;

				case "else if":
					close(n.name, Branch, notelse);
					open(new Branch(n._line, n._column, {
						expression: n.expression,
						children: []
					}));
					break;

				case "else":
					close(n.name, Branch, notelse);
					open(new Branch(n._line, n._column, {
						expression: null,
						children: []
					}));
					break;

				case "endif":
					close(n.name, Branch);
					close(n.name, If);
					break;

				case "each":
					open(new Each(n._line, n._column, {
						expression: n.expression,
						children: []
					}));
					break;

				case "endeach":
					close(n.name, Each);
					break;

				case "with":
					open(new With(n._line, n._column, {
						expression: n.expression,
						children: []
					}));
					break;

				case "endwith":
					close(n.name, With);
					break;

				case "render":
					push(new Render(n._line, n._column, {
						expression: n.expression
					}));
					break;

				case "set":
					push(new Set(n._line, n._column, {
						variable: n.variable,
						expression: n.expression
					}));
					break;

				default:
					throw new parse.SyntaxError(`Unknown section tag '${n.name}' (${n._line}:${n._column})`, null, n.name, {
						start: { line: n._line, column: n._column }
					});
			}
		}

		if (stack.length !== 1) {
			throw new Error("Non-terminated section.");
		}

		return stack[0].children;
	}
}
