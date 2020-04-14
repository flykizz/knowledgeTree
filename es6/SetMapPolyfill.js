var hasOwn = Object.prototype.hasOwnProperty;
var supportsCreate = typeof Object.create === "function"; // feature test for Object.create support
var supportsProto = { __proto__: [] } instanceof Array; // feature test for __proto__ support
var downLevel = !supportsCreate && !supportsProto;
var functionPrototype = Object.getPrototypeOf(Function);


var HashMap = {
  // create an object in dictionary mode (a.k.a. "slow" mode in v8)
  create: supportsCreate
    ? function () { return MakeDictionary(Object.create(null)); }
    : supportsProto
      ? function () { return MakeDictionary({ __proto__: null }); }
      : function () { return MakeDictionary({}); },
  has: downLevel
    ? function (map, key) { return hasOwn.call(map, key); }
    : function (map, key) { return key in map; },
  get: downLevel
    ? function (map, key) { return hasOwn.call(map, key) ? map[key] : undefined; }
    : function (map, key) { return map[key]; },
};

var usePolyfill = typeof process === "object" && process.env && process.env["REFLECT_METADATA_USE_MAP_POLYFILL"] === "true";
var _Map = !usePolyfill && typeof Map === "function" && typeof Map.prototype.entries === "function" ? Map : CreateMapPolyfill();
var _Set = !usePolyfill && typeof Set === "function" && typeof Set.prototype.entries === "function" ? Set : CreateSetPolyfill();
var _WeakMap = !usePolyfill && typeof WeakMap === "function" ? WeakMap : CreateWeakMapPolyfill();

// naive Map shim
function CreateMapPolyfill() {
  var cacheSentinel = {};
  var arraySentinel = [];
  var MapIterator = (function () {
    function MapIterator(keys, values, selector) {
      this._index = 0;
      this._keys = keys;
      this._values = values;
      this._selector = selector;
    }
    MapIterator.prototype["@@iterator"] = function () { return this; };
    MapIterator.prototype[iteratorSymbol] = function () { return this; };
    MapIterator.prototype.next = function () {
      var index = this._index;
      if (index >= 0 && index < this._keys.length) {
        var result = this._selector(this._keys[index], this._values[index]);
        if (index + 1 >= this._keys.length) {
          this._index = -1;
          this._keys = arraySentinel;
          this._values = arraySentinel;
        }
        else {
          this._index++;
        }
        return { value: result, done: false };
      }
      return { value: undefined, done: true };
    };
    MapIterator.prototype.throw = function (error) {
      if (this._index >= 0) {
        this._index = -1;
        this._keys = arraySentinel;
        this._values = arraySentinel;
      }
      throw error;
    };
    MapIterator.prototype.return = function (value) {
      if (this._index >= 0) {
        this._index = -1;
        this._keys = arraySentinel;
        this._values = arraySentinel;
      }
      return { value: value, done: true };
    };
    return MapIterator;
  }());
  return (function () {
    function Map() {
      this._keys = [];
      this._values = [];
      this._cacheKey = cacheSentinel;
      this._cacheIndex = -2;
    }
    Object.defineProperty(Map.prototype, "size", {
      get: function () { return this._keys.length; },
      enumerable: true,
      configurable: true
    });
    Map.prototype.has = function (key) { return this._find(key, /*insert*/ false) >= 0; };
    Map.prototype.get = function (key) {
      var index = this._find(key, /*insert*/ false);
      return index >= 0 ? this._values[index] : undefined;
    };
    Map.prototype.set = function (key, value) {
      var index = this._find(key, /*insert*/ true);
      this._values[index] = value;
      return this;
    };
    Map.prototype.delete = function (key) {
      var index = this._find(key, /*insert*/ false);
      if (index >= 0) {
        var size = this._keys.length;
        for (var i = index + 1; i < size; i++) {
          this._keys[i - 1] = this._keys[i];
          this._values[i - 1] = this._values[i];
        }
        this._keys.length--;
        this._values.length--;
        if (key === this._cacheKey) {
          this._cacheKey = cacheSentinel;
          this._cacheIndex = -2;
        }
        return true;
      }
      return false;
    };
    Map.prototype.clear = function () {
      this._keys.length = 0;
      this._values.length = 0;
      this._cacheKey = cacheSentinel;
      this._cacheIndex = -2;
    };
    Map.prototype.keys = function () { return new MapIterator(this._keys, this._values, getKey); };
    Map.prototype.values = function () { return new MapIterator(this._keys, this._values, getValue); };
    Map.prototype.entries = function () { return new MapIterator(this._keys, this._values, getEntry); };
    Map.prototype["@@iterator"] = function () { return this.entries(); };
    Map.prototype[iteratorSymbol] = function () { return this.entries(); };
    Map.prototype._find = function (key, insert) {
      if (this._cacheKey !== key) {
        this._cacheIndex = this._keys.indexOf(this._cacheKey = key);
      }
      if (this._cacheIndex < 0 && insert) {
        this._cacheIndex = this._keys.length;
        this._keys.push(key);
        this._values.push(undefined);
      }
      return this._cacheIndex;
    };
    return Map;
  }());
  function getKey(key, _) {
    return key;
  }
  function getValue(_, value) {
    return value;
  }
  function getEntry(key, value) {
    return [key, value];
  }
}
// naive Set shim
function CreateSetPolyfill() {
  return (function () {
    function Set() {
      this._map = new _Map();
    }
    Object.defineProperty(Set.prototype, "size", {
      get: function () { return this._map.size; },
      enumerable: true,
      configurable: true
    });
    Set.prototype.has = function (value) { return this._map.has(value); };
    Set.prototype.add = function (value) { return this._map.set(value, value), this; };
    Set.prototype.delete = function (value) { return this._map.delete(value); };
    Set.prototype.clear = function () { this._map.clear(); };
    Set.prototype.keys = function () { return this._map.keys(); };
    Set.prototype.values = function () { return this._map.values(); };
    Set.prototype.entries = function () { return this._map.entries(); };
    Set.prototype["@@iterator"] = function () { return this.keys(); };
    Set.prototype[iteratorSymbol] = function () { return this.keys(); };
    return Set;
  }());
}
// naive WeakMap shim
function CreateWeakMapPolyfill() {
  var UUID_SIZE = 16;
  var keys = HashMap.create();
  var rootKey = CreateUniqueKey();
  return (function () {
    function WeakMap() {
      this._key = CreateUniqueKey();
    }
    WeakMap.prototype.has = function (target) {
      var table = GetOrCreateWeakMapTable(target, /*create*/ false);
      return table !== undefined ? HashMap.has(table, this._key) : false;
    };
    WeakMap.prototype.get = function (target) {
      var table = GetOrCreateWeakMapTable(target, /*create*/ false);
      return table !== undefined ? HashMap.get(table, this._key) : undefined;
    };
    WeakMap.prototype.set = function (target, value) {
      var table = GetOrCreateWeakMapTable(target, /*create*/ true);
      table[this._key] = value;
      return this;
    };
    WeakMap.prototype.delete = function (target) {
      var table = GetOrCreateWeakMapTable(target, /*create*/ false);
      return table !== undefined ? delete table[this._key] : false;
    };
    WeakMap.prototype.clear = function () {
      // NOTE: not a real clear, just makes the previous data unreachable
      this._key = CreateUniqueKey();
    };
    return WeakMap;
  }());
  function CreateUniqueKey() {
    var key;
    do
      key = "@@WeakMap@@" + CreateUUID();
    while (HashMap.has(keys, key));
    keys[key] = true;
    return key;
  }
  function GetOrCreateWeakMapTable(target, create) {
    if (!hasOwn.call(target, rootKey)) {
      if (!create)
        return undefined;
      Object.defineProperty(target, rootKey, { value: HashMap.create() });
    }
    return target[rootKey];
  }
  function FillRandomBytes(buffer, size) {
    for (var i = 0; i < size; ++i)
      buffer[i] = Math.random() * 0xff | 0;
    return buffer;
  }
  function GenRandomBytes(size) {
    if (typeof Uint8Array === "function") {
      if (typeof crypto !== "undefined")
        return crypto.getRandomValues(new Uint8Array(size));
      if (typeof msCrypto !== "undefined")
        return msCrypto.getRandomValues(new Uint8Array(size));
      return FillRandomBytes(new Uint8Array(size), size);
    }
    return FillRandomBytes(new Array(size), size);
  }
  function CreateUUID() {
    var data = GenRandomBytes(UUID_SIZE);
    // mark as random - RFC 4122 § 4.4
    data[6] = data[6] & 0x4f | 0x40;
    data[8] = data[8] & 0xbf | 0x80;
    var result = "";
    for (var offset = 0; offset < UUID_SIZE; ++offset) {
      var byte = data[offset];
      if (offset === 4 || offset === 6 || offset === 8)
        result += "-";
      if (byte < 16)
        result += "0";
      result += byte.toString(16).toLowerCase();
    }
    return result;
  }
}
// uses a heuristic used by v8 and chakra to force an object into dictionary mode.
function MakeDictionary(obj) {
  obj.__ = undefined;
  delete obj.__;
  return obj;
}