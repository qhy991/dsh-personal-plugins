import { Service } from "@deepseek-ai/cordis";
import { Remote, TypertRemoteService } from "@deepseek-ai/dsh-typert-protocol";
import { execFile } from "node:child_process";
import { access, open, readFile, readdir } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { watch } from "node:fs";
//#region ../../../vendor/cosmokit/src/misc.ts
/** Return true when a value is `null` or `undefined`. */
function isNullable(value) {
	return value === null || value === void 0;
}
/** Return true for non-array object values. */
function isPlainObject(data) {
	return data && typeof data === "object" && !Array.isArray(data);
}
/** Filter object entries and return a new object. */
function filterKeys(object, filter) {
	return Object.fromEntries(Object.entries(object).filter(([key, value]) => filter(key, value)));
}
/** Map object values while preserving the original key set. */
function mapValues(object, transform) {
	return Object.fromEntries(Object.entries(object).map(([key, value]) => [key, transform(value, key)]));
}
/** Pick selected keys from an object, optionally including `undefined` values. */
function pick(source, keys, forced) {
	if (!keys) return { ...source };
	const result = {};
	for (const key of keys) if (forced || source[key] !== void 0) result[key] = source[key];
	return result;
}
//#endregion
//#region ../../../vendor/cosmokit/src/types.ts
/** Test values using `instanceof` with a `toStringTag` fallback. */
function is(type, value) {
	if (arguments.length === 1) return (value) => is(type, value);
	return type in globalThis && value instanceof globalThis[type] || Object.prototype.toString.call(value).slice(8, -1) === type;
}
function isArrayBufferLike(value) {
	return is("ArrayBuffer", value) || is("SharedArrayBuffer", value);
}
function isArrayBufferSource(value) {
	return isArrayBufferLike(value) || ArrayBuffer.isView(value);
}
let Binary;
(function(_Binary) {
	_Binary.is = isArrayBufferLike;
	_Binary.isSource = isArrayBufferSource;
	function fromSource(source) {
		if (ArrayBuffer.isView(source)) return source.buffer.slice(source.byteOffset, source.byteOffset + source.byteLength);
		else return source;
	}
	_Binary.fromSource = fromSource;
	function toBase64(source) {
		source = fromSource(source);
		if (typeof Buffer !== "undefined") return Buffer.from(source).toString("base64");
		let binary = "";
		const bytes = new Uint8Array(source);
		for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
		return btoa(binary);
	}
	_Binary.toBase64 = toBase64;
	function fromBase64(source) {
		if (typeof Buffer !== "undefined") return fromSource(Buffer.from(source, "base64"));
		return Uint8Array.from(atob(source), (c) => c.charCodeAt(0));
	}
	_Binary.fromBase64 = fromBase64;
	function toHex(source) {
		source = fromSource(source);
		if (typeof Buffer !== "undefined") return Buffer.from(source).toString("hex");
		return Array.from(new Uint8Array(source), (byte) => byte.toString(16).padStart(2, "0")).join("");
	}
	_Binary.toHex = toHex;
	function fromHex(source) {
		if (typeof Buffer !== "undefined") return fromSource(Buffer.from(source, "hex"));
		const hex = source.length % 2 === 0 ? source : source.slice(0, source.length - 1);
		const buffer = [];
		for (let i = 0; i < hex.length; i += 2) buffer.push(parseInt(`${hex[i]}${hex[i + 1]}`, 16));
		return Uint8Array.from(buffer).buffer;
	}
	_Binary.fromHex = fromHex;
})(Binary || (Binary = {}));
Binary.fromBase64;
Binary.toBase64;
Binary.fromHex;
Binary.toHex;
/** Deep-clone common JavaScript values while preserving prototypes and cycles. */
function clone(source, refs = /* @__PURE__ */ new Map()) {
	if (!source || typeof source !== "object") return source;
	if (is("Date", source)) return new Date(source.valueOf());
	if (is("RegExp", source)) return new RegExp(source.source, source.flags);
	if (isArrayBufferLike(source)) return source.slice(0);
	if (ArrayBuffer.isView(source)) return source.buffer.slice(source.byteOffset, source.byteOffset + source.byteLength);
	const cached = refs.get(source);
	if (cached) return cached;
	if (Array.isArray(source)) {
		const result = [];
		refs.set(source, result);
		source.forEach((value, index) => {
			result[index] = Reflect.apply(clone, null, [value, refs]);
		});
		return result;
	}
	const result = Object.create(Object.getPrototypeOf(source));
	refs.set(source, result);
	for (const key of Reflect.ownKeys(source)) {
		const descriptor = { ...Reflect.getOwnPropertyDescriptor(source, key) };
		if ("value" in descriptor) descriptor.value = Reflect.apply(clone, null, [descriptor.value, refs]);
		Reflect.defineProperty(result, key, descriptor);
	}
	return result;
}
/** Deeply compare arrays, dates, regexps, buffers, and plain object fields. */
function deepEqual(a, b, strict) {
	if (a === b) return true;
	if (!strict && isNullable(a) && isNullable(b)) return true;
	if (typeof a !== typeof b) return false;
	if (typeof a !== "object") return false;
	if (!a || !b) return false;
	function check(test, then) {
		return test(a) ? test(b) ? then(a, b) : false : test(b) ? false : void 0;
	}
	return check(Array.isArray, (a, b) => a.length === b.length && a.every((item, index) => deepEqual(item, b[index]))) ?? check(is("Date"), (a, b) => a.valueOf() === b.valueOf()) ?? check(is("RegExp"), (a, b) => a.source === b.source && a.flags === b.flags) ?? check(isArrayBufferLike, (a, b) => {
		if (a.byteLength !== b.byteLength) return false;
		const viewA = new Uint8Array(a);
		const viewB = new Uint8Array(b);
		for (let i = 0; i < viewA.length; i++) if (viewA[i] !== viewB[i]) return false;
		return true;
	}) ?? Object.keys({
		...a,
		...b
	}).every((key) => deepEqual(a[key], b[key], strict));
}
//#endregion
//#region ../../../vendor/cosmokit/src/time.ts
let Time;
(function(_Time) {
	_Time.millisecond = 1;
	const second = _Time.second = 1e3;
	const minute = _Time.minute = second * 60;
	const hour = _Time.hour = minute * 60;
	const day = _Time.day = hour * 24;
	const week = _Time.week = day * 7;
	let timezoneOffset = (/* @__PURE__ */ new Date()).getTimezoneOffset();
	function setTimezoneOffset(offset) {
		timezoneOffset = offset;
	}
	_Time.setTimezoneOffset = setTimezoneOffset;
	function getTimezoneOffset() {
		return timezoneOffset;
	}
	_Time.getTimezoneOffset = getTimezoneOffset;
	function getDateNumber(date = /* @__PURE__ */ new Date(), offset) {
		if (typeof date === "number") date = new Date(date);
		if (offset === void 0) offset = timezoneOffset;
		return Math.floor((date.valueOf() / minute - offset) / 1440);
	}
	_Time.getDateNumber = getDateNumber;
	function fromDateNumber(value, offset) {
		const date = new Date(value * day);
		if (offset === void 0) offset = timezoneOffset;
		return new Date(+date + offset * minute);
	}
	_Time.fromDateNumber = fromDateNumber;
	const numeric = /\d+(?:\.\d+)?/.source;
	const timeRegExp = new RegExp(`^${[
		"w(?:eek(?:s)?)?",
		"d(?:ay(?:s)?)?",
		"h(?:our(?:s)?)?",
		"m(?:in(?:ute)?(?:s)?)?",
		"s(?:ec(?:ond)?(?:s)?)?"
	].map((unit) => `(${numeric}${unit})?`).join("")}$`);
	function parseTime(source) {
		const capture = timeRegExp.exec(source);
		if (!capture) return 0;
		return (parseFloat(capture[1]) * week || 0) + (parseFloat(capture[2]) * day || 0) + (parseFloat(capture[3]) * hour || 0) + (parseFloat(capture[4]) * minute || 0) + (parseFloat(capture[5]) * second || 0);
	}
	_Time.parseTime = parseTime;
	function parseDate(date) {
		const parsed = parseTime(date);
		if (parsed) date = Date.now() + parsed;
		else if (/^\d{1,2}(:\d{1,2}){1,2}$/.test(date)) date = `${(/* @__PURE__ */ new Date()).toLocaleDateString()}-${date}`;
		else if (/^\d{1,2}-\d{1,2}-\d{1,2}(:\d{1,2}){1,2}$/.test(date)) date = `${(/* @__PURE__ */ new Date()).getFullYear()}-${date}`;
		return date ? new Date(date) : /* @__PURE__ */ new Date();
	}
	_Time.parseDate = parseDate;
	function format(ms) {
		const abs = Math.abs(ms);
		if (abs >= day - hour / 2) return Math.round(ms / day) + "d";
		else if (abs >= hour - minute / 2) return Math.round(ms / hour) + "h";
		else if (abs >= minute - second / 2) return Math.round(ms / minute) + "m";
		else if (abs >= second) return Math.round(ms / second) + "s";
		return ms + "ms";
	}
	_Time.format = format;
	function toDigits(source, length = 2) {
		return source.toString().padStart(length, "0");
	}
	_Time.toDigits = toDigits;
	function template(template, time = /* @__PURE__ */ new Date()) {
		return template.replace("yyyy", time.getFullYear().toString()).replace("yy", time.getFullYear().toString().slice(2)).replace("MM", toDigits(time.getMonth() + 1)).replace("dd", toDigits(time.getDate())).replace("hh", toDigits(time.getHours())).replace("mm", toDigits(time.getMinutes())).replace("ss", toDigits(time.getSeconds())).replace("SSS", toDigits(time.getMilliseconds(), 3));
	}
	_Time.template = template;
})(Time || (Time = {}));
//#endregion
//#region ../../../vendor/schemastery/src/index.ts
const kSchema = Symbol.for("schemastery");
const kValidationError = Symbol.for("ValidationError");
globalThis.__schemastery_index__ ??= 0;
globalThis.__schemastery_refs__ = void 0;
var ValidationError = class extends TypeError {
	options;
	name = "ValidationError";
	constructor(message, options) {
		let prefix = "$";
		for (const segment of options.path || []) if (typeof segment === "string") prefix += "." + segment;
		else if (typeof segment === "number") prefix += "[" + segment + "]";
		else if (typeof segment === "symbol") prefix += `[Symbol(${segment.toString()})]`;
		if (prefix.startsWith(".")) prefix = prefix.slice(1);
		super((prefix === "$" ? "" : `${prefix} `) + message);
		this.options = options;
	}
	static is(error) {
		return !!error?.[kValidationError];
	}
};
Object.defineProperty(ValidationError.prototype, kValidationError, { value: true });
const Schema = function(options) {
	const schema = function(data, options = {}) {
		return Schema.resolve(data, schema, options)[0];
	};
	if (options.refs) {
		const refs = mapValues(options.refs, (options) => new Schema(options));
		const getRef = (uid) => refs[uid];
		for (const key in refs) {
			const options = refs[key];
			options.sKey = getRef(options.sKey);
			options.inner = getRef(options.inner);
			options.list = options.list && options.list.map(getRef);
			options.dict = options.dict && mapValues(options.dict, getRef);
		}
		return refs[options.uid];
	}
	Object.assign(schema, options);
	if (typeof schema.callback === "string") try {
		schema.callback = new Function("return " + schema.callback)();
	} catch {}
	Object.defineProperty(schema, "uid", { value: globalThis.__schemastery_index__++ });
	Object.setPrototypeOf(schema, Schema.prototype);
	schema.meta ||= {};
	schema.toString = schema.toString.bind(schema);
	return schema;
};
Schema.prototype = Object.create(Function.prototype);
Schema.prototype[kSchema] = true;
Object.defineProperty(Schema.prototype, "~standard", { get() {
	return {
		version: 1,
		vendor: "schemastery",
		validate: (value) => {
			try {
				return { value: Schema.resolve(value, this, {})[0] };
			} catch (error) {
				if (ValidationError.is(error)) return { issues: [{
					message: error.message,
					path: error.options.path
				}] };
				throw error;
			}
		}
	};
} });
Schema.ValidationError = ValidationError;
Schema.prototype.toJSON = function toJSON() {
	if (globalThis.__schemastery_refs__) {
		globalThis.__schemastery_refs__[this.uid] ??= JSON.parse(JSON.stringify({ ...this }));
		return this.uid;
	}
	globalThis.__schemastery_refs__ = { [this.uid]: { ...this } };
	globalThis.__schemastery_refs__[this.uid] = JSON.parse(JSON.stringify({ ...this }));
	const result = {
		uid: this.uid,
		refs: globalThis.__schemastery_refs__
	};
	globalThis.__schemastery_refs__ = void 0;
	return result;
};
Schema.prototype.set = function set(key, value) {
	this.dict[key] = value;
	return this;
};
Schema.prototype.push = function push(value) {
	this.list.push(value);
	return this;
};
function mergeDesc(original, messages) {
	const result = typeof original === "string" ? { "": original } : { ...original };
	for (const locale in messages) {
		const value = messages[locale];
		if (value?.$description || value?.$desc) result[locale] = value.$description || value.$desc;
		else if (typeof value === "string") result[locale] = value;
	}
	return result;
}
function getInner(value) {
	return value?.$value ?? value?.$inner;
}
function extractKeys(data) {
	return filterKeys(data ?? {}, (key) => !key.startsWith("$"));
}
Schema.prototype.i18n = function i18n(messages) {
	const schema = Schema(this);
	const desc = mergeDesc(schema.meta.description, messages);
	if (Object.keys(desc).length) schema.meta.description = desc;
	if (schema.dict) schema.dict = mapValues(schema.dict, (inner, key) => {
		return inner.i18n(mapValues(messages, (data) => getInner(data)?.[key] ?? data?.[key]));
	});
	if (schema.list) schema.list = schema.list.map((inner, index) => {
		return inner.i18n(mapValues(messages, (data = {}) => {
			if (Array.isArray(getInner(data))) return getInner(data)[index];
			if (Array.isArray(data)) return data[index];
			return extractKeys(data);
		}));
	});
	if (schema.inner) schema.inner = schema.inner.i18n(mapValues(messages, (data) => {
		if (getInner(data)) return getInner(data);
		return extractKeys(data);
	}));
	if (schema.sKey) schema.sKey = schema.sKey.i18n(mapValues(messages, (data) => data?.$key));
	return schema;
};
Schema.prototype.extra = function extra(key, value) {
	const schema = Schema(this);
	schema.meta = {
		...schema.meta,
		[key]: value
	};
	return schema;
};
for (const key of [
	"required",
	"disabled",
	"collapse",
	"hidden",
	"loose"
]) Object.assign(Schema.prototype, { [key](value = true) {
	const schema = Schema(this);
	schema.meta = {
		...schema.meta,
		[key]: value
	};
	return schema;
} });
Schema.prototype.deprecated = function deprecated() {
	const schema = Schema(this);
	schema.meta.badges ||= [];
	schema.meta.badges.push({
		text: "deprecated",
		type: "danger"
	});
	return schema;
};
Schema.prototype.experimental = function experimental() {
	const schema = Schema(this);
	schema.meta.badges ||= [];
	schema.meta.badges.push({
		text: "experimental",
		type: "warning"
	});
	return schema;
};
Schema.prototype.pattern = function pattern(regexp) {
	const schema = Schema(this);
	const pattern = pick(regexp, ["source", "flags"]);
	schema.meta = {
		...schema.meta,
		pattern
	};
	return schema;
};
Schema.prototype.simplify = function simplify(value) {
	if (deepEqual(value, this.meta.default, this.type === "dict")) return null;
	if (isNullable(value)) return value;
	if (this.type === "object" || this.type === "dict") {
		const result = {};
		for (const key in value) {
			const item = (this.type === "object" ? this.dict[key] : this.inner)?.simplify(value[key]);
			if (this.type === "dict" || !isNullable(item)) result[key] = item;
		}
		if (deepEqual(result, this.meta.default, this.type === "dict")) return null;
		return result;
	} else if (this.type === "array" || this.type === "tuple") {
		const result = [];
		value.forEach((value, index) => {
			const schema = this.type === "array" ? this.inner : this.list[index];
			const item = schema ? schema.simplify(value) : value;
			result.push(item);
		});
		return result;
	} else if (this.type === "intersect") {
		const result = {};
		for (const item of this.list) Object.assign(result, item.simplify(value));
		return result;
	} else if (this.type === "union") for (const schema of this.list) try {
		Schema.resolve(value, schema, {});
		return schema.simplify(value);
	} catch {}
	return value;
};
Schema.prototype.toString = function toString(inline) {
	return formatters[this.type]?.(this, inline) ?? `Schema<${this.type}>`;
};
Schema.prototype.role = function role(role, extra) {
	const schema = Schema(this);
	schema.meta = {
		...schema.meta,
		role,
		extra
	};
	return schema;
};
for (const key of [
	"default",
	"link",
	"comment",
	"description",
	"max",
	"min",
	"step"
]) Object.assign(Schema.prototype, { [key](value) {
	const schema = Schema(this);
	schema.meta = {
		...schema.meta,
		[key]: value
	};
	return schema;
} });
const resolvers = {};
Schema.extend = function extend(type, resolve) {
	resolvers[type] = resolve;
};
Schema.resolve = function resolve(data, schema, options = {}, strict = false) {
	if (!schema) return [data];
	if (options.ignore?.(data, schema)) return [data];
	if (isNullable(data) && schema.type !== "lazy") {
		if (schema.meta.required) throw new ValidationError(`missing required value`, options);
		let current = schema;
		let fallback = schema.meta.default;
		while (current?.type === "intersect" && isNullable(fallback)) {
			current = current.list[0];
			fallback = current?.meta.default;
		}
		if (isNullable(fallback)) return [data];
		data = clone(fallback);
	}
	const callback = resolvers[schema.type];
	if (!callback) throw new ValidationError(`unsupported type "${schema.type}"`, options);
	try {
		return callback(data, schema, options, strict);
	} catch (error) {
		if (!schema.meta.loose) throw error;
		return [schema.meta.default];
	}
};
Schema.from = function from(source) {
	if (isNullable(source)) return Schema.any();
	else if ([
		"string",
		"number",
		"boolean"
	].includes(typeof source)) return Schema.const(source).required();
	else if (source[kSchema]) return source;
	else if (typeof source === "function") switch (source) {
		case String: return Schema.string().required();
		case Number: return Schema.number().required();
		case Boolean: return Schema.boolean().required();
		case Function: return Schema.function().required();
		default: return Schema.is(source).required();
	}
	else throw new TypeError(`cannot infer schema from ${source}`);
};
Schema.lazy = function lazy(builder) {
	const toJSON = () => {
		if (!schema.inner[kSchema]) {
			schema.inner = schema.builder();
			schema.inner.meta = {
				...schema.meta,
				...schema.inner.meta
			};
		}
		return schema.inner.toJSON();
	};
	const schema = new Schema({
		type: "lazy",
		builder,
		inner: { toJSON }
	});
	return schema;
};
Schema.natural = function natural() {
	return Schema.number().step(1).min(0);
};
Schema.percent = function percent() {
	return Schema.number().step(.01).min(0).max(1).role("slider");
};
Schema.date = function date() {
	return Schema.union([Schema.is(Date), Schema.transform(Schema.string().role("datetime"), (value, options) => {
		const date = new Date(value);
		if (isNaN(+date)) throw new ValidationError(`invalid date "${value}"`, options);
		return date;
	}, true)]);
};
Schema.regExp = function regExp(flag = "") {
	return Schema.union([Schema.is(RegExp), Schema.transform(Schema.string().role("regexp", { flag }), (value, options) => {
		try {
			return new RegExp(value, flag);
		} catch (e) {
			throw new ValidationError(e.message, options);
		}
	}, true)]);
};
Schema.arrayBuffer = function arrayBuffer(encoding) {
	return Schema.union([
		Schema.is(ArrayBuffer),
		Schema.is(SharedArrayBuffer),
		Schema.transform(Schema.any(), (value, options) => {
			if (Binary.isSource(value)) return Binary.fromSource(value);
			throw new ValidationError(`expected ArrayBufferSource but got ${value}`, options);
		}, true),
		...encoding ? [Schema.transform(Schema.string(), (value, options) => {
			try {
				return encoding === "base64" ? Binary.fromBase64(value) : Binary.fromHex(value);
			} catch (e) {
				throw new ValidationError(e.message, options);
			}
		}, true)] : []
	]);
};
Schema.extend("lazy", (data, schema, options, strict) => {
	if (!schema.inner[kSchema]) {
		schema.inner = schema.builder();
		schema.inner.meta = {
			...schema.meta,
			...schema.inner.meta
		};
	}
	return Schema.resolve(data, schema.inner, options, strict);
});
Schema.extend("any", (data) => {
	return [data];
});
Schema.extend("never", (data, _, options) => {
	throw new ValidationError(`expected nullable but got ${data}`, options);
});
Schema.extend("const", (data, { value }, options) => {
	if (deepEqual(data, value)) return [value];
	throw new ValidationError(`expected ${value} but got ${data}`, options);
});
function checkWithinRange(data, meta, description, options, skipMin = false) {
	const { max = Infinity, min = -Infinity } = meta;
	if (data > max) throw new ValidationError(`expected ${description} <= ${max} but got ${data}`, options);
	if (data < min && !skipMin) throw new ValidationError(`expected ${description} >= ${min} but got ${data}`, options);
}
Schema.extend("string", (data, { meta }, options) => {
	if (typeof data !== "string") throw new ValidationError(`expected string but got ${data}`, options);
	if (meta.pattern) {
		const regexp = new RegExp(meta.pattern.source, meta.pattern.flags);
		if (!regexp.test(data)) throw new ValidationError(`expect string to match regexp ${regexp}`, options);
	}
	checkWithinRange(data.length, meta, "string length", options);
	return [data];
});
function decimalShift(data, digits) {
	const str = data.toString();
	if (str.includes("e")) return data * Math.pow(10, digits);
	const index = str.indexOf(".");
	if (index === -1) return data * Math.pow(10, digits);
	const frac = str.slice(index + 1);
	const integer = str.slice(0, index);
	if (frac.length <= digits) return +(integer + frac.padEnd(digits, "0"));
	return +(integer + frac.slice(0, digits) + "." + frac.slice(digits));
}
function isMultipleOf(data, min, step) {
	step = Math.abs(step);
	if (!/^\d+\.\d+$/.test(step.toString())) return (data - min) % step === 0;
	const index = step.toString().indexOf(".");
	const digits = step.toString().slice(index + 1).length;
	return Math.abs(decimalShift(data, digits) - decimalShift(min, digits)) % decimalShift(step, digits) === 0;
}
Schema.extend("number", (data, { meta }, options) => {
	if (typeof data !== "number") throw new ValidationError(`expected number but got ${data}`, options);
	checkWithinRange(data, meta, "number", options);
	const { step } = meta;
	if (step && !isMultipleOf(data, meta.min ?? 0, step)) throw new ValidationError(`expected number multiple of ${step} but got ${data}`, options);
	return [data];
});
Schema.extend("boolean", (data, _, options) => {
	if (typeof data === "boolean") return [data];
	throw new ValidationError(`expected boolean but got ${data}`, options);
});
Schema.extend("bitset", (data, { bits, meta }, options) => {
	let value = 0, keys = [];
	if (typeof data === "number") {
		value = data;
		for (const key in bits) if (data & bits[key]) keys.push(key);
	} else if (Array.isArray(data)) {
		keys = data;
		for (const key of keys) {
			if (typeof key !== "string") throw new ValidationError(`expected string but got ${key}`, options);
			if (key in bits) value |= bits[key];
		}
	} else throw new ValidationError(`expected number or array but got ${data}`, options);
	if (value === meta.default) return [value];
	return [value, keys];
});
Schema.extend("function", (data, _, options) => {
	if (typeof data === "function") return [data];
	throw new ValidationError(`expected function but got ${data}`, options);
});
Schema.extend("is", (data, { constructor }, options) => {
	if (typeof constructor === "function") {
		if (data instanceof constructor) return [data];
		throw new ValidationError(`expected ${constructor.name} but got ${data}`, options);
	} else {
		if (isNullable(data)) throw new ValidationError(`expected ${constructor} but got ${data}`, options);
		let prototype = Object.getPrototypeOf(data);
		while (prototype) {
			if (prototype.constructor?.name === constructor) return [data];
			prototype = Object.getPrototypeOf(prototype);
		}
		throw new ValidationError(`expected ${constructor} but got ${data}`, options);
	}
});
function property(data, key, schema, options) {
	try {
		const [value, adapted] = Schema.resolve(data[key], schema, {
			...options,
			path: [...options.path || [], key]
		});
		if (adapted !== void 0) data[key] = adapted;
		return value;
	} catch (e) {
		if (!options?.autofix) throw e;
		delete data[key];
		return schema.meta.default;
	}
}
Schema.extend("array", (data, { inner, meta }, options) => {
	if (!Array.isArray(data)) throw new ValidationError(`expected array but got ${data}`, options);
	checkWithinRange(data.length, meta, "array length", options, !isNullable(inner.meta.default));
	return [data.map((_, index) => property(data, index, inner, options))];
});
Schema.extend("dict", (data, { inner, sKey }, options, strict) => {
	if (!isPlainObject(data)) throw new ValidationError(`expected object but got ${data}`, options);
	const result = {};
	for (const key in data) {
		let rKey;
		try {
			rKey = Schema.resolve(key, sKey, options)[0];
		} catch (error) {
			if (strict) continue;
			throw error;
		}
		result[rKey] = property(data, key, inner, options);
		data[rKey] = data[key];
		if (key !== rKey) delete data[key];
	}
	return [result];
});
Schema.extend("tuple", (data, { list }, options, strict) => {
	if (!Array.isArray(data)) throw new ValidationError(`expected array but got ${data}`, options);
	const result = list.map((inner, index) => property(data, index, inner, options));
	if (strict) return [result];
	result.push(...data.slice(list.length));
	return [result];
});
function merge(result, data) {
	for (const key in data) {
		if (key in result) continue;
		result[key] = data[key];
	}
}
Schema.extend("object", (data, { dict }, options, strict) => {
	if (!isPlainObject(data)) throw new ValidationError(`expected object but got ${data}`, options);
	const result = {};
	for (const key in dict) {
		const value = property(data, key, dict[key], options);
		if (!isNullable(value) || key in data) result[key] = value;
	}
	if (!strict) merge(result, data);
	return [result];
});
Schema.extend("union", (data, { list, toString }, options, strict) => {
	const messages = [];
	for (const inner of list) try {
		return Schema.resolve(data, inner, options, strict);
	} catch (error) {
		messages.push(error);
	}
	throw new ValidationError(`expected ${toString()} but got ${JSON.stringify(data)}`, options);
});
Schema.extend("intersect", (data, { list, toString }, options, strict) => {
	if (!list.length) return [data];
	let result;
	for (const inner of list) {
		const value = Schema.resolve(data, inner, options, true)[0];
		if (isNullable(value)) continue;
		if (isNullable(result)) result = value;
		else if (typeof result !== typeof value) throw new ValidationError(`expected ${toString()} but got ${JSON.stringify(data)}`, options);
		else if (typeof value === "object") merge(result ??= {}, value);
		else if (result !== value) throw new ValidationError(`expected ${toString()} but got ${JSON.stringify(data)}`, options);
	}
	if (!strict && isPlainObject(data)) merge(result, data);
	return [result];
});
Schema.extend("transform", (data, { inner, callback, preserve }, options) => {
	const [result, adapted = data] = Schema.resolve(data, inner, options, true);
	if (preserve) return [callback(result)];
	else return [callback(result), callback(adapted)];
});
const formatters = {};
function defineMethod(name, keys, format) {
	formatters[name] = format;
	Object.assign(Schema, { [name](...args) {
		const schema = new Schema({ type: name });
		keys.forEach((key, index) => {
			switch (key) {
				case "sKey":
					schema.sKey = args[index] ?? Schema.string();
					break;
				case "inner":
					schema.inner = Schema.from(args[index]);
					break;
				case "list":
					schema.list = args[index].map(Schema.from);
					break;
				case "dict":
					schema.dict = mapValues(args[index], Schema.from);
					break;
				case "bits":
					schema.bits = {};
					for (const key in args[index]) {
						if (typeof args[index][key] !== "number") continue;
						schema.bits[key] = args[index][key];
					}
					break;
				case "callback": {
					const callback = schema.callback = args[index];
					callback["toJSON"] ||= () => callback.toString();
					break;
				}
				case "constructor": {
					const constructor = schema.constructor = args[index];
					if (typeof constructor === "function") constructor["toJSON"] ||= () => constructor["name"];
					break;
				}
				default: schema[key] = args[index];
			}
		});
		if (name === "object" || name === "dict") schema.meta.default = {};
		else if (name === "array" || name === "tuple") schema.meta.default = [];
		else if (name === "bitset") schema.meta.default = 0;
		return schema;
	} });
}
defineMethod("is", ["constructor"], ({ constructor }) => {
	if (typeof constructor === "function") return constructor.name;
	else return constructor;
});
defineMethod("any", [], () => "any");
defineMethod("never", [], () => "never");
defineMethod("const", ["value"], ({ value }) => typeof value === "string" ? JSON.stringify(value) : value);
defineMethod("string", [], () => "string");
defineMethod("number", [], () => "number");
defineMethod("boolean", [], () => "boolean");
defineMethod("bitset", ["bits"], () => "bitset");
defineMethod("function", [], () => "function");
defineMethod("array", ["inner"], ({ inner }) => `${inner.toString(true)}[]`);
defineMethod("dict", ["inner", "sKey"], ({ inner, sKey }) => `{ [key: ${sKey.toString()}]: ${inner.toString()} }`);
defineMethod("tuple", ["list"], ({ list }) => `[${list.map((inner) => inner.toString()).join(", ")}]`);
defineMethod("object", ["dict"], ({ dict }) => {
	if (Object.keys(dict).length === 0) return "{}";
	return `{ ${Object.entries(dict).map(([key, inner]) => {
		return `${key}${inner.meta.required ? "" : "?"}: ${inner.toString()}`;
	}).join(", ")} }`;
});
defineMethod("union", ["list"], ({ list }, inline) => {
	const result = list.map(({ toString: format }) => format()).join(" | ");
	return inline ? `(${result})` : result;
});
defineMethod("intersect", ["list"], ({ list }) => {
	return `${list.map((inner) => inner.toString(true)).join(" & ")}`;
});
defineMethod("transform", [
	"inner",
	"callback",
	"preserve"
], ({ inner }, isInner) => inner.toString(isInner));
//#endregion
//#region lib/types/fold.js
/**
* Pure fold of a KerSor `events.jsonl` stream into the viewer's run view
* model. One `KersorRunView` accumulates every event of a single run; phases
* are buckets in first-appearance order so loop re-visits (KSearch cycles
* Select/Generate/Evaluate) each get their own bucket.
* @module @deepseek-ai/dsh-kersor-viewer
*/
function errorMessage(error) {
	if (typeof error === "string") return error;
	if (error && typeof error === "object" && typeof error.message === "string") return error.message;
}
function totalTokens(usage) {
	return usage && typeof usage === "object" && typeof usage.total_tokens === "number" ? usage.total_tokens : void 0;
}
function ensurePhase(view, title) {
	const existing = view.phases.at(-1);
	if (existing && existing.title === title) return existing;
	const phase = {
		title,
		index: view.phases.length,
		status: "running",
		calls: []
	};
	view.phases.push(phase);
	return phase;
}
function callBucket(view, event, kind) {
	const seq = typeof event.seq === "number" ? event.seq : -1;
	const callId = typeof event.call_id === "string" ? event.call_id : `${event.phase ?? ""}/${event.label ?? ""}/${seq}`;
	for (let i = view.phases.length - 1; i >= 0; i -= 1) {
		const bucket = view.phases[i];
		if (bucket === void 0 || bucket.title !== (event.phase ?? "")) continue;
		const row = bucket.calls.find((call) => call.callId === callId);
		if (row) return row;
	}
	const phase = ensurePhase(view, event.phase ?? "");
	const row = {
		seq,
		callId,
		kind,
		label: typeof event.label === "string" ? event.label : callId,
		status: "running"
	};
	phase.calls.push(row);
	view.totals.calls += 1;
	return row;
}
/** Fold one parsed event into the view. Mutates `view` in place. */
function foldEvent(view, event) {
	switch (event.type) {
		case "workflow.started":
			view.status = "running";
			view.startedTs = event.ts;
			return;
		case "phase.changed": {
			const title = typeof event.phase === "string" ? event.phase : "";
			const current = view.phases.at(-1);
			if (current && current.title !== title && current.status === "running") current.status = "completed";
			view.currentPhase = title;
			ensurePhase(view, title);
			return;
		}
		case "workflow.completed": {
			view.status = "completed";
			view.endedTs = event.ts;
			const tokens = totalTokens(event.usage);
			if (tokens !== void 0) view.totals.tokens = tokens;
			const lastPhase = view.phases.at(-1);
			if (lastPhase !== void 0) lastPhase.status = "completed";
			return;
		}
		case "workflow.failed": {
			view.status = "failed";
			view.endedTs = event.ts;
			view.error = errorMessage(event.error);
			const tokens = totalTokens(event.usage);
			if (tokens !== void 0) view.totals.tokens = tokens;
			const lastPhase = view.phases.at(-1);
			if (lastPhase !== void 0) lastPhase.status = "failed";
			return;
		}
		case "agent.queued":
		case "evaluation.queued": {
			const phase = ensurePhase(view, event.phase ?? "");
			const seq = typeof event.seq === "number" ? event.seq : -1;
			const callId = typeof event.call_id === "string" ? event.call_id : "";
			if (phase.calls.some((call) => call.callId === callId)) return;
			const row = {
				seq,
				callId,
				kind: event.type === "agent.queued" ? "agent" : "evaluation",
				label: typeof event.label === "string" ? event.label : callId,
				status: "queued"
			};
			phase.calls.push(row);
			view.totals.calls += 1;
			return;
		}
		case "agent.started":
		case "evaluation.started": {
			const row = callBucket(view, event, event.type === "agent.started" ? "agent" : "evaluation");
			if (!row) return;
			row.status = "running";
			row.startedTs = event.ts;
			return;
		}
		case "agent.completed":
		case "evaluation.completed": {
			const row = callBucket(view, event, event.type === "agent.completed" ? "agent" : "evaluation");
			if (!row) return;
			row.status = "completed";
			row.endedTs = event.ts;
			const tokens = totalTokens(event.usage);
			if (tokens !== void 0) {
				row.tokens = tokens;
				view.totals.tokens += tokens;
			}
			view.totals.completed += 1;
			return;
		}
		case "agent.failed":
		case "evaluation.failed": {
			const row = callBucket(view, event, event.type === "agent.failed" ? "agent" : "evaluation");
			if (!row) return;
			row.status = "failed";
			row.endedTs = event.ts;
			row.error = errorMessage(event.error);
			const tokens = totalTokens(event.usage);
			if (tokens !== void 0) {
				row.tokens = tokens;
				view.totals.tokens += tokens;
			}
			view.totals.failed += 1;
			return;
		}
		case "agent.transaction.rolled-back": {
			const row = callBucket(view, event, "agent");
			if (row) row.rolledBack = true;
			return;
		}
		default: return;
	}
}
/** Create an empty view for a discovered run directory. */
function createRunView(runId, runDir, sessionDir) {
	return {
		runId,
		runDir,
		sessionDir,
		status: "unknown",
		currentPhase: "",
		phases: [],
		totals: {
			calls: 0,
			completed: 0,
			failed: 0,
			tokens: 0
		}
	};
}
//#endregion
//#region lib/types/classic.js
/**
* Read-only adapter from the installed KerSor preset bridge to the viewer.
* KerSor's Python SessionStore remains the canonical parser for both v2 and
* legacy state; this module only launches the bounded projection and checks
* its wire shape.
* @module @deepseek-ai/dsh-kersor-viewer
*/
const execFileAsync = promisify(execFile);
function dshHome() {
	const configured = process.env.DSH_HOME?.trim();
	if (!configured) return path.join(homedir(), ".dsh");
	if (configured === "~") return homedir();
	return configured.startsWith("~/") ? path.join(homedir(), configured.slice(2)) : path.resolve(configured);
}
/** Path copied by the portable preset installer. */
function installedBridge() {
	return path.join(dshHome(), ".agent-presets", "kersor", "bin", "kersor_bridge.py");
}
function isClassicSession(value) {
	if (value === null || typeof value !== "object") return false;
	const row = value;
	return typeof row.session_id === "string" && typeof row.session_dir === "string" && (row.storage_kind === "v2" || row.storage_kind === "legacy") && (row.lifecycle === "active" || row.lifecycle === "completed" || row.lifecycle === "stalled" || row.lifecycle === "cancelled") && (row.health === "active" || row.health === "stale" || row.health === "needs_resume" || row.health === "terminal" || row.health === "unknown") && (row.status === "terminal-complete" || row.status === "terminal-stalled" || row.status === "terminal-cancelled" || row.status === "resumable" || row.status === "in-progress" || row.status === "pre-round-1") && Array.isArray(row.warnings) && row.warnings.every((item) => typeof item === "string");
}
/** Invoke the installed bridge without a shell and return a bounded snapshot. */
async function readClassicSessions(limit, staleAfterSeconds = 1800) {
	const bridge = installedBridge();
	try {
		await access(bridge);
	} catch {
		return { sessions: [] };
	}
	try {
		const { stdout } = await execFileAsync("python3", [
			bridge,
			"sessions",
			"--limit",
			String(limit),
			"--stale-after",
			String(staleAfterSeconds)
		], {
			encoding: "utf8",
			maxBuffer: 2 * 1024 * 1024,
			timeout: 1e4
		});
		const decoded = JSON.parse(stdout);
		if (!Array.isArray(decoded.sessions) || !decoded.sessions.every(isClassicSession)) return {
			sessions: [],
			warning: "KerSor bridge returned an invalid session inventory"
		};
		const warning = Array.isArray(decoded.warnings) && decoded.warnings.every((item) => typeof item === "string") && decoded.warnings.length > 0 ? decoded.warnings.join("; ") : void 0;
		return {
			sessions: decoded.sessions.slice(0, limit),
			...warning === void 0 ? {} : { warning }
		};
	} catch (error) {
		const code = typeof error === "object" && error !== null && "code" in error ? String(error.code) : void 0;
		return {
			sessions: [],
			warning: `KerSor session inventory unavailable${code === void 0 ? "" : ` (${code})`}`
		};
	}
}
//#endregion
//#region lib/types/scanner.js
/**
* Root-directory discovery of KerSor autonomous runs. A root is scanned for
* Session-v2 directories (`session-config.json` + `state.json`) that carry an
* `autonomous-runs/` child; each child directory is one run.
* @module @deepseek-ai/dsh-kersor-viewer
*/
/** Default roots scanned in addition to configured ones. */
const DEFAULT_KERSOR_ROOTS = [path.join(homedir(), ".local", "share", "kersor"), path.join(homedir(), "Agent4Kernel", "KerSor", ".kersor")];
async function configuredCheckout() {
	const fromEnvironment = process.env.KERSOR_ROOT?.trim();
	if (fromEnvironment) return path.resolve(expandHome(fromEnvironment));
	const dshHome = process.env.DSH_HOME?.trim();
	const pointer = path.join(dshHome ? expandHome(dshHome) : path.join(homedir(), ".dsh"), ".agent-presets", "kersor", ".local", "kersor-root");
	try {
		const recorded = (await readFile(pointer, "utf8")).trim();
		return recorded ? path.resolve(expandHome(recorded)) : void 0;
	} catch {
		return;
	}
}
function expandHome(value) {
	if (value === "~") return homedir();
	return value.startsWith("~/") ? path.join(homedir(), value.slice(2)) : value;
}
async function exists(entry) {
	try {
		await readdir(entry);
		return true;
	} catch {
		return false;
	}
}
async function isSessionV2(dir) {
	try {
		const entries = await readdir(dir, { withFileTypes: true });
		return entries.some((entry) => entry.isFile() && entry.name === "session-config.json") && entries.some((entry) => entry.isFile() && entry.name === "state.json");
	} catch {
		return false;
	}
}
async function readJson(file) {
	try {
		return JSON.parse(await (await import("node:fs/promises")).readFile(file, "utf8"));
	} catch {
		return;
	}
}
/** Scan one session directory's `autonomous-runs/` for run children. */
async function scanSession(sessionDir, root, into) {
	const runsDir = path.join(sessionDir, "autonomous-runs");
	let children;
	try {
		children = await readdir(runsDir);
	} catch {
		return;
	}
	for (const runId of children) {
		const runDir = path.join(runsDir, runId);
		if (!await exists(runDir)) continue;
		const summary = await readJson(path.join(runDir, ".runtime", "summary.json"));
		let discovery = "active";
		if (summary !== void 0) {
			const status = summary.workflow_status ?? summary.status;
			if (status === "completed" || status === "waiting") discovery = "completed";
			else if (status === "error" || status === "failed") discovery = "failed";
		}
		into.push({
			runId,
			runDir,
			sessionDir,
			root,
			discovery
		});
	}
}
/**
* Scan every root (deduplicated) for KerSor runs.
* @param roots - configured roots; defaults are appended when `includeDefaults`.
* @returns run refs; ordering is unspecified (the service sorts for display).
*/
async function scanRoots(roots, includeDefaults) {
	const checkout = includeDefaults ? await configuredCheckout() : void 0;
	const defaults = includeDefaults ? [...DEFAULT_KERSOR_ROOTS, ...checkout === void 0 ? [] : [path.join(checkout, ".kersor")]] : [];
	const all = [...new Set([...roots, ...defaults])];
	const found = [];
	for (const root of all) {
		const expanded = expandHome(root);
		let sessions;
		try {
			sessions = await readdir(expanded);
		} catch {
			continue;
		}
		for (const session of sessions) {
			const sessionDir = path.join(expanded, session);
			if (!await isSessionV2(sessionDir)) continue;
			await scanSession(sessionDir, expanded, found);
		}
	}
	return found;
}
//#endregion
//#region lib/types/tailer.js
/**
* Position-tracking tail of one KerSor `events.jsonl`. The writer appends one
* JSON record per flushed line, so a byte-offset reader with truncation
* detection is a complete live stream; `fs.watch` wakes the reader and a slow
* poll backs it up on platforms where watch events lag (macOS FSEvents).
* @module @deepseek-ai/dsh-kersor-viewer
*/
/** Live reader over one events.jsonl file. */
var EventsTailer = class {
	file;
	pollMs;
	onLines;
	onEnd;
	offset = 0;
	watcher;
	timer;
	reading = false;
	stopped = false;
	/**
	* @param file - absolute path to `events.jsonl`.
	* @param onLines - complete new lines (no trailing newline), in file order.
	* @param onEnd - optional callback when stop() completes.
	*/
	constructor(file, onLines, onEnd, options = {}) {
		this.file = file;
		this.onLines = onLines;
		this.onEnd = onEnd;
		this.pollMs = options.pollMs ?? 300;
	}
	/** Begin watching; the first drain reads any lines already present. */
	start() {
		if (this.stopped) return;
		this.watcher = watch(path.dirname(this.file), { persistent: false }, (_event, filename) => {
			if (filename === null || filename === path.basename(this.file)) this.drain();
		});
		this.watcher.on("error", () => {});
		this.timer = setInterval(() => {
			this.drain();
		}, this.pollMs);
		this.timer.unref();
		this.drain();
	}
	/** Stop watching and invoke `onEnd`. Safe to call twice. */
	stop() {
		if (this.stopped) return;
		this.stopped = true;
		this.watcher?.close();
		if (this.timer !== void 0) clearInterval(this.timer);
		this.onEnd?.();
	}
	/** Current byte offset (diagnostics and tests). */
	get byteOffset() {
		return this.offset;
	}
	/** Read newly appended complete lines; detect truncation and reset. */
	async drain() {
		if (this.reading || this.stopped) return;
		this.reading = true;
		try {
			let handle;
			try {
				handle = await open(this.file, "r");
			} catch {
				return;
			}
			try {
				const { size } = await handle.stat();
				if (size < this.offset) this.offset = 0;
				if (size === this.offset) return;
				const length = size - this.offset;
				const buffer = Buffer.alloc(length);
				const { bytesRead } = await handle.read(buffer, 0, length, this.offset);
				const chunk = buffer.subarray(0, bytesRead).toString("utf8");
				const lastNewline = chunk.lastIndexOf("\n");
				if (lastNewline === -1) return;
				this.offset += lastNewline + 1;
				const lines = chunk.slice(0, lastNewline).split("\n").filter((line) => line.length > 0);
				if (lines.length > 0) this.onLines(lines);
			} finally {
				await handle.close();
			}
		} catch {} finally {
			this.reading = false;
		}
	}
};
//#endregion
//#region lib/types/service.js
/**
* KerSor viewer host service: discovers run directories under configured
* KerSor roots, tails each active run's `events.jsonl`, folds events into the
* viewer view model, and pushes updates to every browser page through the
* forwarded `kersor/event` Host event.
* @module @deepseek-ai/dsh-kersor-viewer
*/
var __runInitializers = function(thisArg, initializers, value) {
	var useValue = arguments.length > 2;
	for (var i = 0; i < initializers.length; i++) value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
	return useValue ? value : void 0;
};
var __esDecorate = function(ctor, descriptorIn, decorators, contextIn, initializers, extraInitializers) {
	function accept(f) {
		if (f !== void 0 && typeof f !== "function") throw new TypeError("Function expected");
		return f;
	}
	var kind = contextIn.kind, key = kind === "getter" ? "get" : kind === "setter" ? "set" : "value";
	var target = !descriptorIn && ctor ? contextIn["static"] ? ctor : ctor.prototype : null;
	var descriptor = descriptorIn || (target ? Object.getOwnPropertyDescriptor(target, contextIn.name) : {});
	var _, done = false;
	for (var i = decorators.length - 1; i >= 0; i--) {
		var context = {};
		for (var p in contextIn) context[p] = p === "access" ? {} : contextIn[p];
		for (var p in contextIn.access) context.access[p] = contextIn.access[p];
		context.addInitializer = function(f) {
			if (done) throw new TypeError("Cannot add initializers after decoration has completed");
			extraInitializers.push(accept(f || null));
		};
		var result = (0, decorators[i])(kind === "accessor" ? {
			get: descriptor.get,
			set: descriptor.set
		} : descriptor[key], context);
		if (kind === "accessor") {
			if (result === void 0) continue;
			if (result === null || typeof result !== "object") throw new TypeError("Object expected");
			if (_ = accept(result.get)) descriptor.get = _;
			if (_ = accept(result.set)) descriptor.set = _;
			if (_ = accept(result.init)) initializers.unshift(_);
		} else if (_ = accept(result)) if (kind === "field") initializers.unshift(_);
		else descriptor[key] = _;
	}
	if (target) Object.defineProperty(target, contextIn.name, descriptor);
	done = true;
};
/**
* Host service: run inventory, live event folding, and browser push. Exposes
* `listRuns` and `runBacklog` remotes for panel open and reconnect.
*/
let KersorViewerService = (() => {
	let _classSuper = TypertRemoteService;
	let _instanceExtraInitializers = [];
	let _listRuns_decorators;
	let _listClassicSessions_decorators;
	let _runBacklog_decorators;
	return class KersorViewerService extends _classSuper {
		static {
			const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(_classSuper[Symbol.metadata] ?? null) : void 0;
			_listRuns_decorators = [Remote("listRuns")];
			_listClassicSessions_decorators = [Remote("listClassicSessions")];
			_runBacklog_decorators = [Remote("runBacklog")];
			__esDecorate(this, null, _listRuns_decorators, {
				kind: "method",
				name: "listRuns",
				static: false,
				private: false,
				access: {
					has: (obj) => "listRuns" in obj,
					get: (obj) => obj.listRuns
				},
				metadata: _metadata
			}, null, _instanceExtraInitializers);
			__esDecorate(this, null, _listClassicSessions_decorators, {
				kind: "method",
				name: "listClassicSessions",
				static: false,
				private: false,
				access: {
					has: (obj) => "listClassicSessions" in obj,
					get: (obj) => obj.listClassicSessions
				},
				metadata: _metadata
			}, null, _instanceExtraInitializers);
			__esDecorate(this, null, _runBacklog_decorators, {
				kind: "method",
				name: "runBacklog",
				static: false,
				private: false,
				access: {
					has: (obj) => "runBacklog" in obj,
					get: (obj) => obj.runBacklog
				},
				metadata: _metadata
			}, null, _instanceExtraInitializers);
			if (_metadata) Object.defineProperty(this, Symbol.metadata, {
				enumerable: true,
				configurable: true,
				writable: true,
				value: _metadata
			});
		}
		static Config = Schema.object({
			roots: Schema.array(Schema.string()).default([]),
			noDefaultRoots: Schema.boolean().default(false),
			scanIntervalMs: Schema.number().min(500).default(5e3),
			classicSessionLimit: Schema.number().step(1).min(0).max(100).default(20),
			classicStaleAfterSeconds: Schema.number().step(1).min(1).max(86400).default(1800)
		});
		rootCtx = __runInitializers(this, _instanceExtraInitializers);
		configuredRoots;
		includeDefaults;
		scanIntervalMs;
		classicSessionLimit;
		classicStaleAfterSeconds;
		tracked = /* @__PURE__ */ new Map();
		group;
		scanTimer;
		emittedRunsSignature = "";
		classicSnapshot = { sessions: [] };
		scanInFlight;
		/** Create the service under the Host composition. */
		constructor(ctx, config) {
			super(ctx, "kersorViewer");
			this.rootCtx = ctx;
			this.configuredRoots = config.roots ?? [];
			this.includeDefaults = !(config.noDefaultRoots ?? false);
			this.scanIntervalMs = config.scanIntervalMs ?? 5e3;
			this.classicSessionLimit = config.classicSessionLimit ?? 20;
			this.classicStaleAfterSeconds = config.classicStaleAfterSeconds ?? 1800;
		}
		/** Start discovery and tailing under the plugin's fiber once ready. */
		*[Service.init]() {
			yield () => {
				for (const tracked of this.tracked.values()) tracked.tailer?.stop();
				this.tracked.clear();
				if (this.scanTimer !== void 0) clearInterval(this.scanTimer);
				this.scanTimer = void 0;
				this.group?.dispose();
				this.group = void 0;
			};
			this.requireGroup().effect(() => {
				this.rescan();
				this.scanTimer = setInterval(() => {
					this.rescan();
				}, this.scanIntervalMs);
				this.scanTimer.unref();
				return () => {
					if (this.scanTimer !== void 0) clearInterval(this.scanTimer);
					this.scanTimer = void 0;
				};
			});
		}
		requireGroup() {
			this.group ??= this.rootCtx.plugin({
				name: "kersor-viewer-group",
				apply: () => {}
			});
			return this.group;
		}
		/** Inventory snapshot for the panel's run list. */
		listRuns() {
			return [...this.tracked.values()].map((tracked) => tracked.ref).sort((left, right) => rank(right) - rank(left) || right.runId.localeCompare(left.runId));
		}
		/** Recent classic and Session-v2 optimization summaries from KerSor stores. */
		listClassicSessions() {
			return this.classicSnapshot;
		}
		/** Full folded view of one run (panel open / reconnect backlog). */
		runBacklog(runDir) {
			return this.tracked.get(runDir)?.view;
		}
		/** Rescan roots; start and stop tailers to match discovery. */
		async rescan() {
			if (this.scanInFlight !== void 0) return this.scanInFlight;
			const current = this.performRescan();
			this.scanInFlight = current;
			try {
				await current;
			} finally {
				if (this.scanInFlight === current) this.scanInFlight = void 0;
			}
		}
		async performRescan() {
			const [found, classicSnapshot] = await Promise.all([scanRoots(this.configuredRoots, this.includeDefaults), this.classicSessionLimit === 0 ? Promise.resolve({ sessions: [] }) : readClassicSessions(this.classicSessionLimit, this.classicStaleAfterSeconds)]);
			this.classicSnapshot = classicSnapshot;
			const byRunDir = new Map(found.map((ref) => [ref.runDir, ref]));
			for (const [runDir, tracked] of this.tracked) {
				if (byRunDir.has(runDir)) continue;
				tracked.tailer?.stop();
				this.tracked.delete(runDir);
			}
			for (const ref of found) {
				const existing = this.tracked.get(ref.runDir);
				if (existing !== void 0) {
					if (existing.ref.discovery !== ref.discovery) {
						if (existing.ref.discovery !== "active" && ref.discovery === "active") continue;
						existing.ref = ref;
						if (ref.discovery !== "active") {
							existing.tailer?.stop();
							existing.tailer = void 0;
							existing.view.status = terminalStatus(ref);
							this.rootCtx.emit("kersor/event", {
								kind: "run",
								run: existing.view
							});
						} else this.attachTailer(existing);
					}
					continue;
				}
				const tracked = {
					ref,
					view: createRunView(ref.runId, ref.runDir, ref.sessionDir),
					tailer: void 0
				};
				this.tracked.set(ref.runDir, tracked);
				if (ref.discovery === "active") this.attachTailer(tracked);
				else this.backfillTerminated(tracked);
			}
			const signature = found.map((ref) => `${ref.runDir}:${ref.discovery}`).sort().join("|");
			if (signature !== this.emittedRunsSignature) {
				this.emittedRunsSignature = signature;
				this.rootCtx.emit("kersor/event", {
					kind: "runs",
					runs: this.listRuns()
				});
			}
		}
		/** Read a discovered-terminated run's full event log once (no tailer). */
		async backfillTerminated(tracked) {
			const { ref, view } = tracked;
			let text;
			try {
				text = await (await import("node:fs/promises")).readFile(`${ref.runDir}/.runtime/events.jsonl`, "utf8");
			} catch {
				return;
			}
			for (const line of text.split("\n")) {
				if (line.length === 0) continue;
				try {
					foldEvent(view, JSON.parse(line));
				} catch {}
			}
			if (view.status !== "completed" && view.status !== "failed") view.status = terminalStatus(ref);
			if (this.tracked.get(ref.runDir) !== tracked) return;
			this.rootCtx.emit("kersor/event", {
				kind: "run",
				run: view
			});
		}
		attachTailer(tracked) {
			if (tracked.tailer !== void 0) return;
			const { ref, view } = tracked;
			const tailer = new EventsTailer(`${ref.runDir}/.runtime/events.jsonl`, (lines) => {
				let mutated = false;
				for (const line of lines) {
					let event;
					try {
						event = JSON.parse(line);
					} catch {
						continue;
					}
					mutated = true;
					foldEvent(view, event);
				}
				if (mutated) this.rootCtx.emit("kersor/event", {
					kind: "run",
					run: view
				});
				if (view.status === "completed" || view.status === "failed") {
					tracked.ref = {
						...tracked.ref,
						discovery: view.status
					};
					tailer.stop();
				}
			}, () => {
				if (tracked.tailer === tailer) tracked.tailer = void 0;
			});
			tracked.tailer = tailer;
			tailer.start();
		}
	};
})();
function rank(ref) {
	if (ref.discovery === "active") return 2;
	if (ref.discovery === "failed") return 1;
	return 0;
}
function terminalStatus(ref) {
	return ref.discovery === "failed" ? "failed" : "completed";
}
//#endregion
export { KersorViewerService, KersorViewerService as default };
