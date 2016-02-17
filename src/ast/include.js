import Node from "./node";
import path from "path";
import fs from "fs-promise";
import {includes} from "lodash";

export default class Include extends Node {
	resolve(file) {
		return path.resolve(path.dirname(file), this.src);
	}

	compile(data) {
		let fpath = this.resolve(data.originalFilename);

		if (includes(data.includes, fpath)) {
			let empty = this._sn(data.originalFilename, "");
			return data.async ? Promise.resolve(empty) : empty;
		}

		let compile = (src) => {
			return data.parse(src, fpath).compile(data);
		};

		if (data.async) {
			return fs.readFile(fpath, { encoding: "utf-8" }).then(compile);
		} else {
			return compile(fs.readFileSync(fpath, { encoding: "utf-8" }));
		}
	}
}
