import * as _ from "lodash";

export function header(data, h) {
	if (_.isArray(data.headers) && !_.contains(data.headers, h)) {
		data.headers.push(h);
	}
}

export function compileGroup(nodes, data) {
	let base = data.key || [];
	return nodes.map(function(n, i) {
		return n.compile(_.extend({}, data, {
			key: [].concat(base, i.toString())
		}));
	});
}

export function getKey(data) {
	return (data.key || []).reduce(function(memo, v) {
		if (_.isString(v) && _.isString(_.last(memo))) {
			memo.push(memo.pop() + "-" + v);
		} else {
			memo.push(v);
		}

		return memo;
	}, []).map(function(v, i, l) {
		if (typeof v === "object") return v.value;
		if (i !== 0) v = "-" + v;
		if (i !== l.length - 1) v += "-";
		return JSON.stringify(v);
	}).join(" + ");
}