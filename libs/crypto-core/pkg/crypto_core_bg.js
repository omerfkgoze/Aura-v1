let wasm;
export function __wbg_set_wasm(val) {
    wasm = val;
}


function addToExternrefTable0(obj) {
    const idx = wasm.__externref_table_alloc();
    wasm.__wbindgen_export_2.set(idx, obj);
    return idx;
}

function handleError(f, args) {
    try {
        return f.apply(this, args);
    } catch (e) {
        const idx = addToExternrefTable0(e);
        wasm.__wbindgen_exn_store(idx);
    }
}

let cachedUint8ArrayMemory0 = null;

function getUint8ArrayMemory0() {
    if (cachedUint8ArrayMemory0 === null || cachedUint8ArrayMemory0.byteLength === 0) {
        cachedUint8ArrayMemory0 = new Uint8Array(wasm.memory.buffer);
    }
    return cachedUint8ArrayMemory0;
}

function getArrayU8FromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    return getUint8ArrayMemory0().subarray(ptr / 1, ptr / 1 + len);
}

const lTextDecoder = typeof TextDecoder === 'undefined' ? (0, module.require)('util').TextDecoder : TextDecoder;

let cachedTextDecoder = new lTextDecoder('utf-8', { ignoreBOM: true, fatal: true });

cachedTextDecoder.decode();

const MAX_SAFARI_DECODE_BYTES = 2146435072;
let numBytesDecoded = 0;
function decodeText(ptr, len) {
    numBytesDecoded += len;
    if (numBytesDecoded >= MAX_SAFARI_DECODE_BYTES) {
        cachedTextDecoder = new lTextDecoder('utf-8', { ignoreBOM: true, fatal: true });
        cachedTextDecoder.decode();
        numBytesDecoded = len;
    }
    return cachedTextDecoder.decode(getUint8ArrayMemory0().subarray(ptr, ptr + len));
}

function getStringFromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    return decodeText(ptr, len);
}

function isLikeNone(x) {
    return x === undefined || x === null;
}

const CLOSURE_DTORS = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(state => {
    wasm.__wbindgen_export_3.get(state.dtor)(state.a, state.b)
});

function makeMutClosure(arg0, arg1, dtor, f) {
    const state = { a: arg0, b: arg1, cnt: 1, dtor };
    const real = (...args) => {
        // First up with a closure we increment the internal reference
        // count. This ensures that the Rust closure environment won't
        // be deallocated while we're invoking it.
        state.cnt++;
        const a = state.a;
        state.a = 0;
        try {
            return f(a, state.b, ...args);
        } finally {
            if (--state.cnt === 0) {
                wasm.__wbindgen_export_3.get(state.dtor)(a, state.b);
                CLOSURE_DTORS.unregister(state);
            } else {
                state.a = a;
            }
        }
    };
    real.original = state;
    CLOSURE_DTORS.register(real, state, state);
    return real;
}

function debugString(val) {
    // primitive types
    const type = typeof val;
    if (type == 'number' || type == 'boolean' || val == null) {
        return  `${val}`;
    }
    if (type == 'string') {
        return `"${val}"`;
    }
    if (type == 'symbol') {
        const description = val.description;
        if (description == null) {
            return 'Symbol';
        } else {
            return `Symbol(${description})`;
        }
    }
    if (type == 'function') {
        const name = val.name;
        if (typeof name == 'string' && name.length > 0) {
            return `Function(${name})`;
        } else {
            return 'Function';
        }
    }
    // objects
    if (Array.isArray(val)) {
        const length = val.length;
        let debug = '[';
        if (length > 0) {
            debug += debugString(val[0]);
        }
        for(let i = 1; i < length; i++) {
            debug += ', ' + debugString(val[i]);
        }
        debug += ']';
        return debug;
    }
    // Test for built-in
    const builtInMatches = /\[object ([^\]]+)\]/.exec(toString.call(val));
    let className;
    if (builtInMatches && builtInMatches.length > 1) {
        className = builtInMatches[1];
    } else {
        // Failed to match the standard '[object ClassName]'
        return toString.call(val);
    }
    if (className == 'Object') {
        // we're a user defined class or Object
        // JSON.stringify avoids problems with cycles, and is generally much
        // easier than looping through ownProperties of `val`.
        try {
            return 'Object(' + JSON.stringify(val) + ')';
        } catch (_) {
            return 'Object';
        }
    }
    // errors
    if (val instanceof Error) {
        return `${val.name}: ${val.message}\n${val.stack}`;
    }
    // TODO we could test for more things here, like `Set`s and `Map`s.
    return className;
}

let WASM_VECTOR_LEN = 0;

const lTextEncoder = typeof TextEncoder === 'undefined' ? (0, module.require)('util').TextEncoder : TextEncoder;

const cachedTextEncoder = new lTextEncoder('utf-8');

const encodeString = (typeof cachedTextEncoder.encodeInto === 'function'
    ? function (arg, view) {
    return cachedTextEncoder.encodeInto(arg, view);
}
    : function (arg, view) {
    const buf = cachedTextEncoder.encode(arg);
    view.set(buf);
    return {
        read: arg.length,
        written: buf.length
    };
});

function passStringToWasm0(arg, malloc, realloc) {

    if (realloc === undefined) {
        const buf = cachedTextEncoder.encode(arg);
        const ptr = malloc(buf.length, 1) >>> 0;
        getUint8ArrayMemory0().subarray(ptr, ptr + buf.length).set(buf);
        WASM_VECTOR_LEN = buf.length;
        return ptr;
    }

    let len = arg.length;
    let ptr = malloc(len, 1) >>> 0;

    const mem = getUint8ArrayMemory0();

    let offset = 0;

    for (; offset < len; offset++) {
        const code = arg.charCodeAt(offset);
        if (code > 0x7F) break;
        mem[ptr + offset] = code;
    }

    if (offset !== len) {
        if (offset !== 0) {
            arg = arg.slice(offset);
        }
        ptr = realloc(ptr, len, len = offset + arg.length * 3, 1) >>> 0;
        const view = getUint8ArrayMemory0().subarray(ptr + offset, ptr + len);
        const ret = encodeString(arg, view);

        offset += ret.written;
        ptr = realloc(ptr, len, offset, 1) >>> 0;
    }

    WASM_VECTOR_LEN = offset;
    return ptr;
}

let cachedDataViewMemory0 = null;

function getDataViewMemory0() {
    if (cachedDataViewMemory0 === null || cachedDataViewMemory0.buffer.detached === true || (cachedDataViewMemory0.buffer.detached === undefined && cachedDataViewMemory0.buffer !== wasm.memory.buffer)) {
        cachedDataViewMemory0 = new DataView(wasm.memory.buffer);
    }
    return cachedDataViewMemory0;
}

function _assertClass(instance, klass) {
    if (!(instance instanceof klass)) {
        throw new Error(`expected instance of ${klass.name}`);
    }
}

function takeFromExternrefTable0(idx) {
    const value = wasm.__wbindgen_export_2.get(idx);
    wasm.__externref_table_dealloc(idx);
    return value;
}

function passArrayJsValueToWasm0(array, malloc) {
    const ptr = malloc(array.length * 4, 4) >>> 0;
    for (let i = 0; i < array.length; i++) {
        const add = addToExternrefTable0(array[i]);
        getDataViewMemory0().setUint32(ptr + 4 * i, add, true);
    }
    WASM_VECTOR_LEN = array.length;
    return ptr;
}

function passArray8ToWasm0(arg, malloc) {
    const ptr = malloc(arg.length * 1, 1) >>> 0;
    getUint8ArrayMemory0().set(arg, ptr / 1);
    WASM_VECTOR_LEN = arg.length;
    return ptr;
}
/**
 * WASM initialization with integrity check
 * @returns {ModuleIntegrity}
 */
export function init_crypto_core_with_verification() {
    const ret = wasm.init_crypto_core_with_verification();
    if (ret[2]) {
        throw takeFromExternrefTable0(ret[1]);
    }
    return ModuleIntegrity.__wrap(ret[0]);
}

/**
 * Export version information
 * @returns {string}
 */
export function get_crypto_core_version() {
    let deferred1_0;
    let deferred1_1;
    try {
        const ret = wasm.get_crypto_core_version();
        deferred1_0 = ret[0];
        deferred1_1 = ret[1];
        return getStringFromWasm0(ret[0], ret[1]);
    } finally {
        wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
    }
}

/**
 * Export build information
 * @returns {string}
 */
export function get_build_info() {
    let deferred1_0;
    let deferred1_1;
    try {
        const ret = wasm.get_build_info();
        deferred1_0 = ret[0];
        deferred1_1 = ret[1];
        return getStringFromWasm0(ret[0], ret[1]);
    } finally {
        wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
    }
}

function getArrayJsValueFromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    const mem = getDataViewMemory0();
    const result = [];
    for (let i = ptr; i < ptr + 4 * len; i += 4) {
        result.push(wasm.__wbindgen_export_2.get(mem.getUint32(i, true)));
    }
    wasm.__externref_drop_slice(ptr, len);
    return result;
}
/**
 * @param {string} user_id
 * @param {bigint} timestamp
 * @returns {Uint8Array}
 */
export function create_cycle_data_aad(user_id, timestamp) {
    const ptr0 = passStringToWasm0(user_id, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.create_cycle_data_aad(ptr0, len0, timestamp);
    var v2 = getArrayU8FromWasm0(ret[0], ret[1]).slice();
    wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
    return v2;
}

/**
 * @param {string} user_id
 * @param {string} share_token
 * @returns {Uint8Array}
 */
export function create_healthcare_share_aad(user_id, share_token) {
    const ptr0 = passStringToWasm0(user_id, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len0 = WASM_VECTOR_LEN;
    const ptr1 = passStringToWasm0(share_token, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len1 = WASM_VECTOR_LEN;
    const ret = wasm.create_healthcare_share_aad(ptr0, len0, ptr1, len1);
    var v3 = getArrayU8FromWasm0(ret[0], ret[1]).slice();
    wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
    return v3;
}

/**
 * @param {string} path_str
 * @returns {DerivationPath}
 */
export function create_derivation_path(path_str) {
    const ptr0 = passStringToWasm0(path_str, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.create_derivation_path(ptr0, len0);
    if (ret[2]) {
        throw takeFromExternrefTable0(ret[1]);
    }
    return DerivationPath.__wrap(ret[0]);
}

/**
 * @param {Uint8Array} seed
 * @returns {ExtendedKey}
 */
export function create_master_key_from_seed(seed) {
    const ptr0 = passArray8ToWasm0(seed, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.create_master_key_from_seed(ptr0, len0);
    if (ret[2]) {
        throw takeFromExternrefTable0(ret[1]);
    }
    return ExtendedKey.__wrap(ret[0]);
}

/**
 * @param {number} version
 * @param {number} algorithm
 * @param {Uint8Array} salt
 * @param {Uint8Array} nonce
 * @param {Uint8Array} encrypted_data
 * @param {Uint8Array} tag
 * @param {Uint8Array} aad_hash
 * @returns {CryptoEnvelope}
 */
export function create_envelope_with_metadata(version, algorithm, salt, nonce, encrypted_data, tag, aad_hash) {
    const ptr0 = passArray8ToWasm0(salt, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ptr1 = passArray8ToWasm0(nonce, wasm.__wbindgen_malloc);
    const len1 = WASM_VECTOR_LEN;
    const ptr2 = passArray8ToWasm0(encrypted_data, wasm.__wbindgen_malloc);
    const len2 = WASM_VECTOR_LEN;
    const ptr3 = passArray8ToWasm0(tag, wasm.__wbindgen_malloc);
    const len3 = WASM_VECTOR_LEN;
    const ptr4 = passArray8ToWasm0(aad_hash, wasm.__wbindgen_malloc);
    const len4 = WASM_VECTOR_LEN;
    const ret = wasm.create_envelope_with_metadata(version, algorithm, ptr0, len0, ptr1, len1, ptr2, len2, ptr3, len3, ptr4, len4);
    if (ret[2]) {
        throw takeFromExternrefTable0(ret[1]);
    }
    return CryptoEnvelope.__wrap(ret[0]);
}

/**
 * @param {Uint8Array} encrypted_data
 * @param {Uint8Array} nonce
 * @param {Uint8Array} tag
 * @returns {CryptoEnvelope}
 */
export function create_envelope(encrypted_data, nonce, tag) {
    const ptr0 = passArray8ToWasm0(encrypted_data, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ptr1 = passArray8ToWasm0(nonce, wasm.__wbindgen_malloc);
    const len1 = WASM_VECTOR_LEN;
    const ptr2 = passArray8ToWasm0(tag, wasm.__wbindgen_malloc);
    const len2 = WASM_VECTOR_LEN;
    const ret = wasm.create_envelope(ptr0, len0, ptr1, len1, ptr2, len2);
    return CryptoEnvelope.__wrap(ret);
}

/**
 * @param {CryptoEnvelope} envelope
 * @returns {string}
 */
export function serialize_envelope(envelope) {
    let deferred2_0;
    let deferred2_1;
    try {
        _assertClass(envelope, CryptoEnvelope);
        const ret = wasm.serialize_envelope(envelope.__wbg_ptr);
        var ptr1 = ret[0];
        var len1 = ret[1];
        if (ret[3]) {
            ptr1 = 0; len1 = 0;
            throw takeFromExternrefTable0(ret[2]);
        }
        deferred2_0 = ptr1;
        deferred2_1 = len1;
        return getStringFromWasm0(ptr1, len1);
    } finally {
        wasm.__wbindgen_free(deferred2_0, deferred2_1, 1);
    }
}

/**
 * @param {string} json_str
 * @returns {CryptoEnvelope}
 */
export function deserialize_envelope(json_str) {
    const ptr0 = passStringToWasm0(json_str, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.deserialize_envelope(ptr0, len0);
    if (ret[2]) {
        throw takeFromExternrefTable0(ret[1]);
    }
    return CryptoEnvelope.__wrap(ret[0]);
}

/**
 * Security hardening and attack mitigation module
 * Implements constant-time operations, side-channel attack prevention,
 * and secure random number generation
 * Constant-time comparison to prevent timing attacks
 * @param {Uint8Array} a
 * @param {Uint8Array} b
 * @returns {boolean}
 */
export function constant_time_compare(a, b) {
    const ptr0 = passArray8ToWasm0(a, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ptr1 = passArray8ToWasm0(b, wasm.__wbindgen_malloc);
    const len1 = WASM_VECTOR_LEN;
    const ret = wasm.constant_time_compare(ptr0, len0, ptr1, len1);
    return ret !== 0;
}

/**
 * @param {DeviceClass} _class
 * @returns {number}
 */
export function get_memory_limit_for_class(_class) {
    const ret = wasm.get_memory_limit_for_class(_class);
    return ret >>> 0;
}

/**
 * @param {DeviceClass} _class
 * @returns {number}
 */
export function get_argon2_iterations_for_class(_class) {
    const ret = wasm.get_argon2_iterations_for_class(_class);
    return ret >>> 0;
}

/**
 * @param {DeviceClass} _class
 * @returns {number}
 */
export function get_argon2_memory_for_class(_class) {
    const ret = wasm.get_argon2_memory_for_class(_class);
    return ret >>> 0;
}

/**
 * @param {DeviceClass} _class
 * @returns {number}
 */
export function get_argon2_parallelism_for_class(_class) {
    const ret = wasm.get_argon2_parallelism_for_class(_class);
    return ret >>> 0;
}

export function init() {
    wasm.init();
}

/**
 * @returns {string}
 */
export function test_crypto_core() {
    let deferred1_0;
    let deferred1_1;
    try {
        const ret = wasm.test_crypto_core();
        deferred1_0 = ret[0];
        deferred1_1 = ret[1];
        return getStringFromWasm0(ret[0], ret[1]);
    } finally {
        wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
    }
}

/**
 * @returns {CryptoKey}
 */
export function generate_encryption_key() {
    const ret = wasm.generate_encryption_key();
    if (ret[2]) {
        throw takeFromExternrefTable0(ret[1]);
    }
    return CryptoKey.__wrap(ret[0]);
}

/**
 * @returns {CryptoKey}
 */
export function generate_signing_key() {
    const ret = wasm.generate_signing_key();
    if (ret[2]) {
        throw takeFromExternrefTable0(ret[1]);
    }
    return CryptoKey.__wrap(ret[0]);
}

function __wbg_adapter_32(arg0, arg1, arg2) {
    wasm.closure169_externref_shim(arg0, arg1, arg2);
}

function __wbg_adapter_526(arg0, arg1, arg2, arg3) {
    wasm.closure197_externref_shim(arg0, arg1, arg2, arg3);
}

/**
 * @enum {1 | 2}
 */
export const CryptoAlgorithm = Object.freeze({
    AES256GCM: 1, "1": "AES256GCM",
    ChaCha20Poly1305: 2, "2": "ChaCha20Poly1305",
});
/**
 * @enum {0 | 1 | 2 | 3}
 */
export const DataCategory = Object.freeze({
    CycleData: 0, "0": "CycleData",
    Preferences: 1, "1": "Preferences",
    HealthcareSharing: 2, "2": "HealthcareSharing",
    DeviceSync: 3, "3": "DeviceSync",
});
/**
 * @enum {0 | 1 | 2 | 3}
 */
export const DeviceClass = Object.freeze({
    MobileHigh: 0, "0": "MobileHigh",
    MobileLow: 1, "1": "MobileLow",
    WebStandard: 2, "2": "WebStandard",
    WebLimited: 3, "3": "WebLimited",
});
/**
 * Device trust status and synchronization state
 * @enum {0 | 1 | 2 | 3 | 4}
 */
export const DeviceStatus = Object.freeze({
    Unknown: 0, "0": "Unknown",
    Pending: 1, "1": "Pending",
    Trusted: 2, "2": "Trusted",
    Revoked: 3, "3": "Revoked",
    Expired: 4, "4": "Expired",
});
/**
 * @enum {1 | 2}
 */
export const EnvelopeVersion = Object.freeze({
    V1: 1, "1": "V1",
    V2: 2, "2": "V2",
});
/**
 * Error types for key rotation operations
 * @enum {0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9}
 */
export const KeyRotationError = Object.freeze({
    InvalidVersion: 0, "0": "InvalidVersion",
    KeyNotFound: 1, "1": "KeyNotFound",
    MigrationInProgress: 2, "2": "MigrationInProgress",
    PolicyViolation: 3, "3": "PolicyViolation",
    CryptoError: 4, "4": "CryptoError",
    StorageError: 5, "5": "StorageError",
    NetworkError: 6, "6": "NetworkError",
    SecurityEventProcessingError: 7, "7": "SecurityEventProcessingError",
    InvalidRotationTiming: 8, "8": "InvalidRotationTiming",
    UserPreferencesNotFound: 9, "9": "UserPreferencesNotFound",
});
/**
 * Key lifecycle status enumeration
 * @enum {0 | 1 | 2 | 3 | 4}
 */
export const KeyStatus = Object.freeze({
    Active: 0, "0": "Active",
    Deprecated: 1, "1": "Deprecated",
    Revoked: 2, "2": "Revoked",
    Migrating: 3, "3": "Migrating",
    Expired: 4, "4": "Expired",
});
/**
 * Recovery validation levels for emergency procedures
 * @enum {0 | 1 | 2 | 3}
 */
export const RecoveryValidationLevel = Object.freeze({
    Basic: 0, "0": "Basic",
    Standard: 1, "1": "Standard",
    Enhanced: 2, "2": "Enhanced",
    Emergency: 3, "3": "Emergency",
});
/**
 * Result type for key rotation operations
 * @enum {0 | 1 | 2 | 3 | 4}
 */
export const RotationResult = Object.freeze({
    Success: 0, "0": "Success",
    Failed: 1, "1": "Failed",
    Pending: 2, "2": "Pending",
    RequiresUserConfirmation: 3, "3": "RequiresUserConfirmation",
    PolicyViolation: 4, "4": "PolicyViolation",
});
/**
 * User timing preferences for rotation operations
 * @enum {0 | 1 | 2 | 3 | 4}
 */
export const RotationTiming = Object.freeze({
    Immediate: 0, "0": "Immediate",
    LowUsage: 1, "1": "LowUsage",
    Scheduled: 2, "2": "Scheduled",
    UserControlled: 3, "3": "UserControlled",
    Background: 4, "4": "Background",
});
/**
 * Rotation trigger types for policy-based scheduling
 * @enum {0 | 1 | 2 | 3 | 4}
 */
export const RotationTrigger = Object.freeze({
    TimeBased: 0, "0": "TimeBased",
    UsageBased: 1, "1": "UsageBased",
    EventBased: 2, "2": "EventBased",
    Manual: 3, "3": "Manual",
    Emergency: 4, "4": "Emergency",
});
/**
 * @enum {0 | 1 | 2 | 3 | 4}
 */
export const SecureStoragePlatform = Object.freeze({
    IOSKeychain: 0, "0": "IOSKeychain",
    AndroidKeystore: 1, "1": "AndroidKeystore",
    AndroidStrongBox: 2, "2": "AndroidStrongBox",
    WebCryptoAPI: 3, "3": "WebCryptoAPI",
    WebIndexedDB: 4, "4": "WebIndexedDB",
});
/**
 * Security event types that can trigger emergency key rotations
 * @enum {0 | 1 | 2 | 3 | 4 | 5 | 6}
 */
export const SecurityEventType = Object.freeze({
    DeviceCompromise: 0, "0": "DeviceCompromise",
    UnauthorizedAccess: 1, "1": "UnauthorizedAccess",
    SuspiciousActivity: 2, "2": "SuspiciousActivity",
    DataBreach: 3, "3": "DataBreach",
    NetworkIntrusion: 4, "4": "NetworkIntrusion",
    MalwareDetected: 5, "5": "MalwareDetected",
    UserReported: 6, "6": "UserReported",
});
/**
 * BIP39 wordlist languages supported for recovery phrases
 * @enum {0 | 1 | 2 | 3 | 4 | 5}
 */
export const WordlistLanguage = Object.freeze({
    English: 0, "0": "English",
    Japanese: 1, "1": "Japanese",
    Korean: 2, "2": "Korean",
    Spanish: 3, "3": "Spanish",
    Chinese: 4, "4": "Chinese",
    French: 5, "5": "French",
});

const AADValidatorFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_aadvalidator_free(ptr >>> 0, 1));

export class AADValidator {

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        AADValidatorFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_aadvalidator_free(ptr, 0);
    }
    /**
     * @param {string} context
     */
    constructor(context) {
        const ptr0 = passStringToWasm0(context, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.aadvalidator_new(ptr0, len0);
        this.__wbg_ptr = ret >>> 0;
        AADValidatorFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
    /**
     * @param {string} user_id
     */
    set_user_id(user_id) {
        const ptr0 = passStringToWasm0(user_id, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.aadvalidator_set_user_id(this.__wbg_ptr, ptr0, len0);
    }
    /**
     * @param {bigint} timestamp
     */
    set_timestamp(timestamp) {
        wasm.aadvalidator_set_timestamp(this.__wbg_ptr, timestamp);
    }
    /**
     * @returns {Uint8Array}
     */
    generate_aad() {
        const ret = wasm.aadvalidator_generate_aad(this.__wbg_ptr);
        var v1 = getArrayU8FromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
        return v1;
    }
    /**
     * @param {Uint8Array} provided_aad
     * @returns {boolean}
     */
    validate_aad(provided_aad) {
        const ptr0 = passArray8ToWasm0(provided_aad, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.aadvalidator_validate_aad(this.__wbg_ptr, ptr0, len0);
        return ret !== 0;
    }
    /**
     * @returns {Uint8Array | undefined}
     */
    get cached_hash() {
        const ret = wasm.aadvalidator_cached_hash(this.__wbg_ptr);
        let v1;
        if (ret[0] !== 0) {
            v1 = getArrayU8FromWasm0(ret[0], ret[1]).slice();
            wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
        }
        return v1;
    }
    clear_cache() {
        wasm.aadvalidator_clear_cache(this.__wbg_ptr);
    }
    /**
     * @returns {string}
     */
    get context() {
        let deferred1_0;
        let deferred1_1;
        try {
            const ret = wasm.aadvalidator_context(this.__wbg_ptr);
            deferred1_0 = ret[0];
            deferred1_1 = ret[1];
            return getStringFromWasm0(ret[0], ret[1]);
        } finally {
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }
}

const Argon2ParamsFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_argon2params_free(ptr >>> 0, 1));

export class Argon2Params {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(Argon2Params.prototype);
        obj.__wbg_ptr = ptr;
        Argon2ParamsFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        Argon2ParamsFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_argon2params_free(ptr, 0);
    }
    /**
     * @param {number} memory_kb
     * @param {number} iterations
     * @param {number} parallelism
     * @param {number} salt_length
     * @param {number} key_length
     */
    constructor(memory_kb, iterations, parallelism, salt_length, key_length) {
        const ret = wasm.argon2params_new(memory_kb, iterations, parallelism, salt_length, key_length);
        this.__wbg_ptr = ret >>> 0;
        Argon2ParamsFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
    /**
     * @returns {number}
     */
    get memory_kb() {
        const ret = wasm.argon2params_memory_kb(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * @returns {number}
     */
    get iterations() {
        const ret = wasm.argon2params_iterations(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * @returns {number}
     */
    get parallelism() {
        const ret = wasm.argon2params_parallelism(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * @returns {number}
     */
    get salt_length() {
        const ret = wasm.argon2params_salt_length(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * @returns {number}
     */
    get key_length() {
        const ret = wasm.argon2params_key_length(this.__wbg_ptr);
        return ret >>> 0;
    }
}

const AsyncCryptoFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_asynccrypto_free(ptr >>> 0, 1));
/**
 * Async crypto operations with Promise support
 */
export class AsyncCrypto {

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        AsyncCryptoFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_asynccrypto_free(ptr, 0);
    }
    /**
     * Async envelope creation returning a Promise
     * @param {Uint8Array} encrypted_data
     * @param {Uint8Array} nonce
     * @param {Uint8Array} tag
     * @returns {Promise<any>}
     */
    static create_envelope_async(encrypted_data, nonce, tag) {
        const ptr0 = passArray8ToWasm0(encrypted_data, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passArray8ToWasm0(nonce, wasm.__wbindgen_malloc);
        const len1 = WASM_VECTOR_LEN;
        const ptr2 = passArray8ToWasm0(tag, wasm.__wbindgen_malloc);
        const len2 = WASM_VECTOR_LEN;
        const ret = wasm.asynccrypto_create_envelope_async(ptr0, len0, ptr1, len1, ptr2, len2);
        return ret;
    }
    /**
     * Async key generation returning a Promise
     * @param {string} key_type
     * @returns {Promise<any>}
     */
    static generate_key_async(key_type) {
        const ptr0 = passStringToWasm0(key_type, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.asynccrypto_generate_key_async(ptr0, len0);
        return ret;
    }
    /**
     * Async AAD generation returning a Promise
     * @param {string} context
     * @param {string} user_id
     * @param {string} timestamp
     * @returns {Promise<any>}
     */
    static create_aad_async(context, user_id, timestamp) {
        const ptr0 = passStringToWasm0(context, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passStringToWasm0(user_id, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len1 = WASM_VECTOR_LEN;
        const ptr2 = passStringToWasm0(timestamp, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len2 = WASM_VECTOR_LEN;
        const ret = wasm.asynccrypto_create_aad_async(ptr0, len0, ptr1, len1, ptr2, len2);
        return ret;
    }
}

const AsyncCryptoOperationFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_asynccryptooperation_free(ptr >>> 0, 1));
/**
 * Promise-based async interface support
 */
export class AsyncCryptoOperation {

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        AsyncCryptoOperationFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_asynccryptooperation_free(ptr, 0);
    }
    /**
     * @param {string} operation_id
     */
    constructor(operation_id) {
        const ptr0 = passStringToWasm0(operation_id, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.asynccryptooperation_new(ptr0, len0);
        this.__wbg_ptr = ret >>> 0;
        AsyncCryptoOperationFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
    /**
     * @returns {string}
     */
    get operation_id() {
        let deferred1_0;
        let deferred1_1;
        try {
            const ret = wasm.asynccryptooperation_operation_id(this.__wbg_ptr);
            deferred1_0 = ret[0];
            deferred1_1 = ret[1];
            return getStringFromWasm0(ret[0], ret[1]);
        } finally {
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }
    /**
     * @returns {string}
     */
    get status() {
        let deferred1_0;
        let deferred1_1;
        try {
            const ret = wasm.asynccryptooperation_status(this.__wbg_ptr);
            deferred1_0 = ret[0];
            deferred1_1 = ret[1];
            return getStringFromWasm0(ret[0], ret[1]);
        } finally {
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }
    /**
     * @param {string} status
     */
    set_status(status) {
        const ptr0 = passStringToWasm0(status, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.asynccryptooperation_set_status(this.__wbg_ptr, ptr0, len0);
    }
    /**
     * @returns {boolean}
     */
    is_complete() {
        const ret = wasm.asynccryptooperation_is_complete(this.__wbg_ptr);
        return ret !== 0;
    }
}

const AuditTrailFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_audittrail_free(ptr >>> 0, 1));
/**
 * Cryptographic operation audit trail
 */
export class AuditTrail {

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        AuditTrailFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_audittrail_free(ptr, 0);
    }
    /**
     * @param {number} max_entries
     */
    constructor(max_entries) {
        const ret = wasm.audittrail_new(max_entries);
        this.__wbg_ptr = ret >>> 0;
        AuditTrailFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
    /**
     * Log a cryptographic operation (privacy-safe)
     * @param {string} operation_type
     * @param {string} algorithm
     */
    log_operation(operation_type, algorithm) {
        const ptr0 = passStringToWasm0(operation_type, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passStringToWasm0(algorithm, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len1 = WASM_VECTOR_LEN;
        wasm.audittrail_log_operation(this.__wbg_ptr, ptr0, len0, ptr1, len1);
    }
    /**
     * Get operation count for a specific type
     * @param {string} operation_type
     * @returns {number}
     */
    get_operation_count(operation_type) {
        const ptr0 = passStringToWasm0(operation_type, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.audittrail_get_operation_count(this.__wbg_ptr, ptr0, len0);
        return ret >>> 0;
    }
    /**
     * Get recent operations (returns JSON string)
     * @param {number} limit
     * @returns {string}
     */
    get_recent_operations(limit) {
        let deferred1_0;
        let deferred1_1;
        try {
            const ret = wasm.audittrail_get_recent_operations(this.__wbg_ptr, limit);
            deferred1_0 = ret[0];
            deferred1_1 = ret[1];
            return getStringFromWasm0(ret[0], ret[1]);
        } finally {
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }
    /**
     * Clear audit trail (emergency function)
     */
    clear() {
        wasm.audittrail_clear(this.__wbg_ptr);
    }
    /**
     * Get total operation count
     * @returns {number}
     */
    total_operations() {
        const ret = wasm.audittrail_total_operations(this.__wbg_ptr);
        return ret >>> 0;
    }
}

const BatchConfigFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_batchconfig_free(ptr >>> 0, 1));
/**
 * Batch processing configuration
 */
export class BatchConfig {

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        BatchConfigFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_batchconfig_free(ptr, 0);
    }
    /**
     * Create new batch configuration
     * @param {number} size
     * @param {number} max_concurrent
     * @param {boolean} integrity_validation
     * @param {boolean} performance_monitoring
     */
    constructor(size, max_concurrent, integrity_validation, performance_monitoring) {
        const ret = wasm.batchconfig_new(size, max_concurrent, integrity_validation, performance_monitoring);
        this.__wbg_ptr = ret >>> 0;
        BatchConfigFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
    /**
     * Get batch size
     * @returns {number}
     */
    get size() {
        const ret = wasm.batchconfig_size(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * Get max concurrent batches
     * @returns {number}
     */
    get max_concurrent() {
        const ret = wasm.batchconfig_max_concurrent(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * Get integrity validation setting
     * @returns {boolean}
     */
    get integrity_validation() {
        const ret = wasm.batchconfig_integrity_validation(this.__wbg_ptr);
        return ret !== 0;
    }
    /**
     * Get performance monitoring setting
     * @returns {boolean}
     */
    get performance_monitoring() {
        const ret = wasm.batchconfig_performance_monitoring(this.__wbg_ptr);
        return ret !== 0;
    }
}

const BenchmarkResultFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_benchmarkresult_free(ptr >>> 0, 1));

export class BenchmarkResult {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(BenchmarkResult.prototype);
        obj.__wbg_ptr = ptr;
        BenchmarkResultFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        BenchmarkResultFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_benchmarkresult_free(ptr, 0);
    }
    /**
     * @param {number} duration_ms
     * @param {number} memory_used_mb
     * @param {number} iterations_tested
     * @param {boolean} success
     * @param {string | null} [error_message]
     */
    constructor(duration_ms, memory_used_mb, iterations_tested, success, error_message) {
        var ptr0 = isLikeNone(error_message) ? 0 : passStringToWasm0(error_message, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        var len0 = WASM_VECTOR_LEN;
        const ret = wasm.benchmarkresult_new(duration_ms, memory_used_mb, iterations_tested, success, ptr0, len0);
        this.__wbg_ptr = ret >>> 0;
        BenchmarkResultFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
    /**
     * @returns {number}
     */
    get duration_ms() {
        const ret = wasm.benchmarkresult_duration_ms(this.__wbg_ptr);
        return ret;
    }
    /**
     * @returns {number}
     */
    get memory_used_mb() {
        const ret = wasm.benchmarkresult_memory_used_mb(this.__wbg_ptr);
        return ret;
    }
    /**
     * @returns {number}
     */
    get iterations_tested() {
        const ret = wasm.benchmarkresult_iterations_tested(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * @returns {boolean}
     */
    get success() {
        const ret = wasm.benchmarkresult_success(this.__wbg_ptr);
        return ret !== 0;
    }
    /**
     * @returns {string | undefined}
     */
    get error_message() {
        const ret = wasm.benchmarkresult_error_message(this.__wbg_ptr);
        let v1;
        if (ret[0] !== 0) {
            v1 = getStringFromWasm0(ret[0], ret[1]).slice();
            wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
        }
        return v1;
    }
}

const CryptoEnvelopeFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_cryptoenvelope_free(ptr >>> 0, 1));

export class CryptoEnvelope {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(CryptoEnvelope.prototype);
        obj.__wbg_ptr = ptr;
        CryptoEnvelopeFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        CryptoEnvelopeFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_cryptoenvelope_free(ptr, 0);
    }
    constructor() {
        const ret = wasm.cryptoenvelope_new();
        this.__wbg_ptr = ret >>> 0;
        CryptoEnvelopeFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
    /**
     * @returns {number}
     */
    get version() {
        const ret = wasm.cryptoenvelope_version(this.__wbg_ptr);
        return ret;
    }
    /**
     * @returns {number}
     */
    get algorithm() {
        const ret = wasm.cryptoenvelope_algorithm(this.__wbg_ptr);
        return ret;
    }
    /**
     * @returns {Uint8Array}
     */
    get salt() {
        const ret = wasm.cryptoenvelope_salt(this.__wbg_ptr);
        var v1 = getArrayU8FromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
        return v1;
    }
    /**
     * @returns {Uint8Array}
     */
    get nonce() {
        const ret = wasm.cryptoenvelope_nonce(this.__wbg_ptr);
        var v1 = getArrayU8FromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
        return v1;
    }
    /**
     * @returns {string | undefined}
     */
    get key_id() {
        const ret = wasm.cryptoenvelope_key_id(this.__wbg_ptr);
        let v1;
        if (ret[0] !== 0) {
            v1 = getStringFromWasm0(ret[0], ret[1]).slice();
            wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
        }
        return v1;
    }
    /**
     * @returns {Uint8Array}
     */
    get encrypted_data() {
        const ret = wasm.cryptoenvelope_encrypted_data(this.__wbg_ptr);
        var v1 = getArrayU8FromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
        return v1;
    }
    /**
     * @returns {Uint8Array}
     */
    get tag() {
        const ret = wasm.cryptoenvelope_tag(this.__wbg_ptr);
        var v1 = getArrayU8FromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
        return v1;
    }
    /**
     * @returns {Uint8Array}
     */
    get aad_hash() {
        const ret = wasm.cryptoenvelope_aad_hash(this.__wbg_ptr);
        var v1 = getArrayU8FromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
        return v1;
    }
    /**
     * @param {number} version
     */
    set_version(version) {
        const ret = wasm.cryptoenvelope_set_version(this.__wbg_ptr, version);
        if (ret[1]) {
            throw takeFromExternrefTable0(ret[0]);
        }
    }
    /**
     * @param {number} algorithm
     */
    set_algorithm(algorithm) {
        const ret = wasm.cryptoenvelope_set_algorithm(this.__wbg_ptr, algorithm);
        if (ret[1]) {
            throw takeFromExternrefTable0(ret[0]);
        }
    }
    /**
     * @param {KDFParams} params
     */
    set_kdf_params(params) {
        _assertClass(params, KDFParams);
        var ptr0 = params.__destroy_into_raw();
        wasm.cryptoenvelope_set_kdf_params(this.__wbg_ptr, ptr0);
    }
    /**
     * @param {Uint8Array} salt
     */
    set_salt(salt) {
        const ptr0 = passArray8ToWasm0(salt, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.cryptoenvelope_set_salt(this.__wbg_ptr, ptr0, len0);
    }
    /**
     * @param {Uint8Array} nonce
     */
    set_nonce(nonce) {
        const ptr0 = passArray8ToWasm0(nonce, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.cryptoenvelope_set_nonce(this.__wbg_ptr, ptr0, len0);
    }
    /**
     * @param {string} key_id
     */
    set_key_id(key_id) {
        const ptr0 = passStringToWasm0(key_id, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.cryptoenvelope_set_key_id(this.__wbg_ptr, ptr0, len0);
    }
    /**
     * @param {Uint8Array} data
     */
    set_encrypted_data(data) {
        const ptr0 = passArray8ToWasm0(data, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.cryptoenvelope_set_encrypted_data(this.__wbg_ptr, ptr0, len0);
    }
    /**
     * @param {Uint8Array} tag
     */
    set_tag(tag) {
        const ptr0 = passArray8ToWasm0(tag, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.cryptoenvelope_set_tag(this.__wbg_ptr, ptr0, len0);
    }
    /**
     * @param {Uint8Array} aad_hash
     */
    set_aad_hash(aad_hash) {
        const ptr0 = passArray8ToWasm0(aad_hash, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.cryptoenvelope_set_aad_hash(this.__wbg_ptr, ptr0, len0);
    }
    /**
     * @returns {boolean}
     */
    is_valid() {
        const ret = wasm.cryptoenvelope_is_valid(this.__wbg_ptr);
        return ret !== 0;
    }
    /**
     * @returns {boolean}
     */
    validate_integrity() {
        const ret = wasm.cryptoenvelope_validate_integrity(this.__wbg_ptr);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return ret[0] !== 0;
    }
}

const CryptoErrorFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_cryptoerror_free(ptr >>> 0, 1));
/**
 * WASM binding exports for JavaScript/TypeScript integration
 * This module handles the interface between Rust and JavaScript
 * Error types for crypto operations
 */
export class CryptoError {

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        CryptoErrorFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_cryptoerror_free(ptr, 0);
    }
    /**
     * @param {string} message
     * @param {string} error_type
     */
    constructor(message, error_type) {
        const ptr0 = passStringToWasm0(message, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passStringToWasm0(error_type, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len1 = WASM_VECTOR_LEN;
        const ret = wasm.cryptoerror_new(ptr0, len0, ptr1, len1);
        this.__wbg_ptr = ret >>> 0;
        CryptoErrorFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
    /**
     * @returns {string}
     */
    get message() {
        let deferred1_0;
        let deferred1_1;
        try {
            const ret = wasm.cryptoerror_message(this.__wbg_ptr);
            deferred1_0 = ret[0];
            deferred1_1 = ret[1];
            return getStringFromWasm0(ret[0], ret[1]);
        } finally {
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }
    /**
     * @returns {string}
     */
    get error_type() {
        let deferred1_0;
        let deferred1_1;
        try {
            const ret = wasm.cryptoerror_error_type(this.__wbg_ptr);
            deferred1_0 = ret[0];
            deferred1_1 = ret[1];
            return getStringFromWasm0(ret[0], ret[1]);
        } finally {
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }
}

const CryptoKeyFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_cryptokey_free(ptr >>> 0, 1));

export class CryptoKey {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(CryptoKey.prototype);
        obj.__wbg_ptr = ptr;
        CryptoKeyFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        CryptoKeyFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_cryptokey_free(ptr, 0);
    }
    /**
     * @param {string} key_type
     */
    constructor(key_type) {
        const ptr0 = passStringToWasm0(key_type, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.cryptokey_new(ptr0, len0);
        this.__wbg_ptr = ret >>> 0;
        CryptoKeyFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
    /**
     * @returns {string}
     */
    get key_type() {
        let deferred1_0;
        let deferred1_1;
        try {
            const ret = wasm.cryptokey_key_type(this.__wbg_ptr);
            deferred1_0 = ret[0];
            deferred1_1 = ret[1];
            return getStringFromWasm0(ret[0], ret[1]);
        } finally {
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }
    generate() {
        const ret = wasm.cryptokey_generate(this.__wbg_ptr);
        if (ret[1]) {
            throw takeFromExternrefTable0(ret[0]);
        }
    }
    /**
     * @returns {number}
     */
    length() {
        const ret = wasm.cryptokey_length(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * @returns {boolean}
     */
    is_initialized() {
        const ret = wasm.cryptokey_is_initialized(this.__wbg_ptr);
        return ret !== 0;
    }
    /**
     * @param {CryptoKey} other
     * @returns {boolean}
     */
    constant_time_equals(other) {
        _assertClass(other, CryptoKey);
        const ret = wasm.cryptokey_constant_time_equals(this.__wbg_ptr, other.__wbg_ptr);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return ret[0] !== 0;
    }
    /**
     * @returns {boolean}
     */
    validate_memory_protection() {
        const ret = wasm.cryptokey_validate_memory_protection(this.__wbg_ptr);
        return ret !== 0;
    }
    zeroize_key() {
        wasm.cryptokey_zeroize_key(this.__wbg_ptr);
    }
}

const DebugInterfaceFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_debuginterface_free(ptr >>> 0, 1));
/**
 * Debug interface for development
 */
export class DebugInterface {

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        DebugInterfaceFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_debuginterface_free(ptr, 0);
    }
    /**
     * @param {boolean} debug_enabled
     */
    constructor(debug_enabled) {
        const ret = wasm.debuginterface_new(debug_enabled);
        this.__wbg_ptr = ret >>> 0;
        DebugInterfaceFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
    /**
     * Log debug information if enabled
     * @param {string} message
     */
    debug_log(message) {
        const ptr0 = passStringToWasm0(message, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.debuginterface_debug_log(this.__wbg_ptr, ptr0, len0);
    }
    /**
     * Get memory statistics for debugging
     * @returns {string}
     */
    get_memory_stats() {
        let deferred1_0;
        let deferred1_1;
        try {
            const ret = wasm.debuginterface_get_memory_stats(this.__wbg_ptr);
            deferred1_0 = ret[0];
            deferred1_1 = ret[1];
            return getStringFromWasm0(ret[0], ret[1]);
        } finally {
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }
    /**
     * @returns {boolean}
     */
    get debug_enabled() {
        const ret = wasm.debuginterface_debug_enabled(this.__wbg_ptr);
        return ret !== 0;
    }
    /**
     * @param {boolean} enabled
     */
    set_debug_enabled(enabled) {
        wasm.debuginterface_set_debug_enabled(this.__wbg_ptr, enabled);
    }
}

const DerivationPathFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_derivationpath_free(ptr >>> 0, 1));

export class DerivationPath {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(DerivationPath.prototype);
        obj.__wbg_ptr = ptr;
        DerivationPathFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        DerivationPathFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_derivationpath_free(ptr, 0);
    }
    constructor() {
        const ret = wasm.derivationpath_new();
        this.__wbg_ptr = ret >>> 0;
        DerivationPathFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
    /**
     * @param {string} path_str
     * @returns {DerivationPath}
     */
    static fromString(path_str) {
        const ptr0 = passStringToWasm0(path_str, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.derivationpath_fromString(ptr0, len0);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return DerivationPath.__wrap(ret[0]);
    }
    /**
     * @returns {string}
     */
    toString() {
        let deferred1_0;
        let deferred1_1;
        try {
            const ret = wasm.derivationpath_toString(this.__wbg_ptr);
            deferred1_0 = ret[0];
            deferred1_1 = ret[1];
            return getStringFromWasm0(ret[0], ret[1]);
        } finally {
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }
    /**
     * @param {number} index
     * @returns {DerivationPath}
     */
    child(index) {
        const ret = wasm.derivationpath_child(this.__wbg_ptr, index);
        return DerivationPath.__wrap(ret);
    }
    /**
     * @param {number} index
     * @returns {DerivationPath}
     */
    hardenedChild(index) {
        const ret = wasm.derivationpath_hardenedChild(this.__wbg_ptr, index);
        return DerivationPath.__wrap(ret);
    }
}

const DeviceCapabilitiesFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_devicecapabilities_free(ptr >>> 0, 1));

export class DeviceCapabilities {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(DeviceCapabilities.prototype);
        obj.__wbg_ptr = ptr;
        DeviceCapabilitiesFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        DeviceCapabilitiesFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_devicecapabilities_free(ptr, 0);
    }
    /**
     * @param {DeviceClass} device_class
     * @param {bigint} available_memory
     * @param {number} cpu_cores
     * @param {boolean} has_secure_enclave
     * @param {string} platform
     * @param {number} performance_score
     */
    constructor(device_class, available_memory, cpu_cores, has_secure_enclave, platform, performance_score) {
        const ptr0 = passStringToWasm0(platform, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.devicecapabilities_new(device_class, available_memory, cpu_cores, has_secure_enclave, ptr0, len0, performance_score);
        this.__wbg_ptr = ret >>> 0;
        DeviceCapabilitiesFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
    /**
     * @returns {DeviceClass}
     */
    get device_class() {
        const ret = wasm.devicecapabilities_device_class(this.__wbg_ptr);
        return ret;
    }
    /**
     * @returns {bigint}
     */
    get available_memory() {
        const ret = wasm.devicecapabilities_available_memory(this.__wbg_ptr);
        return BigInt.asUintN(64, ret);
    }
    /**
     * @returns {number}
     */
    get cpu_cores() {
        const ret = wasm.devicecapabilities_cpu_cores(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * @returns {boolean}
     */
    get has_secure_enclave() {
        const ret = wasm.devicecapabilities_has_secure_enclave(this.__wbg_ptr);
        return ret !== 0;
    }
    /**
     * @returns {string}
     */
    get platform() {
        let deferred1_0;
        let deferred1_1;
        try {
            const ret = wasm.devicecapabilities_platform(this.__wbg_ptr);
            deferred1_0 = ret[0];
            deferred1_1 = ret[1];
            return getStringFromWasm0(ret[0], ret[1]);
        } finally {
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }
    /**
     * @returns {number}
     */
    get performance_score() {
        const ret = wasm.devicecapabilities_performance_score(this.__wbg_ptr);
        return ret;
    }
}

const DeviceCapabilityDetectorFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_devicecapabilitydetector_free(ptr >>> 0, 1));

export class DeviceCapabilityDetector {

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        DeviceCapabilityDetectorFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_devicecapabilitydetector_free(ptr, 0);
    }
    constructor() {
        const ret = wasm.devicecapabilitydetector_new();
        this.__wbg_ptr = ret >>> 0;
        DeviceCapabilityDetectorFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
    /**
     * @param {bigint} available_memory_mb
     * @param {number} cpu_cores
     * @param {string} platform
     * @param {boolean} has_secure_enclave
     * @returns {DeviceCapabilities}
     */
    detect_capabilities(available_memory_mb, cpu_cores, platform, has_secure_enclave) {
        const ptr0 = passStringToWasm0(platform, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.devicecapabilitydetector_detect_capabilities(this.__wbg_ptr, available_memory_mb, cpu_cores, ptr0, len0, has_secure_enclave);
        return DeviceCapabilities.__wrap(ret);
    }
    /**
     * @param {DeviceCapabilities} capabilities
     * @returns {Argon2Params}
     */
    get_optimal_argon2_params(capabilities) {
        _assertClass(capabilities, DeviceCapabilities);
        const ret = wasm.devicecapabilitydetector_get_optimal_argon2_params(this.__wbg_ptr, capabilities.__wbg_ptr);
        return Argon2Params.__wrap(ret);
    }
    /**
     * @param {Argon2Params} test_params
     * @param {number} target_duration_ms
     * @returns {Promise<BenchmarkResult>}
     */
    benchmark_argon2_performance(test_params, target_duration_ms) {
        _assertClass(test_params, Argon2Params);
        const ret = wasm.devicecapabilitydetector_benchmark_argon2_performance(this.__wbg_ptr, test_params.__wbg_ptr, target_duration_ms);
        return ret;
    }
    /**
     * @param {DeviceCapabilities} capabilities
     * @param {number} target_duration_ms
     * @returns {Promise<Argon2Params>}
     */
    select_adaptive_parameters(capabilities, target_duration_ms) {
        _assertClass(capabilities, DeviceCapabilities);
        const ret = wasm.devicecapabilitydetector_select_adaptive_parameters(this.__wbg_ptr, capabilities.__wbg_ptr, target_duration_ms);
        return ret;
    }
}

const DevicePairingRequestFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_devicepairingrequest_free(ptr >>> 0, 1));
/**
 * Device pairing request containing public key and device metadata
 */
export class DevicePairingRequest {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(DevicePairingRequest.prototype);
        obj.__wbg_ptr = ptr;
        DevicePairingRequestFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        DevicePairingRequestFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_devicepairingrequest_free(ptr, 0);
    }
    /**
     * @param {string} device_id
     * @param {string} device_name
     * @param {string} device_type
     * @param {Uint8Array} public_key
     * @param {Uint8Array} challenge_nonce
     * @param {bigint} timestamp
     */
    constructor(device_id, device_name, device_type, public_key, challenge_nonce, timestamp) {
        const ptr0 = passStringToWasm0(device_id, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passStringToWasm0(device_name, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len1 = WASM_VECTOR_LEN;
        const ptr2 = passStringToWasm0(device_type, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len2 = WASM_VECTOR_LEN;
        const ptr3 = passArray8ToWasm0(public_key, wasm.__wbindgen_malloc);
        const len3 = WASM_VECTOR_LEN;
        const ptr4 = passArray8ToWasm0(challenge_nonce, wasm.__wbindgen_malloc);
        const len4 = WASM_VECTOR_LEN;
        const ret = wasm.devicepairingrequest_new(ptr0, len0, ptr1, len1, ptr2, len2, ptr3, len3, ptr4, len4, timestamp);
        this.__wbg_ptr = ret >>> 0;
        DevicePairingRequestFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
    /**
     * @returns {string}
     */
    get device_id() {
        let deferred1_0;
        let deferred1_1;
        try {
            const ret = wasm.devicepairingrequest_device_id(this.__wbg_ptr);
            deferred1_0 = ret[0];
            deferred1_1 = ret[1];
            return getStringFromWasm0(ret[0], ret[1]);
        } finally {
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }
    /**
     * @returns {string}
     */
    get device_name() {
        let deferred1_0;
        let deferred1_1;
        try {
            const ret = wasm.devicepairingrequest_device_name(this.__wbg_ptr);
            deferred1_0 = ret[0];
            deferred1_1 = ret[1];
            return getStringFromWasm0(ret[0], ret[1]);
        } finally {
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }
    /**
     * @returns {string}
     */
    get device_type() {
        let deferred1_0;
        let deferred1_1;
        try {
            const ret = wasm.devicepairingrequest_device_type(this.__wbg_ptr);
            deferred1_0 = ret[0];
            deferred1_1 = ret[1];
            return getStringFromWasm0(ret[0], ret[1]);
        } finally {
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }
    /**
     * @returns {Uint8Array}
     */
    get public_key() {
        const ret = wasm.devicepairingrequest_public_key(this.__wbg_ptr);
        var v1 = getArrayU8FromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
        return v1;
    }
    /**
     * @returns {Uint8Array}
     */
    get challenge_nonce() {
        const ret = wasm.devicepairingrequest_challenge_nonce(this.__wbg_ptr);
        var v1 = getArrayU8FromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
        return v1;
    }
    /**
     * @returns {bigint}
     */
    get timestamp() {
        const ret = wasm.devicepairingrequest_timestamp(this.__wbg_ptr);
        return BigInt.asUintN(64, ret);
    }
}

const DevicePairingResponseFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_devicepairingresponse_free(ptr >>> 0, 1));
/**
 * Device pairing response with authentication proof
 */
export class DevicePairingResponse {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(DevicePairingResponse.prototype);
        obj.__wbg_ptr = ptr;
        DevicePairingResponseFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        DevicePairingResponseFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_devicepairingresponse_free(ptr, 0);
    }
    /**
     * @param {string} device_id
     * @param {Uint8Array} response_signature
     * @param {Uint8Array} shared_secret_hash
     * @param {string} device_trust_token
     * @param {bigint} timestamp
     */
    constructor(device_id, response_signature, shared_secret_hash, device_trust_token, timestamp) {
        const ptr0 = passStringToWasm0(device_id, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passArray8ToWasm0(response_signature, wasm.__wbindgen_malloc);
        const len1 = WASM_VECTOR_LEN;
        const ptr2 = passArray8ToWasm0(shared_secret_hash, wasm.__wbindgen_malloc);
        const len2 = WASM_VECTOR_LEN;
        const ptr3 = passStringToWasm0(device_trust_token, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len3 = WASM_VECTOR_LEN;
        const ret = wasm.devicepairingresponse_new(ptr0, len0, ptr1, len1, ptr2, len2, ptr3, len3, timestamp);
        this.__wbg_ptr = ret >>> 0;
        DevicePairingResponseFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
    /**
     * @returns {string}
     */
    get device_id() {
        let deferred1_0;
        let deferred1_1;
        try {
            const ret = wasm.devicepairingresponse_device_id(this.__wbg_ptr);
            deferred1_0 = ret[0];
            deferred1_1 = ret[1];
            return getStringFromWasm0(ret[0], ret[1]);
        } finally {
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }
    /**
     * @returns {Uint8Array}
     */
    get response_signature() {
        const ret = wasm.devicepairingresponse_response_signature(this.__wbg_ptr);
        var v1 = getArrayU8FromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
        return v1;
    }
    /**
     * @returns {Uint8Array}
     */
    get shared_secret_hash() {
        const ret = wasm.devicepairingresponse_shared_secret_hash(this.__wbg_ptr);
        var v1 = getArrayU8FromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
        return v1;
    }
    /**
     * @returns {string}
     */
    get device_trust_token() {
        let deferred1_0;
        let deferred1_1;
        try {
            const ret = wasm.devicepairingresponse_device_trust_token(this.__wbg_ptr);
            deferred1_0 = ret[0];
            deferred1_1 = ret[1];
            return getStringFromWasm0(ret[0], ret[1]);
        } finally {
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }
    /**
     * @returns {bigint}
     */
    get timestamp() {
        const ret = wasm.devicepairingresponse_timestamp(this.__wbg_ptr);
        return BigInt.asUintN(64, ret);
    }
}

const DeviceRegistryEntryFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_deviceregistryentry_free(ptr >>> 0, 1));
/**
 * Device registry entry containing trust information
 */
export class DeviceRegistryEntry {

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        DeviceRegistryEntryFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_deviceregistryentry_free(ptr, 0);
    }
    /**
     * @param {string} device_id
     * @param {string} device_name
     * @param {string} device_type
     * @param {number} status
     * @param {string} trust_token
     * @param {Uint8Array} public_key
     * @param {bigint} last_sync
     * @param {number} trust_score
     * @param {bigint} created_at
     * @param {bigint} updated_at
     */
    constructor(device_id, device_name, device_type, status, trust_token, public_key, last_sync, trust_score, created_at, updated_at) {
        const ptr0 = passStringToWasm0(device_id, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passStringToWasm0(device_name, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len1 = WASM_VECTOR_LEN;
        const ptr2 = passStringToWasm0(device_type, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len2 = WASM_VECTOR_LEN;
        const ptr3 = passStringToWasm0(trust_token, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len3 = WASM_VECTOR_LEN;
        const ptr4 = passArray8ToWasm0(public_key, wasm.__wbindgen_malloc);
        const len4 = WASM_VECTOR_LEN;
        const ret = wasm.deviceregistryentry_new(ptr0, len0, ptr1, len1, ptr2, len2, status, ptr3, len3, ptr4, len4, last_sync, trust_score, created_at, updated_at);
        this.__wbg_ptr = ret >>> 0;
        DeviceRegistryEntryFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
    /**
     * @returns {string}
     */
    get device_id() {
        let deferred1_0;
        let deferred1_1;
        try {
            const ret = wasm.deviceregistryentry_device_id(this.__wbg_ptr);
            deferred1_0 = ret[0];
            deferred1_1 = ret[1];
            return getStringFromWasm0(ret[0], ret[1]);
        } finally {
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }
    /**
     * @returns {string}
     */
    get device_name() {
        let deferred1_0;
        let deferred1_1;
        try {
            const ret = wasm.deviceregistryentry_device_name(this.__wbg_ptr);
            deferred1_0 = ret[0];
            deferred1_1 = ret[1];
            return getStringFromWasm0(ret[0], ret[1]);
        } finally {
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }
    /**
     * @returns {string}
     */
    get device_type() {
        let deferred1_0;
        let deferred1_1;
        try {
            const ret = wasm.deviceregistryentry_device_type(this.__wbg_ptr);
            deferred1_0 = ret[0];
            deferred1_1 = ret[1];
            return getStringFromWasm0(ret[0], ret[1]);
        } finally {
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }
    /**
     * @returns {number}
     */
    get status() {
        const ret = wasm.deviceregistryentry_status(this.__wbg_ptr);
        return ret;
    }
    /**
     * @param {number} status
     */
    set status(status) {
        wasm.deviceregistryentry_set_status(this.__wbg_ptr, status);
    }
    /**
     * @returns {string}
     */
    get trust_token() {
        let deferred1_0;
        let deferred1_1;
        try {
            const ret = wasm.deviceregistryentry_trust_token(this.__wbg_ptr);
            deferred1_0 = ret[0];
            deferred1_1 = ret[1];
            return getStringFromWasm0(ret[0], ret[1]);
        } finally {
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }
    /**
     * @returns {Uint8Array}
     */
    get public_key() {
        const ret = wasm.deviceregistryentry_public_key(this.__wbg_ptr);
        var v1 = getArrayU8FromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
        return v1;
    }
    /**
     * @returns {bigint}
     */
    get last_sync() {
        const ret = wasm.deviceregistryentry_last_sync(this.__wbg_ptr);
        return BigInt.asUintN(64, ret);
    }
    /**
     * @param {bigint} timestamp
     */
    set last_sync(timestamp) {
        wasm.deviceregistryentry_set_last_sync(this.__wbg_ptr, timestamp);
    }
    /**
     * @returns {number}
     */
    get trust_score() {
        const ret = wasm.deviceregistryentry_trust_score(this.__wbg_ptr);
        return ret;
    }
    /**
     * @param {number} score
     */
    set trust_score(score) {
        wasm.deviceregistryentry_set_trust_score(this.__wbg_ptr, score);
    }
    /**
     * @returns {bigint}
     */
    get created_at() {
        const ret = wasm.deviceregistryentry_created_at(this.__wbg_ptr);
        return BigInt.asUintN(64, ret);
    }
    /**
     * @returns {bigint}
     */
    get updated_at() {
        const ret = wasm.deviceregistryentry_updated_at(this.__wbg_ptr);
        return BigInt.asUintN(64, ret);
    }
    /**
     * Check if device entry is expired based on timestamp
     * @param {bigint} ttl_seconds
     * @returns {boolean}
     */
    is_expired(ttl_seconds) {
        const ret = wasm.deviceregistryentry_is_expired(this.__wbg_ptr, ttl_seconds);
        return ret !== 0;
    }
    /**
     * Check if device is in trusted state
     * @returns {boolean}
     */
    is_trusted() {
        const ret = wasm.deviceregistryentry_is_trusted(this.__wbg_ptr);
        return ret !== 0;
    }
    /**
     * Check if device is revoked
     * @returns {boolean}
     */
    is_revoked() {
        const ret = wasm.deviceregistryentry_is_revoked(this.__wbg_ptr);
        return ret !== 0;
    }
}

const EmergencyRotationManagerFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_emergencyrotationmanager_free(ptr >>> 0, 1));

export class EmergencyRotationManager {

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        EmergencyRotationManagerFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_emergencyrotationmanager_free(ptr, 0);
    }
    constructor() {
        const ret = wasm.emergencyrotationmanager_new();
        this.__wbg_ptr = ret >>> 0;
        EmergencyRotationManagerFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
    /**
     * @param {string} trigger_type
     * @param {string} description
     * @param {string[]} affected_devices
     * @param {number} severity
     * @returns {string}
     */
    triggerEmergencyRotation(trigger_type, description, affected_devices, severity) {
        let deferred5_0;
        let deferred5_1;
        try {
            const ptr0 = passStringToWasm0(trigger_type, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            const len0 = WASM_VECTOR_LEN;
            const ptr1 = passStringToWasm0(description, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            const len1 = WASM_VECTOR_LEN;
            const ptr2 = passArrayJsValueToWasm0(affected_devices, wasm.__wbindgen_malloc);
            const len2 = WASM_VECTOR_LEN;
            const ret = wasm.emergencyrotationmanager_triggerEmergencyRotation(this.__wbg_ptr, ptr0, len0, ptr1, len1, ptr2, len2, severity);
            var ptr4 = ret[0];
            var len4 = ret[1];
            if (ret[3]) {
                ptr4 = 0; len4 = 0;
                throw takeFromExternrefTable0(ret[2]);
            }
            deferred5_0 = ptr4;
            deferred5_1 = len4;
            return getStringFromWasm0(ptr4, len4);
        } finally {
            wasm.__wbindgen_free(deferred5_0, deferred5_1, 1);
        }
    }
    /**
     * @param {string} incident_id
     */
    initiateEmergencyResponse(incident_id) {
        const ptr0 = passStringToWasm0(incident_id, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.emergencyrotationmanager_initiateEmergencyResponse(this.__wbg_ptr, ptr0, len0);
        if (ret[1]) {
            throw takeFromExternrefTable0(ret[0]);
        }
    }
    /**
     * @param {string} device_id
     * @param {string} incident_id
     */
    isolateDevice(device_id, incident_id) {
        const ptr0 = passStringToWasm0(device_id, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passStringToWasm0(incident_id, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len1 = WASM_VECTOR_LEN;
        const ret = wasm.emergencyrotationmanager_isolateDevice(this.__wbg_ptr, ptr0, len0, ptr1, len1);
        if (ret[1]) {
            throw takeFromExternrefTable0(ret[0]);
        }
    }
    /**
     * @param {string} key_id
     * @param {string} incident_id
     */
    invalidateKey(key_id, incident_id) {
        const ptr0 = passStringToWasm0(key_id, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passStringToWasm0(incident_id, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len1 = WASM_VECTOR_LEN;
        const ret = wasm.emergencyrotationmanager_invalidateKey(this.__wbg_ptr, ptr0, len0, ptr1, len1);
        if (ret[1]) {
            throw takeFromExternrefTable0(ret[0]);
        }
    }
    /**
     * @param {string} incident_id
     * @param {string[]} device_ids
     * @returns {string[]}
     */
    executeEmergencyRotation(incident_id, device_ids) {
        const ptr0 = passStringToWasm0(incident_id, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passArrayJsValueToWasm0(device_ids, wasm.__wbindgen_malloc);
        const len1 = WASM_VECTOR_LEN;
        const ret = wasm.emergencyrotationmanager_executeEmergencyRotation(this.__wbg_ptr, ptr0, len0, ptr1, len1);
        if (ret[3]) {
            throw takeFromExternrefTable0(ret[2]);
        }
        var v3 = getArrayJsValueFromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
        return v3;
    }
    /**
     * @param {string} incident_id
     */
    initiateRecovery(incident_id) {
        const ptr0 = passStringToWasm0(incident_id, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.emergencyrotationmanager_initiateRecovery(this.__wbg_ptr, ptr0, len0);
        if (ret[1]) {
            throw takeFromExternrefTable0(ret[0]);
        }
    }
    /**
     * @param {string} incident_id
     * @returns {string}
     */
    getIncidentStatus(incident_id) {
        let deferred3_0;
        let deferred3_1;
        try {
            const ptr0 = passStringToWasm0(incident_id, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            const len0 = WASM_VECTOR_LEN;
            const ret = wasm.emergencyrotationmanager_getIncidentStatus(this.__wbg_ptr, ptr0, len0);
            var ptr2 = ret[0];
            var len2 = ret[1];
            if (ret[3]) {
                ptr2 = 0; len2 = 0;
                throw takeFromExternrefTable0(ret[2]);
            }
            deferred3_0 = ptr2;
            deferred3_1 = len2;
            return getStringFromWasm0(ptr2, len2);
        } finally {
            wasm.__wbindgen_free(deferred3_0, deferred3_1, 1);
        }
    }
    /**
     * @param {string} device_id
     * @returns {boolean}
     */
    isDeviceIsolated(device_id) {
        const ptr0 = passStringToWasm0(device_id, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.emergencyrotationmanager_isDeviceIsolated(this.__wbg_ptr, ptr0, len0);
        return ret !== 0;
    }
    /**
     * @param {string} key_id
     * @returns {boolean}
     */
    isKeyInvalidated(key_id) {
        const ptr0 = passStringToWasm0(key_id, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.emergencyrotationmanager_isKeyInvalidated(this.__wbg_ptr, ptr0, len0);
        return ret !== 0;
    }
    /**
     * @param {string} device_id
     * @param {string} incident_id
     */
    restoreDeviceAccess(device_id, incident_id) {
        const ptr0 = passStringToWasm0(device_id, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passStringToWasm0(incident_id, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len1 = WASM_VECTOR_LEN;
        const ret = wasm.emergencyrotationmanager_restoreDeviceAccess(this.__wbg_ptr, ptr0, len0, ptr1, len1);
        if (ret[1]) {
            throw takeFromExternrefTable0(ret[0]);
        }
    }
}

const EntropySourceFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_entropysource_free(ptr >>> 0, 1));

export class EntropySource {

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        EntropySourceFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_entropysource_free(ptr, 0);
    }
    /**
     * @param {string} source_type
     * @param {number} entropy_bytes
     * @param {number} quality_score
     * @param {boolean} is_hardware_based
     * @param {number} timestamp
     */
    constructor(source_type, entropy_bytes, quality_score, is_hardware_based, timestamp) {
        const ptr0 = passStringToWasm0(source_type, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.entropysource_new(ptr0, len0, entropy_bytes, quality_score, is_hardware_based, timestamp);
        this.__wbg_ptr = ret >>> 0;
        EntropySourceFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
    /**
     * @returns {string}
     */
    get source_type() {
        let deferred1_0;
        let deferred1_1;
        try {
            const ret = wasm.entropysource_source_type(this.__wbg_ptr);
            deferred1_0 = ret[0];
            deferred1_1 = ret[1];
            return getStringFromWasm0(ret[0], ret[1]);
        } finally {
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }
    /**
     * @returns {number}
     */
    get entropy_bytes() {
        const ret = wasm.entropysource_entropy_bytes(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * @returns {number}
     */
    get quality_score() {
        const ret = wasm.entropysource_quality_score(this.__wbg_ptr);
        return ret;
    }
    /**
     * @returns {boolean}
     */
    get is_hardware_based() {
        const ret = wasm.entropysource_is_hardware_based(this.__wbg_ptr);
        return ret !== 0;
    }
    /**
     * @returns {number}
     */
    get timestamp() {
        const ret = wasm.entropysource_timestamp(this.__wbg_ptr);
        return ret;
    }
}

const ExtendedKeyFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_extendedkey_free(ptr >>> 0, 1));

export class ExtendedKey {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(ExtendedKey.prototype);
        obj.__wbg_ptr = ptr;
        ExtendedKeyFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        ExtendedKeyFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_extendedkey_free(ptr, 0);
    }
    /**
     * @param {Uint8Array} seed
     * @returns {ExtendedKey}
     */
    static fromSeed(seed) {
        const ptr0 = passArray8ToWasm0(seed, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.extendedkey_fromSeed(ptr0, len0);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return ExtendedKey.__wrap(ret[0]);
    }
    /**
     * @param {number} index
     * @returns {ExtendedKey}
     */
    deriveChild(index) {
        const ret = wasm.extendedkey_deriveChild(this.__wbg_ptr, index);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return ExtendedKey.__wrap(ret[0]);
    }
    /**
     * @returns {number}
     */
    get depth() {
        const ret = wasm.extendedkey_depth(this.__wbg_ptr);
        return ret;
    }
    /**
     * @returns {Uint8Array}
     */
    getKeyBytes() {
        const ret = wasm.extendedkey_getKeyBytes(this.__wbg_ptr);
        if (ret[3]) {
            throw takeFromExternrefTable0(ret[2]);
        }
        var v1 = getArrayU8FromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
        return v1;
    }
}

const HSMCapabilitiesFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_hsmcapabilities_free(ptr >>> 0, 1));

export class HSMCapabilities {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(HSMCapabilities.prototype);
        obj.__wbg_ptr = ptr;
        HSMCapabilitiesFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        HSMCapabilitiesFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_hsmcapabilities_free(ptr, 0);
    }
    /**
     * @param {boolean} has_hsm
     * @param {string} hsm_type
     * @param {boolean} supports_key_generation
     * @param {boolean} supports_key_storage
     * @param {boolean} supports_attestation
     * @param {number} max_key_size
     */
    constructor(has_hsm, hsm_type, supports_key_generation, supports_key_storage, supports_attestation, max_key_size) {
        const ptr0 = passStringToWasm0(hsm_type, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.hsmcapabilities_new(has_hsm, ptr0, len0, supports_key_generation, supports_key_storage, supports_attestation, max_key_size);
        this.__wbg_ptr = ret >>> 0;
        HSMCapabilitiesFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
    /**
     * @returns {boolean}
     */
    get has_hsm() {
        const ret = wasm.hsmcapabilities_has_hsm(this.__wbg_ptr);
        return ret !== 0;
    }
    /**
     * @returns {string}
     */
    get hsm_type() {
        let deferred1_0;
        let deferred1_1;
        try {
            const ret = wasm.hsmcapabilities_hsm_type(this.__wbg_ptr);
            deferred1_0 = ret[0];
            deferred1_1 = ret[1];
            return getStringFromWasm0(ret[0], ret[1]);
        } finally {
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }
    /**
     * @returns {boolean}
     */
    get supports_key_generation() {
        const ret = wasm.hsmcapabilities_supports_key_generation(this.__wbg_ptr);
        return ret !== 0;
    }
    /**
     * @returns {boolean}
     */
    get supports_key_storage() {
        const ret = wasm.hsmcapabilities_supports_key_storage(this.__wbg_ptr);
        return ret !== 0;
    }
    /**
     * @returns {boolean}
     */
    get supports_attestation() {
        const ret = wasm.hsmcapabilities_supports_attestation(this.__wbg_ptr);
        return ret !== 0;
    }
    /**
     * @returns {number}
     */
    get max_key_size() {
        const ret = wasm.hsmcapabilities_max_key_size(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * @returns {string[]}
     */
    supported_algorithms() {
        const ret = wasm.hsmcapabilities_supported_algorithms(this.__wbg_ptr);
        var v1 = getArrayJsValueFromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
        return v1;
    }
}

const HealthCheckFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_healthcheck_free(ptr >>> 0, 1));
/**
 * Health check interface for validation
 */
export class HealthCheck {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(HealthCheck.prototype);
        obj.__wbg_ptr = ptr;
        HealthCheckFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        HealthCheckFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_healthcheck_free(ptr, 0);
    }
    /**
     * Perform comprehensive health check
     * @returns {HealthCheck}
     */
    static run_health_check() {
        const ret = wasm.healthcheck_run_health_check();
        return HealthCheck.__wrap(ret);
    }
    /**
     * @returns {string}
     */
    get crypto_status() {
        let deferred1_0;
        let deferred1_1;
        try {
            const ret = wasm.healthcheck_crypto_status(this.__wbg_ptr);
            deferred1_0 = ret[0];
            deferred1_1 = ret[1];
            return getStringFromWasm0(ret[0], ret[1]);
        } finally {
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }
    /**
     * @returns {string}
     */
    get memory_status() {
        let deferred1_0;
        let deferred1_1;
        try {
            const ret = wasm.healthcheck_memory_status(this.__wbg_ptr);
            deferred1_0 = ret[0];
            deferred1_1 = ret[1];
            return getStringFromWasm0(ret[0], ret[1]);
        } finally {
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }
    /**
     * @returns {string}
     */
    get binding_status() {
        let deferred1_0;
        let deferred1_1;
        try {
            const ret = wasm.healthcheck_binding_status(this.__wbg_ptr);
            deferred1_0 = ret[0];
            deferred1_1 = ret[1];
            return getStringFromWasm0(ret[0], ret[1]);
        } finally {
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }
    /**
     * @returns {boolean}
     */
    is_healthy() {
        const ret = wasm.healthcheck_is_healthy(this.__wbg_ptr);
        return ret !== 0;
    }
    /**
     * @returns {string}
     */
    to_json() {
        let deferred1_0;
        let deferred1_1;
        try {
            const ret = wasm.healthcheck_to_json(this.__wbg_ptr);
            deferred1_0 = ret[0];
            deferred1_1 = ret[1];
            return getStringFromWasm0(ret[0], ret[1]);
        } finally {
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }
}

const HierarchicalKeyDerivationFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_hierarchicalkeyderivation_free(ptr >>> 0, 1));

export class HierarchicalKeyDerivation {

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        HierarchicalKeyDerivationFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_hierarchicalkeyderivation_free(ptr, 0);
    }
    constructor() {
        const ret = wasm.hierarchicalkeyderivation_new();
        this.__wbg_ptr = ret >>> 0;
        HierarchicalKeyDerivationFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
    /**
     * @param {Uint8Array} seed
     */
    initializeWithSeed(seed) {
        const ptr0 = passArray8ToWasm0(seed, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.hierarchicalkeyderivation_initializeWithSeed(this.__wbg_ptr, ptr0, len0);
        if (ret[1]) {
            throw takeFromExternrefTable0(ret[0]);
        }
    }
    /**
     * @param {string} category_str
     * @param {string} device_id
     * @returns {Uint8Array}
     */
    deriveDataCategoryKey(category_str, device_id) {
        const ptr0 = passStringToWasm0(category_str, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passStringToWasm0(device_id, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len1 = WASM_VECTOR_LEN;
        const ret = wasm.hierarchicalkeyderivation_deriveDataCategoryKey(this.__wbg_ptr, ptr0, len0, ptr1, len1);
        if (ret[3]) {
            throw takeFromExternrefTable0(ret[2]);
        }
        var v3 = getArrayU8FromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
        return v3;
    }
    /**
     * @param {string} path_str
     * @returns {Uint8Array}
     */
    deriveKeyAtPath(path_str) {
        const ptr0 = passStringToWasm0(path_str, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.hierarchicalkeyderivation_deriveKeyAtPath(this.__wbg_ptr, ptr0, len0);
        if (ret[3]) {
            throw takeFromExternrefTable0(ret[2]);
        }
        var v2 = getArrayU8FromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
        return v2;
    }
    rotateKeys() {
        const ret = wasm.hierarchicalkeyderivation_rotateKeys(this.__wbg_ptr);
        if (ret[1]) {
            throw takeFromExternrefTable0(ret[0]);
        }
    }
    /**
     * @returns {number}
     */
    get keyVersion() {
        const ret = wasm.hierarchicalkeyderivation_keyVersion(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * @param {string} device_id
     * @returns {boolean}
     */
    verifyKeyIsolation(device_id) {
        const ptr0 = passStringToWasm0(device_id, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.hierarchicalkeyderivation_verifyKeyIsolation(this.__wbg_ptr, ptr0, len0);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return ret[0] !== 0;
    }
}

const KDFParamsFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_kdfparams_free(ptr >>> 0, 1));

export class KDFParams {

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        KDFParamsFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_kdfparams_free(ptr, 0);
    }
    /**
     * @param {string} algorithm
     * @param {number} iterations
     */
    constructor(algorithm, iterations) {
        const ptr0 = passStringToWasm0(algorithm, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.kdfparams_new(ptr0, len0, iterations);
        this.__wbg_ptr = ret >>> 0;
        KDFParamsFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
    /**
     * @returns {string}
     */
    get algorithm() {
        let deferred1_0;
        let deferred1_1;
        try {
            const ret = wasm.kdfparams_algorithm(this.__wbg_ptr);
            deferred1_0 = ret[0];
            deferred1_1 = ret[1];
            return getStringFromWasm0(ret[0], ret[1]);
        } finally {
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }
    /**
     * @returns {number}
     */
    get iterations() {
        const ret = wasm.kdfparams_iterations(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * @param {number} memory_cost
     */
    set_memory_cost(memory_cost) {
        wasm.kdfparams_set_memory_cost(this.__wbg_ptr, memory_cost);
    }
    /**
     * @param {number} parallelism
     */
    set_parallelism(parallelism) {
        wasm.kdfparams_set_parallelism(this.__wbg_ptr, parallelism);
    }
}

const KeyBackupFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_keybackup_free(ptr >>> 0, 1));
/**
 * Key backup information for secure escrow
 */
export class KeyBackup {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(KeyBackup.prototype);
        obj.__wbg_ptr = ptr;
        KeyBackupFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        KeyBackupFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_keybackup_free(ptr, 0);
    }
    /**
     * @param {string} backup_id
     * @param {string} device_id
     * @param {Uint8Array} encrypted_master_key
     * @param {Uint8Array} recovery_phrase_hash
     * @param {Uint8Array} passkey_challenge
     * @param {bigint} backup_timestamp
     * @param {number} version
     * @param {string} metadata
     */
    constructor(backup_id, device_id, encrypted_master_key, recovery_phrase_hash, passkey_challenge, backup_timestamp, version, metadata) {
        const ptr0 = passStringToWasm0(backup_id, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passStringToWasm0(device_id, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len1 = WASM_VECTOR_LEN;
        const ptr2 = passArray8ToWasm0(encrypted_master_key, wasm.__wbindgen_malloc);
        const len2 = WASM_VECTOR_LEN;
        const ptr3 = passArray8ToWasm0(recovery_phrase_hash, wasm.__wbindgen_malloc);
        const len3 = WASM_VECTOR_LEN;
        const ptr4 = passArray8ToWasm0(passkey_challenge, wasm.__wbindgen_malloc);
        const len4 = WASM_VECTOR_LEN;
        const ptr5 = passStringToWasm0(metadata, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len5 = WASM_VECTOR_LEN;
        const ret = wasm.keybackup_new(ptr0, len0, ptr1, len1, ptr2, len2, ptr3, len3, ptr4, len4, backup_timestamp, version, ptr5, len5);
        this.__wbg_ptr = ret >>> 0;
        KeyBackupFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
    /**
     * @returns {string}
     */
    get backup_id() {
        let deferred1_0;
        let deferred1_1;
        try {
            const ret = wasm.keybackup_backup_id(this.__wbg_ptr);
            deferred1_0 = ret[0];
            deferred1_1 = ret[1];
            return getStringFromWasm0(ret[0], ret[1]);
        } finally {
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }
    /**
     * @returns {string}
     */
    get device_id() {
        let deferred1_0;
        let deferred1_1;
        try {
            const ret = wasm.keybackup_device_id(this.__wbg_ptr);
            deferred1_0 = ret[0];
            deferred1_1 = ret[1];
            return getStringFromWasm0(ret[0], ret[1]);
        } finally {
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }
    /**
     * @returns {Uint8Array}
     */
    get encrypted_master_key() {
        const ret = wasm.keybackup_encrypted_master_key(this.__wbg_ptr);
        var v1 = getArrayU8FromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
        return v1;
    }
    /**
     * @returns {Uint8Array}
     */
    get recovery_phrase_hash() {
        const ret = wasm.keybackup_recovery_phrase_hash(this.__wbg_ptr);
        var v1 = getArrayU8FromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
        return v1;
    }
    /**
     * @returns {Uint8Array}
     */
    get passkey_challenge() {
        const ret = wasm.keybackup_passkey_challenge(this.__wbg_ptr);
        var v1 = getArrayU8FromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
        return v1;
    }
    /**
     * @returns {bigint}
     */
    get backup_timestamp() {
        const ret = wasm.keybackup_backup_timestamp(this.__wbg_ptr);
        return BigInt.asUintN(64, ret);
    }
    /**
     * @returns {number}
     */
    get version() {
        const ret = wasm.keybackup_version(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * @returns {string}
     */
    get metadata() {
        let deferred1_0;
        let deferred1_1;
        try {
            const ret = wasm.keybackup_metadata(this.__wbg_ptr);
            deferred1_0 = ret[0];
            deferred1_1 = ret[1];
            return getStringFromWasm0(ret[0], ret[1]);
        } finally {
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }
}

const KeyMigrationHelperFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_keymigrationhelper_free(ptr >>> 0, 1));
/**
 * Migration utilities for progressive key transitions
 */
export class KeyMigrationHelper {

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        KeyMigrationHelperFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_keymigrationhelper_free(ptr, 0);
    }
    /**
     * Parse version string to KeyVersion
     * @param {string} version_str
     * @returns {KeyVersion | undefined}
     */
    static parse_version_string(version_str) {
        const ptr0 = passStringToWasm0(version_str, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.keymigrationhelper_parse_version_string(ptr0, len0);
        return ret === 0 ? undefined : KeyVersion.__wrap(ret);
    }
    /**
     * Validate version format
     * @param {string} version_str
     * @returns {boolean}
     */
    static validate_version_format(version_str) {
        const ptr0 = passStringToWasm0(version_str, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.keymigrationhelper_validate_version_format(ptr0, len0);
        return ret !== 0;
    }
    /**
     * Calculate migration progress based on data reencryption
     * @param {number} total_records
     * @param {number} migrated_records
     * @param {number} failed_records
     * @returns {object}
     */
    static calculate_migration_progress(total_records, migrated_records, failed_records) {
        const ret = wasm.keymigrationhelper_calculate_migration_progress(total_records, migrated_records, failed_records);
        return ret;
    }
    /**
     * Validate migration readiness
     * @param {VersionedKey} current_key
     * @param {VersionedKey} new_key
     * @returns {object}
     */
    static validate_migration_readiness(current_key, new_key) {
        _assertClass(current_key, VersionedKey);
        _assertClass(new_key, VersionedKey);
        const ret = wasm.keymigrationhelper_validate_migration_readiness(current_key.__wbg_ptr, new_key.__wbg_ptr);
        return ret;
    }
    /**
     * Create migration batch for progressive processing
     * @param {Array<any>} data_identifiers
     * @param {number} batch_size
     * @param {number} start_index
     * @returns {object}
     */
    static create_migration_batch(data_identifiers, batch_size, start_index) {
        const ret = wasm.keymigrationhelper_create_migration_batch(data_identifiers, batch_size, start_index);
        return ret;
    }
    /**
     * Validate migration rollback safety
     * @param {VersionedKey} current_key
     * @param {KeyVersion} rollback_version
     * @returns {boolean}
     */
    static validate_rollback_safety(current_key, rollback_version) {
        _assertClass(current_key, VersionedKey);
        _assertClass(rollback_version, KeyVersion);
        const ret = wasm.keymigrationhelper_validate_rollback_safety(current_key.__wbg_ptr, rollback_version.__wbg_ptr);
        return ret !== 0;
    }
}

const KeyRotationManagerFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_keyrotationmanager_free(ptr >>> 0, 1));
/**
 * Main key rotation manager orchestrating the entire lifecycle
 */
export class KeyRotationManager {

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        KeyRotationManagerFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_keyrotationmanager_free(ptr, 0);
    }
    /**
     * @param {HierarchicalKeyDerivation} hd_derivation
     */
    constructor(hd_derivation) {
        _assertClass(hd_derivation, HierarchicalKeyDerivation);
        var ptr0 = hd_derivation.__destroy_into_raw();
        const ret = wasm.keyrotationmanager_new(ptr0);
        this.__wbg_ptr = ret >>> 0;
        KeyRotationManagerFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
    /**
     * @param {DataCategory} purpose
     * @returns {VersionedKey | undefined}
     */
    get_active_key(purpose) {
        const ret = wasm.keyrotationmanager_get_active_key(this.__wbg_ptr, purpose);
        return ret === 0 ? undefined : VersionedKey.__wrap(ret);
    }
    /**
     * @param {DataCategory} purpose
     * @param {KeyVersion} version
     * @returns {VersionedKey | undefined}
     */
    get_key_by_version(purpose, version) {
        _assertClass(version, KeyVersion);
        const ret = wasm.keyrotationmanager_get_key_by_version(this.__wbg_ptr, purpose, version.__wbg_ptr);
        return ret === 0 ? undefined : VersionedKey.__wrap(ret);
    }
    /**
     * @param {DataCategory} purpose
     * @returns {VersionedKey}
     */
    create_new_key_version(purpose) {
        const ret = wasm.keyrotationmanager_create_new_key_version(this.__wbg_ptr, purpose);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return VersionedKey.__wrap(ret[0]);
    }
    /**
     * @param {DataCategory} purpose
     */
    complete_key_migration(purpose) {
        const ret = wasm.keyrotationmanager_complete_key_migration(this.__wbg_ptr, purpose);
        if (ret[1]) {
            throw takeFromExternrefTable0(ret[0]);
        }
    }
    /**
     * @returns {KeyRotationScheduler}
     */
    get_scheduler() {
        const ret = wasm.keyrotationmanager_get_scheduler(this.__wbg_ptr);
        return KeyRotationScheduler.__wrap(ret);
    }
    /**
     * @param {DataCategory} purpose
     * @param {RotationPolicy} policy
     */
    set_rotation_policy(purpose, policy) {
        _assertClass(policy, RotationPolicy);
        var ptr0 = policy.__destroy_into_raw();
        wasm.keyrotationmanager_set_rotation_policy(this.__wbg_ptr, purpose, ptr0);
    }
    /**
     * @returns {Array<any>}
     */
    check_rotation_due() {
        const ret = wasm.keyrotationmanager_check_rotation_due(this.__wbg_ptr);
        return ret;
    }
    /**
     * @param {DataCategory} purpose
     * @returns {Array<any>}
     */
    get_key_versions_for_purpose(purpose) {
        const ret = wasm.keyrotationmanager_get_key_versions_for_purpose(this.__wbg_ptr, purpose);
        return ret;
    }
    /**
     * @returns {number}
     */
    cleanup_expired_keys() {
        const ret = wasm.keyrotationmanager_cleanup_expired_keys(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * @returns {object}
     */
    get_key_rotation_analytics() {
        const ret = wasm.keyrotationmanager_get_key_rotation_analytics(this.__wbg_ptr);
        return ret;
    }
    /**
     * @param {DataCategory} purpose
     * @returns {VersionedKey}
     */
    force_rotate_key(purpose) {
        const ret = wasm.keyrotationmanager_force_rotate_key(this.__wbg_ptr, purpose);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return VersionedKey.__wrap(ret[0]);
    }
    /**
     * @param {DataCategory} purpose
     * @returns {number | undefined}
     */
    get_migration_progress(purpose) {
        const ret = wasm.keyrotationmanager_get_migration_progress(this.__wbg_ptr, purpose);
        return ret === 0x100000001 ? undefined : ret;
    }
    /**
     * @param {DataCategory} purpose
     * @param {number} progress
     */
    update_migration_progress(purpose, progress) {
        const ret = wasm.keyrotationmanager_update_migration_progress(this.__wbg_ptr, purpose, progress);
        if (ret[1]) {
            throw takeFromExternrefTable0(ret[0]);
        }
    }
}

const KeyRotationSchedulerFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_keyrotationscheduler_free(ptr >>> 0, 1));
/**
 * Automated key rotation scheduler with policy-based management
 */
export class KeyRotationScheduler {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(KeyRotationScheduler.prototype);
        obj.__wbg_ptr = ptr;
        KeyRotationSchedulerFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        KeyRotationSchedulerFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_keyrotationscheduler_free(ptr, 0);
    }
    constructor() {
        const ret = wasm.keyrotationscheduler_new();
        this.__wbg_ptr = ret >>> 0;
        KeyRotationSchedulerFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
    /**
     * @param {string} purpose
     * @param {RotationPolicy} policy
     */
    set_rotation_policy(purpose, policy) {
        const ptr0 = passStringToWasm0(purpose, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        _assertClass(policy, RotationPolicy);
        var ptr1 = policy.__destroy_into_raw();
        wasm.keyrotationscheduler_set_rotation_policy(this.__wbg_ptr, ptr0, len0, ptr1);
    }
    /**
     * @param {string} purpose
     * @returns {boolean}
     */
    is_rotation_due(purpose) {
        const ptr0 = passStringToWasm0(purpose, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.keyrotationscheduler_is_rotation_due(this.__wbg_ptr, ptr0, len0);
        return ret !== 0;
    }
    /**
     * @param {string} purpose
     * @returns {number | undefined}
     */
    get_next_rotation_time(purpose) {
        const ptr0 = passStringToWasm0(purpose, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.keyrotationscheduler_get_next_rotation_time(this.__wbg_ptr, ptr0, len0);
        return ret[0] === 0 ? undefined : ret[1];
    }
    /**
     * @param {string} purpose
     * @returns {number | undefined}
     */
    get_time_until_rotation(purpose) {
        const ptr0 = passStringToWasm0(purpose, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.keyrotationscheduler_get_time_until_rotation(this.__wbg_ptr, ptr0, len0);
        return ret[0] === 0 ? undefined : ret[1];
    }
    /**
     * @param {string} purpose
     */
    force_rotation(purpose) {
        const ptr0 = passStringToWasm0(purpose, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.keyrotationscheduler_force_rotation(this.__wbg_ptr, ptr0, len0);
    }
    /**
     * @param {string} purpose
     */
    update_next_rotation(purpose) {
        const ptr0 = passStringToWasm0(purpose, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.keyrotationscheduler_update_next_rotation(this.__wbg_ptr, ptr0, len0);
    }
    /**
     * @returns {Array<any>}
     */
    get_all_scheduled_rotations() {
        const ret = wasm.keyrotationscheduler_get_all_scheduled_rotations(this.__wbg_ptr);
        return ret;
    }
    /**
     * @param {number} hours
     * @returns {Array<any>}
     */
    get_rotations_due_within(hours) {
        const ret = wasm.keyrotationscheduler_get_rotations_due_within(this.__wbg_ptr, hours);
        return ret;
    }
    /**
     * @param {string} purpose
     * @param {number} additional_days
     */
    postpone_rotation(purpose, additional_days) {
        const ptr0 = passStringToWasm0(purpose, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.keyrotationscheduler_postpone_rotation(this.__wbg_ptr, ptr0, len0, additional_days);
        if (ret[1]) {
            throw takeFromExternrefTable0(ret[0]);
        }
    }
    /**
     * @param {string} purpose
     * @param {number} timestamp_ms
     */
    schedule_rotation_at(purpose, timestamp_ms) {
        const ptr0 = passStringToWasm0(purpose, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.keyrotationscheduler_schedule_rotation_at(this.__wbg_ptr, ptr0, len0, timestamp_ms);
        if (ret[1]) {
            throw takeFromExternrefTable0(ret[0]);
        }
    }
    /**
     * @param {string} purpose
     * @param {boolean} enabled
     */
    enable_automatic_rotation(purpose, enabled) {
        const ptr0 = passStringToWasm0(purpose, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.keyrotationscheduler_enable_automatic_rotation(this.__wbg_ptr, ptr0, len0, enabled);
        if (ret[1]) {
            throw takeFromExternrefTable0(ret[0]);
        }
    }
    /**
     * @returns {object}
     */
    get_rotation_statistics() {
        const ret = wasm.keyrotationscheduler_get_rotation_statistics(this.__wbg_ptr);
        return ret;
    }
    /**
     * @returns {number}
     */
    cleanup_expired_schedules() {
        const ret = wasm.keyrotationscheduler_cleanup_expired_schedules(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * @param {UserRotationPreferences} preferences
     */
    setUserPreferences(preferences) {
        _assertClass(preferences, UserRotationPreferences);
        var ptr0 = preferences.__destroy_into_raw();
        wasm.keyrotationscheduler_setUserPreferences(this.__wbg_ptr, ptr0);
    }
    /**
     * @returns {UserRotationPreferences}
     */
    getUserPreferences() {
        const ret = wasm.keyrotationscheduler_getUserPreferences(this.__wbg_ptr);
        return UserRotationPreferences.__wrap(ret);
    }
    /**
     * @param {string} preference_type
     * @param {string} value
     */
    updateUserPreference(preference_type, value) {
        const ptr0 = passStringToWasm0(preference_type, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passStringToWasm0(value, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len1 = WASM_VECTOR_LEN;
        const ret = wasm.keyrotationscheduler_updateUserPreference(this.__wbg_ptr, ptr0, len0, ptr1, len1);
        if (ret[1]) {
            throw takeFromExternrefTable0(ret[0]);
        }
    }
    /**
     * @param {SecurityEvent} event
     * @returns {boolean}
     */
    reportSecurityEvent(event) {
        _assertClass(event, SecurityEvent);
        var ptr0 = event.__destroy_into_raw();
        const ret = wasm.keyrotationscheduler_reportSecurityEvent(this.__wbg_ptr, ptr0);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return ret[0] !== 0;
    }
    /**
     * @param {number} hours
     * @returns {Array<any>}
     */
    getRecentSecurityEvents(hours) {
        const ret = wasm.keyrotationscheduler_getRecentSecurityEvents(this.__wbg_ptr, hours);
        return ret;
    }
    /**
     * @param {string} purpose
     */
    trackKeyUsage(purpose) {
        const ptr0 = passStringToWasm0(purpose, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.keyrotationscheduler_trackKeyUsage(this.__wbg_ptr, ptr0, len0);
    }
    /**
     * @param {string} purpose
     * @returns {bigint}
     */
    getUsageCount(purpose) {
        const ptr0 = passStringToWasm0(purpose, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.keyrotationscheduler_getUsageCount(this.__wbg_ptr, ptr0, len0);
        return BigInt.asUintN(64, ret);
    }
    /**
     * @param {string} purpose
     */
    resetUsageCount(purpose) {
        const ptr0 = passStringToWasm0(purpose, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.keyrotationscheduler_resetUsageCount(this.__wbg_ptr, ptr0, len0);
    }
    /**
     * @param {string} purpose
     * @returns {number}
     */
    scheduleRotationWithPreferences(purpose) {
        const ptr0 = passStringToWasm0(purpose, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.keyrotationscheduler_scheduleRotationWithPreferences(this.__wbg_ptr, ptr0, len0);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return ret[0];
    }
    /**
     * @param {string} purpose
     * @param {boolean} is_user_active
     * @returns {boolean}
     */
    isRotationAllowedNow(purpose, is_user_active) {
        const ptr0 = passStringToWasm0(purpose, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.keyrotationscheduler_isRotationAllowedNow(this.__wbg_ptr, ptr0, len0, is_user_active);
        return ret !== 0;
    }
    /**
     * @param {string} trigger_type
     * @param {string} description
     * @param {string[]} affected_devices
     * @param {number} severity
     * @returns {string}
     */
    triggerEmergencyIncident(trigger_type, description, affected_devices, severity) {
        let deferred5_0;
        let deferred5_1;
        try {
            const ptr0 = passStringToWasm0(trigger_type, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            const len0 = WASM_VECTOR_LEN;
            const ptr1 = passStringToWasm0(description, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            const len1 = WASM_VECTOR_LEN;
            const ptr2 = passArrayJsValueToWasm0(affected_devices, wasm.__wbindgen_malloc);
            const len2 = WASM_VECTOR_LEN;
            const ret = wasm.keyrotationscheduler_triggerEmergencyIncident(this.__wbg_ptr, ptr0, len0, ptr1, len1, ptr2, len2, severity);
            var ptr4 = ret[0];
            var len4 = ret[1];
            if (ret[3]) {
                ptr4 = 0; len4 = 0;
                throw takeFromExternrefTable0(ret[2]);
            }
            deferred5_0 = ptr4;
            deferred5_1 = len4;
            return getStringFromWasm0(ptr4, len4);
        } finally {
            wasm.__wbindgen_free(deferred5_0, deferred5_1, 1);
        }
    }
    /**
     * @param {string} device_id
     * @param {string} event_data
     * @returns {boolean}
     */
    detectSecurityIncident(device_id, event_data) {
        const ptr0 = passStringToWasm0(device_id, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passStringToWasm0(event_data, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len1 = WASM_VECTOR_LEN;
        const ret = wasm.keyrotationscheduler_detectSecurityIncident(this.__wbg_ptr, ptr0, len0, ptr1, len1);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return ret[0] !== 0;
    }
    /**
     * @returns {string}
     */
    getActiveIncidents() {
        let deferred2_0;
        let deferred2_1;
        try {
            const ret = wasm.keyrotationscheduler_getActiveIncidents(this.__wbg_ptr);
            var ptr1 = ret[0];
            var len1 = ret[1];
            if (ret[3]) {
                ptr1 = 0; len1 = 0;
                throw takeFromExternrefTable0(ret[2]);
            }
            deferred2_0 = ptr1;
            deferred2_1 = len1;
            return getStringFromWasm0(ptr1, len1);
        } finally {
            wasm.__wbindgen_free(deferred2_0, deferred2_1, 1);
        }
    }
    /**
     * @param {string} thresholds
     */
    updateIncidentDetectionThresholds(thresholds) {
        const ptr0 = passStringToWasm0(thresholds, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.keyrotationscheduler_updateIncidentDetectionThresholds(this.__wbg_ptr, ptr0, len0);
        if (ret[1]) {
            throw takeFromExternrefTable0(ret[0]);
        }
    }
}

const KeyVersionFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_keyversion_free(ptr >>> 0, 1));
/**
 * Version information for cryptographic keys
 */
export class KeyVersion {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(KeyVersion.prototype);
        obj.__wbg_ptr = ptr;
        KeyVersionFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        KeyVersionFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_keyversion_free(ptr, 0);
    }
    /**
     * @param {number} major
     * @param {number} minor
     * @param {number} patch
     */
    constructor(major, minor, patch) {
        const ret = wasm.keyversion_new(major, minor, patch);
        this.__wbg_ptr = ret >>> 0;
        KeyVersionFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
    /**
     * @returns {number}
     */
    get major() {
        const ret = wasm.keyversion_major(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * @returns {number}
     */
    get minor() {
        const ret = wasm.keyversion_minor(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * @returns {number}
     */
    get patch() {
        const ret = wasm.keyversion_patch(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * @returns {number}
     */
    get created_at() {
        const ret = wasm.keyversion_created_at(this.__wbg_ptr);
        return ret;
    }
    /**
     * @returns {number | undefined}
     */
    get expires_at() {
        const ret = wasm.keyversion_expires_at(this.__wbg_ptr);
        return ret[0] === 0 ? undefined : ret[1];
    }
    /**
     * @param {number} duration_days
     */
    setExpiration(duration_days) {
        const ret = wasm.keyversion_setExpiration(this.__wbg_ptr, duration_days);
        if (ret[1]) {
            throw takeFromExternrefTable0(ret[0]);
        }
    }
    /**
     * @returns {boolean}
     */
    isExpired() {
        const ret = wasm.keyversion_isExpired(this.__wbg_ptr);
        return ret !== 0;
    }
    /**
     * @returns {string}
     */
    toString() {
        let deferred1_0;
        let deferred1_1;
        try {
            const ret = wasm.keyversion_toString(this.__wbg_ptr);
            deferred1_0 = ret[0];
            deferred1_1 = ret[1];
            return getStringFromWasm0(ret[0], ret[1]);
        } finally {
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }
    /**
     * @param {KeyVersion} other
     * @returns {number}
     */
    compareVersion(other) {
        _assertClass(other, KeyVersion);
        const ret = wasm.keyversion_compareVersion(this.__wbg_ptr, other.__wbg_ptr);
        return ret;
    }
}

const LegacyKeyRetentionPolicyFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_legacykeyretentionpolicy_free(ptr >>> 0, 1));
/**
 * Legacy key retention policy for cleanup management
 */
export class LegacyKeyRetentionPolicy {

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        LegacyKeyRetentionPolicyFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_legacykeyretentionpolicy_free(ptr, 0);
    }
    /**
     * @param {number} max_legacy_versions
     * @param {number} min_retention_days
     */
    constructor(max_legacy_versions, min_retention_days) {
        const ret = wasm.legacykeyretentionpolicy_new(max_legacy_versions, min_retention_days);
        this.__wbg_ptr = ret >>> 0;
        LegacyKeyRetentionPolicyFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
    /**
     * @returns {number}
     */
    get max_legacy_versions() {
        const ret = wasm.legacykeyretentionpolicy_max_legacy_versions(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * @returns {number}
     */
    get min_retention_days() {
        const ret = wasm.legacykeyretentionpolicy_min_retention_days(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * @param {boolean} enabled
     */
    set auto_cleanup_enabled(enabled) {
        wasm.legacykeyretentionpolicy_set_auto_cleanup_enabled(this.__wbg_ptr, enabled);
    }
    /**
     * @returns {boolean}
     */
    get auto_cleanup_enabled() {
        const ret = wasm.legacykeyretentionpolicy_auto_cleanup_enabled(this.__wbg_ptr);
        return ret !== 0;
    }
    /**
     * @param {boolean} required
     */
    set require_migration_completion(required) {
        wasm.legacykeyretentionpolicy_set_require_migration_completion(this.__wbg_ptr, required);
    }
    /**
     * @returns {boolean}
     */
    get require_migration_completion() {
        const ret = wasm.legacykeyretentionpolicy_require_migration_completion(this.__wbg_ptr);
        return ret !== 0;
    }
}

const MasterKeyStorageInfoFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_masterkeystorageinfo_free(ptr >>> 0, 1));

export class MasterKeyStorageInfo {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(MasterKeyStorageInfo.prototype);
        obj.__wbg_ptr = ptr;
        MasterKeyStorageInfoFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        MasterKeyStorageInfoFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_masterkeystorageinfo_free(ptr, 0);
    }
    /**
     * @param {string} key_id
     * @param {string} device_id
     * @param {string} storage_location
     * @param {number} created_at
     * @param {number} last_accessed
     * @param {number} access_count
     * @param {SecureStoragePlatform} platform
     * @param {boolean} is_hardware_backed
     */
    constructor(key_id, device_id, storage_location, created_at, last_accessed, access_count, platform, is_hardware_backed) {
        const ptr0 = passStringToWasm0(key_id, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passStringToWasm0(device_id, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len1 = WASM_VECTOR_LEN;
        const ptr2 = passStringToWasm0(storage_location, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len2 = WASM_VECTOR_LEN;
        const ret = wasm.masterkeystorageinfo_new(ptr0, len0, ptr1, len1, ptr2, len2, created_at, last_accessed, access_count, platform, is_hardware_backed);
        this.__wbg_ptr = ret >>> 0;
        MasterKeyStorageInfoFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
    /**
     * @returns {string}
     */
    get key_id() {
        let deferred1_0;
        let deferred1_1;
        try {
            const ret = wasm.masterkeystorageinfo_key_id(this.__wbg_ptr);
            deferred1_0 = ret[0];
            deferred1_1 = ret[1];
            return getStringFromWasm0(ret[0], ret[1]);
        } finally {
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }
    /**
     * @returns {string}
     */
    get device_id() {
        let deferred1_0;
        let deferred1_1;
        try {
            const ret = wasm.masterkeystorageinfo_device_id(this.__wbg_ptr);
            deferred1_0 = ret[0];
            deferred1_1 = ret[1];
            return getStringFromWasm0(ret[0], ret[1]);
        } finally {
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }
    /**
     * @returns {string}
     */
    get storage_location() {
        let deferred1_0;
        let deferred1_1;
        try {
            const ret = wasm.masterkeystorageinfo_storage_location(this.__wbg_ptr);
            deferred1_0 = ret[0];
            deferred1_1 = ret[1];
            return getStringFromWasm0(ret[0], ret[1]);
        } finally {
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }
    /**
     * @returns {number}
     */
    get created_at() {
        const ret = wasm.masterkeystorageinfo_created_at(this.__wbg_ptr);
        return ret;
    }
    /**
     * @returns {number}
     */
    get last_accessed() {
        const ret = wasm.masterkeystorageinfo_last_accessed(this.__wbg_ptr);
        return ret;
    }
    /**
     * @returns {number}
     */
    get access_count() {
        const ret = wasm.masterkeystorageinfo_access_count(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * @returns {SecureStoragePlatform}
     */
    get platform() {
        const ret = wasm.masterkeystorageinfo_platform(this.__wbg_ptr);
        return ret;
    }
    /**
     * @returns {boolean}
     */
    get is_hardware_backed() {
        const ret = wasm.masterkeystorageinfo_is_hardware_backed(this.__wbg_ptr);
        return ret !== 0;
    }
}

const MemoryManagerFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_memorymanager_free(ptr >>> 0, 1));
/**
 * WASM-exposed memory utilities
 */
export class MemoryManager {

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        MemoryManagerFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_memorymanager_free(ptr, 0);
    }
    constructor() {
        const ret = wasm.memorymanager_new();
        this.__wbg_ptr = ret >>> 0;
        MemoryManagerFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
    /**
     * Force cleanup of all memory pools (emergency function)
     */
    emergency_cleanup() {
        wasm.memorymanager_emergency_cleanup(this.__wbg_ptr);
    }
    /**
     * Get memory usage statistics
     * @returns {string}
     */
    get_stats() {
        let deferred1_0;
        let deferred1_1;
        try {
            const ret = wasm.memorymanager_get_stats(this.__wbg_ptr);
            deferred1_0 = ret[0];
            deferred1_1 = ret[1];
            return getStringFromWasm0(ret[0], ret[1]);
        } finally {
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }
}

const MemoryProtectionFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_memoryprotection_free(ptr >>> 0, 1));
/**
 * Memory protection utilities
 */
export class MemoryProtection {

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        MemoryProtectionFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_memoryprotection_free(ptr, 0);
    }
    constructor() {
        const ret = wasm.memoryprotection_new();
        this.__wbg_ptr = ret >>> 0;
        MemoryProtectionFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
    /**
     * Check stack canary for buffer overflow detection
     * @param {bigint} canary
     * @returns {boolean}
     */
    check_canary(canary) {
        const ret = wasm.memoryprotection_check_canary(this.__wbg_ptr, canary);
        return ret !== 0;
    }
    /**
     * Get current canary value
     * @returns {bigint}
     */
    get canary_value() {
        const ret = wasm.memoryprotection_canary_value(this.__wbg_ptr);
        return BigInt.asUintN(64, ret);
    }
    /**
     * Validate buffer bounds to prevent overflow
     * @param {number} buffer_size
     * @param {number} offset
     * @param {number} length
     * @returns {boolean}
     */
    static validate_bounds(buffer_size, offset, length) {
        const ret = wasm.memoryprotection_validate_bounds(buffer_size, offset, length);
        return ret !== 0;
    }
}

const MigrationProgressFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_migrationprogress_free(ptr >>> 0, 1));
/**
 * Migration progress tracking
 */
export class MigrationProgress {

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        MigrationProgressFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_migrationprogress_free(ptr, 0);
    }
    /**
     * Create new migration progress tracker
     * @param {string} migration_id
     * @param {number} total_records
     */
    constructor(migration_id, total_records) {
        const ptr0 = passStringToWasm0(migration_id, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.migrationprogress_new(ptr0, len0, total_records);
        this.__wbg_ptr = ret >>> 0;
        MigrationProgressFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
    /**
     * Update progress with batch results
     * @param {number} processed
     * @param {number} failed
     * @param {number} batch_number
     * @param {number} processing_time_ms
     */
    update_progress(processed, failed, batch_number, processing_time_ms) {
        wasm.migrationprogress_update_progress(this.__wbg_ptr, processed, failed, batch_number, processing_time_ms);
    }
    /**
     * Get current progress as percentage
     * @returns {number}
     */
    get_completion_percentage() {
        const ret = wasm.migrationprogress_get_completion_percentage(this.__wbg_ptr);
        return ret;
    }
    /**
     * Get progress summary object
     * @returns {object}
     */
    get_progress_summary() {
        const ret = wasm.migrationprogress_get_progress_summary(this.__wbg_ptr);
        return ret;
    }
}

const ModuleIntegrityFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_moduleintegrity_free(ptr >>> 0, 1));
/**
 * Integrity verification for WASM module
 */
export class ModuleIntegrity {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(ModuleIntegrity.prototype);
        obj.__wbg_ptr = ptr;
        ModuleIntegrityFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        ModuleIntegrityFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_moduleintegrity_free(ptr, 0);
    }
    /**
     * Verify module integrity
     * @returns {ModuleIntegrity}
     */
    static verify_module() {
        const ret = wasm.moduleintegrity_verify_module();
        return ModuleIntegrity.__wrap(ret);
    }
    /**
     * @returns {string}
     */
    get checksum() {
        let deferred1_0;
        let deferred1_1;
        try {
            const ret = wasm.moduleintegrity_checksum(this.__wbg_ptr);
            deferred1_0 = ret[0];
            deferred1_1 = ret[1];
            return getStringFromWasm0(ret[0], ret[1]);
        } finally {
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }
    /**
     * @returns {boolean}
     */
    get verified() {
        const ret = wasm.moduleintegrity_verified(this.__wbg_ptr);
        return ret !== 0;
    }
}

const MultiDeviceProtocolFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_multideviceprotocol_free(ptr >>> 0, 1));
/**
 * Multi-device key exchange protocol manager
 */
export class MultiDeviceProtocol {

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        MultiDeviceProtocolFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_multideviceprotocol_free(ptr, 0);
    }
    /**
     * Create new multi-device protocol manager
     * @param {string} current_device_id
     * @param {number} trust_threshold
     * @param {number} max_devices
     */
    constructor(current_device_id, trust_threshold, max_devices) {
        const ptr0 = passStringToWasm0(current_device_id, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.multideviceprotocol_new(ptr0, len0, trust_threshold, max_devices);
        this.__wbg_ptr = ret >>> 0;
        MultiDeviceProtocolFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
    /**
     * Initialize protocol with hierarchical master key
     * @param {CryptoKey} master_key
     */
    initialize(master_key) {
        _assertClass(master_key, CryptoKey);
        const ret = wasm.multideviceprotocol_initialize(this.__wbg_ptr, master_key.__wbg_ptr);
        if (ret[1]) {
            throw takeFromExternrefTable0(ret[0]);
        }
    }
    /**
     * Generate device pairing request for initiating device pairing
     * @param {string} device_name
     * @param {string} device_type
     * @returns {DevicePairingRequest}
     */
    generate_pairing_request(device_name, device_type) {
        const ptr0 = passStringToWasm0(device_name, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passStringToWasm0(device_type, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len1 = WASM_VECTOR_LEN;
        const ret = wasm.multideviceprotocol_generate_pairing_request(this.__wbg_ptr, ptr0, len0, ptr1, len1);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return DevicePairingRequest.__wrap(ret[0]);
    }
    /**
     * Process incoming pairing request and generate response
     * @param {DevicePairingRequest} request
     * @returns {DevicePairingResponse}
     */
    process_pairing_request(request) {
        _assertClass(request, DevicePairingRequest);
        const ret = wasm.multideviceprotocol_process_pairing_request(this.__wbg_ptr, request.__wbg_ptr);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return DevicePairingResponse.__wrap(ret[0]);
    }
    /**
     * Finalize device pairing after successful response validation
     * @param {string} device_id
     * @param {boolean} validated
     */
    finalize_pairing(device_id, validated) {
        const ptr0 = passStringToWasm0(device_id, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.multideviceprotocol_finalize_pairing(this.__wbg_ptr, ptr0, len0, validated);
        if (ret[1]) {
            throw takeFromExternrefTable0(ret[0]);
        }
    }
    /**
     * Revoke device access and remove from trusted devices
     * @param {string} device_id
     */
    revoke_device(device_id) {
        const ptr0 = passStringToWasm0(device_id, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.multideviceprotocol_revoke_device(this.__wbg_ptr, ptr0, len0);
        if (ret[1]) {
            throw takeFromExternrefTable0(ret[0]);
        }
    }
    /**
     * Re-enroll previously revoked device
     * @param {string} device_id
     */
    reenroll_device(device_id) {
        const ptr0 = passStringToWasm0(device_id, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.multideviceprotocol_reenroll_device(this.__wbg_ptr, ptr0, len0);
        if (ret[1]) {
            throw takeFromExternrefTable0(ret[0]);
        }
    }
    /**
     * Update device synchronization timestamp
     * @param {string} device_id
     */
    update_device_sync(device_id) {
        const ptr0 = passStringToWasm0(device_id, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.multideviceprotocol_update_device_sync(this.__wbg_ptr, ptr0, len0);
        if (ret[1]) {
            throw takeFromExternrefTable0(ret[0]);
        }
    }
    /**
     * Get device trust status
     * @param {string} device_id
     * @returns {number}
     */
    get_device_status(device_id) {
        const ptr0 = passStringToWasm0(device_id, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.multideviceprotocol_get_device_status(this.__wbg_ptr, ptr0, len0);
        return ret;
    }
    /**
     * Get list of trusted devices
     * @returns {any[]}
     */
    get_trusted_devices() {
        const ret = wasm.multideviceprotocol_get_trusted_devices(this.__wbg_ptr);
        var v1 = getArrayJsValueFromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
        return v1;
    }
    /**
     * Clean up expired devices from registry
     * @param {bigint} ttl_seconds
     * @returns {number}
     */
    cleanup_expired_devices(ttl_seconds) {
        const ret = wasm.multideviceprotocol_cleanup_expired_devices(this.__wbg_ptr, ttl_seconds);
        return ret >>> 0;
    }
    /**
     * Get device registry statistics
     * @returns {any}
     */
    get_registry_stats() {
        const ret = wasm.multideviceprotocol_get_registry_stats(this.__wbg_ptr);
        return ret;
    }
    /**
     * Validate device authentication for cross-device operations
     * @param {string} device_id
     * @param {string} auth_token
     * @returns {boolean}
     */
    validate_device_auth(device_id, auth_token) {
        const ptr0 = passStringToWasm0(device_id, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passStringToWasm0(auth_token, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len1 = WASM_VECTOR_LEN;
        const ret = wasm.multideviceprotocol_validate_device_auth(this.__wbg_ptr, ptr0, len0, ptr1, len1);
        return ret !== 0;
    }
    /**
     * Get device count
     * @returns {number}
     */
    device_count() {
        const ret = wasm.multideviceprotocol_device_count(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * Check if device limit is reached
     * @returns {boolean}
     */
    is_device_limit_reached() {
        const ret = wasm.multideviceprotocol_is_device_limit_reached(this.__wbg_ptr);
        return ret !== 0;
    }
}

const PlatformEntropyFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_platformentropy_free(ptr >>> 0, 1));
/**
 * Platform-specific entropy collection
 */
export class PlatformEntropy {

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        PlatformEntropyFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_platformentropy_free(ptr, 0);
    }
    /**
     * Collect additional entropy from available sources
     * @returns {Uint8Array}
     */
    static collect_entropy() {
        const ret = wasm.platformentropy_collect_entropy();
        var v1 = getArrayU8FromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
        return v1;
    }
    /**
     * Estimate entropy quality (0-100 score)
     * @param {Uint8Array} data
     * @returns {number}
     */
    static estimate_entropy_quality(data) {
        const ptr0 = passArray8ToWasm0(data, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.platformentropy_estimate_entropy_quality(ptr0, len0);
        return ret;
    }
}

const PlatformSecureStorageFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_platformsecurestorage_free(ptr >>> 0, 1));

export class PlatformSecureStorage {

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        PlatformSecureStorageFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_platformsecurestorage_free(ptr, 0);
    }
    /**
     * @param {SecureStorageConfig} config
     */
    constructor(config) {
        _assertClass(config, SecureStorageConfig);
        var ptr0 = config.__destroy_into_raw();
        const ret = wasm.platformsecurestorage_new(ptr0);
        this.__wbg_ptr = ret >>> 0;
        PlatformSecureStorageFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
    /**
     * @returns {Promise<boolean>}
     */
    initialize() {
        const ret = wasm.platformsecurestorage_initialize(this.__wbg_ptr);
        return ret;
    }
    /**
     * @param {string} key_id
     * @returns {Promise<MasterKeyStorageInfo>}
     */
    generate_master_key(key_id) {
        const ptr0 = passStringToWasm0(key_id, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.platformsecurestorage_generate_master_key(this.__wbg_ptr, ptr0, len0);
        return ret;
    }
    /**
     * @param {string} key_id
     * @param {Uint8Array} key_material
     * @returns {Promise<string>}
     */
    store_master_key(key_id, key_material) {
        const ptr0 = passStringToWasm0(key_id, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passArray8ToWasm0(key_material, wasm.__wbindgen_malloc);
        const len1 = WASM_VECTOR_LEN;
        const ret = wasm.platformsecurestorage_store_master_key(this.__wbg_ptr, ptr0, len0, ptr1, len1);
        return ret;
    }
    /**
     * @param {string} key_id
     * @returns {Promise<Uint8Array>}
     */
    retrieve_master_key(key_id) {
        const ptr0 = passStringToWasm0(key_id, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.platformsecurestorage_retrieve_master_key(this.__wbg_ptr, ptr0, len0);
        return ret;
    }
    /**
     * @param {string} key_id
     * @returns {Promise<boolean>}
     */
    delete_master_key(key_id) {
        const ptr0 = passStringToWasm0(key_id, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.platformsecurestorage_delete_master_key(this.__wbg_ptr, ptr0, len0);
        return ret;
    }
    /**
     * @param {string} key_id
     * @returns {Promise<boolean>}
     */
    key_exists(key_id) {
        const ptr0 = passStringToWasm0(key_id, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.platformsecurestorage_key_exists(this.__wbg_ptr, ptr0, len0);
        return ret;
    }
    /**
     * @returns {HSMCapabilities | undefined}
     */
    get_hsm_capabilities() {
        const ret = wasm.platformsecurestorage_get_hsm_capabilities(this.__wbg_ptr);
        return ret === 0 ? undefined : HSMCapabilities.__wrap(ret);
    }
    /**
     * @returns {boolean}
     */
    is_hardware_backed() {
        const ret = wasm.platformsecurestorage_is_hardware_backed(this.__wbg_ptr);
        return ret !== 0;
    }
}

const ProgressiveMigrationManagerFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_progressivemigrationmanager_free(ptr >>> 0, 1));
/**
 * Progressive data migration system for batch re-encryption
 */
export class ProgressiveMigrationManager {

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        ProgressiveMigrationManagerFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_progressivemigrationmanager_free(ptr, 0);
    }
    /**
     * Create new progressive migration manager
     * @param {number} batch_size
     * @param {number} max_concurrent_batches
     */
    constructor(batch_size, max_concurrent_batches) {
        const ret = wasm.progressivemigrationmanager_new(batch_size, max_concurrent_batches);
        this.__wbg_ptr = ret >>> 0;
        ProgressiveMigrationManagerFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
    /**
     * Start new progressive migration with user timing preferences
     * @param {string} migration_id
     * @param {number} total_records
     * @param {string} timing_preferences
     * @returns {object}
     */
    start_migration(migration_id, total_records, timing_preferences) {
        const ptr0 = passStringToWasm0(migration_id, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passStringToWasm0(timing_preferences, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len1 = WASM_VECTOR_LEN;
        const ret = wasm.progressivemigrationmanager_start_migration(this.__wbg_ptr, ptr0, len0, total_records, ptr1, len1);
        return ret;
    }
    /**
     * Resume migration from checkpoint
     * @param {string} migration_id
     * @returns {object}
     */
    resume_migration(migration_id) {
        const ptr0 = passStringToWasm0(migration_id, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.progressivemigrationmanager_resume_migration(this.__wbg_ptr, ptr0, len0);
        return ret;
    }
    /**
     * Process next batch with integrity validation
     * @param {string} migration_id
     * @param {Array<any>} batch_data
     * @param {number} processed_count
     * @param {number} failed_count
     * @returns {object}
     */
    process_next_batch(migration_id, batch_data, processed_count, failed_count) {
        const ptr0 = passStringToWasm0(migration_id, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.progressivemigrationmanager_process_next_batch(this.__wbg_ptr, ptr0, len0, batch_data, processed_count, failed_count);
        return ret;
    }
    /**
     * Get migration progress status
     * @param {string} migration_id
     * @returns {object}
     */
    get_migration_progress(migration_id) {
        const ptr0 = passStringToWasm0(migration_id, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.progressivemigrationmanager_get_migration_progress(this.__wbg_ptr, ptr0, len0);
        return ret;
    }
    /**
     * Validate migration can be safely rolled back
     * @param {string} migration_id
     * @param {VersionedKey} current_key
     * @param {KeyVersion} rollback_version
     * @returns {object}
     */
    validate_rollback_safety(migration_id, current_key, rollback_version) {
        const ptr0 = passStringToWasm0(migration_id, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        _assertClass(current_key, VersionedKey);
        _assertClass(rollback_version, KeyVersion);
        const ret = wasm.progressivemigrationmanager_validate_rollback_safety(this.__wbg_ptr, ptr0, len0, current_key.__wbg_ptr, rollback_version.__wbg_ptr);
        return ret;
    }
    /**
     * Clear completed migration state
     * @param {string} migration_id
     * @returns {boolean}
     */
    clear_migration(migration_id) {
        const ptr0 = passStringToWasm0(migration_id, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.progressivemigrationmanager_clear_migration(this.__wbg_ptr, ptr0, len0);
        return ret !== 0;
    }
    /**
     * Get optimal batch size based on system performance
     * @param {number} total_records
     * @param {number} available_memory_mb
     * @param {number} target_processing_time_ms
     * @returns {number}
     */
    calculate_optimal_batch_size(total_records, available_memory_mb, target_processing_time_ms) {
        const ret = wasm.progressivemigrationmanager_calculate_optimal_batch_size(this.__wbg_ptr, total_records, available_memory_mb, target_processing_time_ms);
        return ret >>> 0;
    }
}

const RecoveryPhraseFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_recoveryphrase_free(ptr >>> 0, 1));
/**
 * Recovery phrase with BIP39 compatibility
 */
export class RecoveryPhrase {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(RecoveryPhrase.prototype);
        obj.__wbg_ptr = ptr;
        RecoveryPhraseFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        RecoveryPhraseFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_recoveryphrase_free(ptr, 0);
    }
    /**
     * Create new recovery phrase from entropy
     * @param {string[]} words
     * @param {string} entropy_hex
     * @param {string} checksum
     * @param {number} language
     * @param {number} word_count
     */
    constructor(words, entropy_hex, checksum, language, word_count) {
        const ptr0 = passArrayJsValueToWasm0(words, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passStringToWasm0(entropy_hex, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len1 = WASM_VECTOR_LEN;
        const ptr2 = passStringToWasm0(checksum, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len2 = WASM_VECTOR_LEN;
        const ret = wasm.recoveryphrase_new(ptr0, len0, ptr1, len1, ptr2, len2, language, word_count);
        this.__wbg_ptr = ret >>> 0;
        RecoveryPhraseFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
    /**
     * Generate new recovery phrase with specified entropy
     * @param {number} entropy_bits
     * @param {number} language
     * @returns {RecoveryPhrase}
     */
    static generate(entropy_bits, language) {
        const ret = wasm.recoveryphrase_generate(entropy_bits, language);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return RecoveryPhrase.__wrap(ret[0]);
    }
    /**
     * Validate recovery phrase checksum
     * @returns {boolean}
     */
    validate() {
        const ret = wasm.recoveryphrase_validate(this.__wbg_ptr);
        return ret !== 0;
    }
    /**
     * Convert recovery phrase to seed
     * @param {string} passphrase
     * @returns {Uint8Array}
     */
    to_seed(passphrase) {
        const ptr0 = passStringToWasm0(passphrase, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.recoveryphrase_to_seed(this.__wbg_ptr, ptr0, len0);
        if (ret[3]) {
            throw takeFromExternrefTable0(ret[2]);
        }
        var v2 = getArrayU8FromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
        return v2;
    }
    /**
     * @returns {string[]}
     */
    get words() {
        const ret = wasm.recoveryphrase_words(this.__wbg_ptr);
        var v1 = getArrayJsValueFromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
        return v1;
    }
    /**
     * @returns {string}
     */
    get entropy_hex() {
        let deferred1_0;
        let deferred1_1;
        try {
            const ret = wasm.recoveryphrase_entropy_hex(this.__wbg_ptr);
            deferred1_0 = ret[0];
            deferred1_1 = ret[1];
            return getStringFromWasm0(ret[0], ret[1]);
        } finally {
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }
    /**
     * @returns {string}
     */
    get checksum() {
        let deferred1_0;
        let deferred1_1;
        try {
            const ret = wasm.recoveryphrase_checksum(this.__wbg_ptr);
            deferred1_0 = ret[0];
            deferred1_1 = ret[1];
            return getStringFromWasm0(ret[0], ret[1]);
        } finally {
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }
    /**
     * @returns {number}
     */
    get language() {
        const ret = wasm.recoveryphrase_language(this.__wbg_ptr);
        return ret;
    }
    /**
     * @returns {number}
     */
    get word_count() {
        const ret = wasm.recoveryphrase_word_count(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * Get recovery phrase as space-separated string
     * @returns {string}
     */
    phrase_string() {
        let deferred1_0;
        let deferred1_1;
        try {
            const ret = wasm.recoveryphrase_phrase_string(this.__wbg_ptr);
            deferred1_0 = ret[0];
            deferred1_1 = ret[1];
            return getStringFromWasm0(ret[0], ret[1]);
        } finally {
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }
}

const RecoverySystemFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_recoverysystem_free(ptr >>> 0, 1));
/**
 * Recovery system manager integrating with Passkeys authentication
 */
export class RecoverySystem {

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        RecoverySystemFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_recoverysystem_free(ptr, 0);
    }
    /**
     * Create new recovery system
     * @param {string} device_id
     * @param {number} validation_level
     * @param {number} max_attempts
     * @param {bigint} lockout_duration_ms
     */
    constructor(device_id, validation_level, max_attempts, lockout_duration_ms) {
        const ptr0 = passStringToWasm0(device_id, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.recoverysystem_new(ptr0, len0, validation_level, max_attempts, lockout_duration_ms);
        this.__wbg_ptr = ret >>> 0;
        RecoverySystemFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
    /**
     * Create key backup with recovery phrase and passkey integration
     * @param {CryptoKey} hierarchical_key
     * @param {RecoveryPhrase} recovery_phrase
     * @param {Uint8Array} passkey_challenge
     * @returns {KeyBackup}
     */
    create_backup(hierarchical_key, recovery_phrase, passkey_challenge) {
        _assertClass(hierarchical_key, CryptoKey);
        _assertClass(recovery_phrase, RecoveryPhrase);
        const ptr0 = passArray8ToWasm0(passkey_challenge, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.recoverysystem_create_backup(this.__wbg_ptr, hierarchical_key.__wbg_ptr, recovery_phrase.__wbg_ptr, ptr0, len0);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return KeyBackup.__wrap(ret[0]);
    }
    /**
     * Initiate recovery process with Passkeys authentication
     * @param {string} backup_id
     * @param {RecoveryPhrase} recovery_phrase
     * @param {Uint8Array} passkey_response
     * @returns {string}
     */
    initiate_recovery(backup_id, recovery_phrase, passkey_response) {
        let deferred4_0;
        let deferred4_1;
        try {
            const ptr0 = passStringToWasm0(backup_id, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            const len0 = WASM_VECTOR_LEN;
            _assertClass(recovery_phrase, RecoveryPhrase);
            const ptr1 = passArray8ToWasm0(passkey_response, wasm.__wbindgen_malloc);
            const len1 = WASM_VECTOR_LEN;
            const ret = wasm.recoverysystem_initiate_recovery(this.__wbg_ptr, ptr0, len0, recovery_phrase.__wbg_ptr, ptr1, len1);
            var ptr3 = ret[0];
            var len3 = ret[1];
            if (ret[3]) {
                ptr3 = 0; len3 = 0;
                throw takeFromExternrefTable0(ret[2]);
            }
            deferred4_0 = ptr3;
            deferred4_1 = len3;
            return getStringFromWasm0(ptr3, len3);
        } finally {
            wasm.__wbindgen_free(deferred4_0, deferred4_1, 1);
        }
    }
    /**
     * Complete recovery and restore hierarchical key
     * @param {string} backup_id
     * @param {string} recovery_token
     * @param {RecoveryPhrase} recovery_phrase
     * @returns {Uint8Array}
     */
    complete_recovery(backup_id, recovery_token, recovery_phrase) {
        const ptr0 = passStringToWasm0(backup_id, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passStringToWasm0(recovery_token, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len1 = WASM_VECTOR_LEN;
        _assertClass(recovery_phrase, RecoveryPhrase);
        const ret = wasm.recoverysystem_complete_recovery(this.__wbg_ptr, ptr0, len0, ptr1, len1, recovery_phrase.__wbg_ptr);
        if (ret[3]) {
            throw takeFromExternrefTable0(ret[2]);
        }
        var v3 = getArrayU8FromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
        return v3;
    }
    /**
     * Emergency recovery with enhanced validation
     * @param {string} backup_id
     * @param {RecoveryPhrase} recovery_phrase
     * @param {string} emergency_code
     * @param {Uint8Array} passkey_response
     * @returns {string}
     */
    emergency_recovery(backup_id, recovery_phrase, emergency_code, passkey_response) {
        let deferred5_0;
        let deferred5_1;
        try {
            const ptr0 = passStringToWasm0(backup_id, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            const len0 = WASM_VECTOR_LEN;
            _assertClass(recovery_phrase, RecoveryPhrase);
            const ptr1 = passStringToWasm0(emergency_code, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            const len1 = WASM_VECTOR_LEN;
            const ptr2 = passArray8ToWasm0(passkey_response, wasm.__wbindgen_malloc);
            const len2 = WASM_VECTOR_LEN;
            const ret = wasm.recoverysystem_emergency_recovery(this.__wbg_ptr, ptr0, len0, recovery_phrase.__wbg_ptr, ptr1, len1, ptr2, len2);
            var ptr4 = ret[0];
            var len4 = ret[1];
            if (ret[3]) {
                ptr4 = 0; len4 = 0;
                throw takeFromExternrefTable0(ret[2]);
            }
            deferred5_0 = ptr4;
            deferred5_1 = len4;
            return getStringFromWasm0(ptr4, len4);
        } finally {
            wasm.__wbindgen_free(deferred5_0, deferred5_1, 1);
        }
    }
    /**
     * Validate emergency delay has passed
     * @param {string} delay_token
     * @returns {boolean}
     */
    validate_emergency_delay(delay_token) {
        const ptr0 = passStringToWasm0(delay_token, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.recoverysystem_validate_emergency_delay(this.__wbg_ptr, ptr0, len0);
        return ret !== 0;
    }
    /**
     * List available backups for device
     * @returns {any[]}
     */
    list_backups() {
        const ret = wasm.recoverysystem_list_backups(this.__wbg_ptr);
        var v1 = getArrayJsValueFromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
        return v1;
    }
    /**
     * Remove old backup
     * @param {string} backup_id
     */
    remove_backup(backup_id) {
        const ptr0 = passStringToWasm0(backup_id, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.recoverysystem_remove_backup(this.__wbg_ptr, ptr0, len0);
        if (ret[1]) {
            throw takeFromExternrefTable0(ret[0]);
        }
    }
    /**
     * Get recovery attempt count for backup
     * @param {string} backup_id
     * @returns {number}
     */
    get_attempt_count(backup_id) {
        const ptr0 = passStringToWasm0(backup_id, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.recoverysystem_get_attempt_count(this.__wbg_ptr, ptr0, len0);
        return ret >>> 0;
    }
    /**
     * Check if backup is locked due to too many attempts
     * @param {string} backup_id
     * @returns {boolean}
     */
    is_backup_locked(backup_id) {
        const ptr0 = passStringToWasm0(backup_id, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.recoverysystem_is_backup_locked(this.__wbg_ptr, ptr0, len0);
        return ret !== 0;
    }
    /**
     * Reset attempt count for backup (admin function)
     * @param {string} backup_id
     */
    reset_attempt_count(backup_id) {
        const ptr0 = passStringToWasm0(backup_id, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.recoverysystem_reset_attempt_count(this.__wbg_ptr, ptr0, len0);
    }
    /**
     * Get system statistics
     * @returns {any}
     */
    get_stats() {
        const ret = wasm.recoverysystem_get_stats(this.__wbg_ptr);
        return ret;
    }
}

const RotationPolicyFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_rotationpolicy_free(ptr >>> 0, 1));
/**
 * Rotation policy configuration for automated key management
 */
export class RotationPolicy {

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        RotationPolicyFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_rotationpolicy_free(ptr, 0);
    }
    /**
     * @param {number} max_age_days
     */
    constructor(max_age_days) {
        const ret = wasm.rotationpolicy_new(max_age_days);
        this.__wbg_ptr = ret >>> 0;
        RotationPolicyFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
    /**
     * @returns {number}
     */
    get max_age_days() {
        const ret = wasm.rotationpolicy_max_age_days(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * @param {bigint} count
     */
    set max_usage_count(count) {
        wasm.rotationpolicy_set_max_usage_count(this.__wbg_ptr, count);
    }
    /**
     * @param {boolean} requires
     */
    set requires_user_confirmation(requires) {
        wasm.rotationpolicy_set_requires_user_confirmation(this.__wbg_ptr, requires);
    }
    /**
     * @returns {boolean}
     */
    get requires_user_confirmation() {
        const ret = wasm.rotationpolicy_requires_user_confirmation(this.__wbg_ptr);
        return ret !== 0;
    }
    /**
     * @returns {boolean}
     */
    get force_rotation_on_compromise() {
        const ret = wasm.rotationpolicy_force_rotation_on_compromise(this.__wbg_ptr);
        return ret !== 0;
    }
    /**
     * @param {RotationTrigger} trigger_type
     */
    setTriggerType(trigger_type) {
        wasm.rotationpolicy_setTriggerType(this.__wbg_ptr, trigger_type);
    }
    /**
     * @returns {RotationTrigger}
     */
    get trigger_type() {
        const ret = wasm.rotationpolicy_trigger_type(this.__wbg_ptr);
        return ret;
    }
    /**
     * @param {RotationTiming} timing
     */
    setTimingPreference(timing) {
        wasm.rotationpolicy_setTimingPreference(this.__wbg_ptr, timing);
    }
    /**
     * @returns {RotationTiming}
     */
    get timing_preference() {
        const ret = wasm.rotationpolicy_timing_preference(this.__wbg_ptr);
        return ret;
    }
    /**
     * @param {SecurityEventType} event_type
     */
    addSecurityEventTrigger(event_type) {
        wasm.rotationpolicy_addSecurityEventTrigger(this.__wbg_ptr, event_type);
    }
    /**
     * @param {SecurityEventType} event_type
     */
    removeSecurityEventTrigger(event_type) {
        wasm.rotationpolicy_removeSecurityEventTrigger(this.__wbg_ptr, event_type);
    }
    /**
     * @param {SecurityEventType} event_type
     * @returns {boolean}
     */
    hasSecurityEventTrigger(event_type) {
        const ret = wasm.rotationpolicy_hasSecurityEventTrigger(this.__wbg_ptr, event_type);
        return ret !== 0;
    }
    /**
     * @param {number} hours
     */
    setLowUsageThresholdHours(hours) {
        wasm.rotationpolicy_setLowUsageThresholdHours(this.__wbg_ptr, hours);
    }
    /**
     * @returns {number}
     */
    get low_usage_threshold_hours() {
        const ret = wasm.rotationpolicy_low_usage_threshold_hours(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * @param {boolean} enabled
     */
    setEmergencyRotationEnabled(enabled) {
        wasm.rotationpolicy_setEmergencyRotationEnabled(this.__wbg_ptr, enabled);
    }
    /**
     * @returns {boolean}
     */
    get emergency_rotation_enabled() {
        const ret = wasm.rotationpolicy_emergency_rotation_enabled(this.__wbg_ptr);
        return ret !== 0;
    }
    /**
     * @param {number} current_age_hours
     * @param {bigint} usage_count
     * @param {SecurityEventType | null} [security_event]
     * @returns {boolean}
     */
    shouldTriggerRotation(current_age_hours, usage_count, security_event) {
        const ret = wasm.rotationpolicy_shouldTriggerRotation(this.__wbg_ptr, current_age_hours, usage_count, isLikeNone(security_event) ? 7 : security_event);
        return ret !== 0;
    }
}

const SecureKDFFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_securekdf_free(ptr >>> 0, 1));
/**
 * Secure key derivation with timing attack protection
 */
export class SecureKDF {

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        SecureKDFFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_securekdf_free(ptr, 0);
    }
    /**
     * Derive key using Argon2id with constant-time validation
     * @param {Uint8Array} password
     * @param {Uint8Array} salt
     * @param {number} iterations
     * @param {number} memory_cost
     * @param {number} parallelism
     * @param {number} output_length
     * @returns {Uint8Array}
     */
    static derive_key(password, salt, iterations, memory_cost, parallelism, output_length) {
        const ptr0 = passArray8ToWasm0(password, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passArray8ToWasm0(salt, wasm.__wbindgen_malloc);
        const len1 = WASM_VECTOR_LEN;
        const ret = wasm.securekdf_derive_key(ptr0, len0, ptr1, len1, iterations, memory_cost, parallelism, output_length);
        if (ret[3]) {
            throw takeFromExternrefTable0(ret[2]);
        }
        var v3 = getArrayU8FromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
        return v3;
    }
}

const SecureRandomFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_securerandom_free(ptr >>> 0, 1));
/**
 * Secure random number generator using platform entropy
 */
export class SecureRandom {

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        SecureRandomFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_securerandom_free(ptr, 0);
    }
    /**
     * Generate secure random bytes
     * @param {number} size
     * @returns {Uint8Array}
     */
    static generate_bytes(size) {
        const ret = wasm.securerandom_generate_bytes(size);
        if (ret[3]) {
            throw takeFromExternrefTable0(ret[2]);
        }
        var v1 = getArrayU8FromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
        return v1;
    }
    /**
     * Generate secure random nonce for crypto operations
     * @returns {Uint8Array}
     */
    static generate_nonce() {
        const ret = wasm.securerandom_generate_nonce();
        if (ret[3]) {
            throw takeFromExternrefTable0(ret[2]);
        }
        var v1 = getArrayU8FromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
        return v1;
    }
    /**
     * Generate secure salt for key derivation
     * @returns {Uint8Array}
     */
    static generate_salt() {
        const ret = wasm.securerandom_generate_salt();
        if (ret[3]) {
            throw takeFromExternrefTable0(ret[2]);
        }
        var v1 = getArrayU8FromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
        return v1;
    }
    /**
     * Generate secure key material
     * @param {number} size
     * @returns {Uint8Array}
     */
    static generate_key(size) {
        const ret = wasm.securerandom_generate_key(size);
        if (ret[3]) {
            throw takeFromExternrefTable0(ret[2]);
        }
        var v1 = getArrayU8FromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
        return v1;
    }
}

const SecureStorageConfigFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_securestorageconfig_free(ptr >>> 0, 1));

export class SecureStorageConfig {

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        SecureStorageConfigFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_securestorageconfig_free(ptr, 0);
    }
    /**
     * @param {SecureStoragePlatform} platform
     * @param {string} keychain_service
     * @param {boolean} require_authentication
     * @param {boolean} require_biometrics
     * @param {string} accessibility_level
     * @param {string} encryption_algorithm
     */
    constructor(platform, keychain_service, require_authentication, require_biometrics, accessibility_level, encryption_algorithm) {
        const ptr0 = passStringToWasm0(keychain_service, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passStringToWasm0(accessibility_level, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len1 = WASM_VECTOR_LEN;
        const ptr2 = passStringToWasm0(encryption_algorithm, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len2 = WASM_VECTOR_LEN;
        const ret = wasm.securestorageconfig_new(platform, ptr0, len0, require_authentication, require_biometrics, ptr1, len1, ptr2, len2);
        this.__wbg_ptr = ret >>> 0;
        SecureStorageConfigFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
    /**
     * @returns {SecureStoragePlatform}
     */
    get platform() {
        const ret = wasm.securestorageconfig_platform(this.__wbg_ptr);
        return ret;
    }
    /**
     * @returns {string}
     */
    get keychain_service() {
        let deferred1_0;
        let deferred1_1;
        try {
            const ret = wasm.securestorageconfig_keychain_service(this.__wbg_ptr);
            deferred1_0 = ret[0];
            deferred1_1 = ret[1];
            return getStringFromWasm0(ret[0], ret[1]);
        } finally {
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }
    /**
     * @returns {boolean}
     */
    get require_authentication() {
        const ret = wasm.securestorageconfig_require_authentication(this.__wbg_ptr);
        return ret !== 0;
    }
    /**
     * @returns {boolean}
     */
    get require_biometrics() {
        const ret = wasm.securestorageconfig_require_biometrics(this.__wbg_ptr);
        return ret !== 0;
    }
    /**
     * @returns {string}
     */
    get accessibility_level() {
        let deferred1_0;
        let deferred1_1;
        try {
            const ret = wasm.securestorageconfig_accessibility_level(this.__wbg_ptr);
            deferred1_0 = ret[0];
            deferred1_1 = ret[1];
            return getStringFromWasm0(ret[0], ret[1]);
        } finally {
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }
    /**
     * @returns {string}
     */
    get encryption_algorithm() {
        let deferred1_0;
        let deferred1_1;
        try {
            const ret = wasm.securestorageconfig_encryption_algorithm(this.__wbg_ptr);
            deferred1_0 = ret[0];
            deferred1_1 = ret[1];
            return getStringFromWasm0(ret[0], ret[1]);
        } finally {
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }
}

const SecureTempDataFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_securetempdata_free(ptr >>> 0, 1));
/**
 * Secure temporary data holder that auto-zeroizes
 */
export class SecureTempData {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(SecureTempData.prototype);
        obj.__wbg_ptr = ptr;
        SecureTempDataFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        SecureTempDataFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_securetempdata_free(ptr, 0);
    }
    /**
     * @param {number} size
     */
    constructor(size) {
        const ret = wasm.securetempdata_new(size);
        this.__wbg_ptr = ret >>> 0;
        SecureTempDataFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
    /**
     * Create from bytes
     * @param {Uint8Array} data
     * @returns {SecureTempData}
     */
    static from_bytes(data) {
        const ptr0 = passArray8ToWasm0(data, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.securetempdata_from_bytes(ptr0, len0);
        return SecureTempData.__wrap(ret);
    }
    /**
     * Get data length
     * @returns {number}
     */
    length() {
        const ret = wasm.securetempdata_length(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * Check if data is active
     * @returns {boolean}
     */
    is_active() {
        const ret = wasm.securetempdata_is_active(this.__wbg_ptr);
        return ret !== 0;
    }
    /**
     * Manually zeroize data
     */
    zeroize() {
        wasm.securetempdata_zeroize(this.__wbg_ptr);
    }
}

const SecurityEventFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_securityevent_free(ptr >>> 0, 1));
/**
 * Security event for triggering rotations
 */
export class SecurityEvent {

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        SecurityEventFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_securityevent_free(ptr, 0);
    }
    /**
     * @param {SecurityEventType} event_type
     * @param {number} severity
     * @param {string} description
     */
    constructor(event_type, severity, description) {
        const ptr0 = passStringToWasm0(description, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.securityevent_new(event_type, severity, ptr0, len0);
        this.__wbg_ptr = ret >>> 0;
        SecurityEventFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
    /**
     * @returns {SecurityEventType}
     */
    get event_type() {
        const ret = wasm.securityevent_event_type(this.__wbg_ptr);
        return ret;
    }
    /**
     * @returns {number}
     */
    get severity() {
        const ret = wasm.securityevent_severity(this.__wbg_ptr);
        return ret;
    }
    /**
     * @returns {number}
     */
    get timestamp() {
        const ret = wasm.securityevent_timestamp(this.__wbg_ptr);
        return ret;
    }
    /**
     * @returns {string}
     */
    get description() {
        let deferred1_0;
        let deferred1_1;
        try {
            const ret = wasm.securityevent_description(this.__wbg_ptr);
            deferred1_0 = ret[0];
            deferred1_1 = ret[1];
            return getStringFromWasm0(ret[0], ret[1]);
        } finally {
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }
    /**
     * @param {string | null} [device_id]
     */
    setDeviceId(device_id) {
        var ptr0 = isLikeNone(device_id) ? 0 : passStringToWasm0(device_id, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        var len0 = WASM_VECTOR_LEN;
        wasm.securityevent_setDeviceId(this.__wbg_ptr, ptr0, len0);
    }
    /**
     * @returns {string | undefined}
     */
    get device_id() {
        const ret = wasm.securityevent_device_id(this.__wbg_ptr);
        let v1;
        if (ret[0] !== 0) {
            v1 = getStringFromWasm0(ret[0], ret[1]).slice();
            wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
        }
        return v1;
    }
    /**
     * @returns {boolean}
     */
    isHighSeverity() {
        const ret = wasm.securityevent_isHighSeverity(this.__wbg_ptr);
        return ret !== 0;
    }
    /**
     * @returns {boolean}
     */
    requiresImmedateAction() {
        const ret = wasm.securityevent_requiresImmedateAction(this.__wbg_ptr);
        return ret !== 0;
    }
}

const SideChannelProtectionFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_sidechannelprotection_free(ptr >>> 0, 1));
/**
 * Side-channel attack prevention utilities
 */
export class SideChannelProtection {

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        SideChannelProtectionFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_sidechannelprotection_free(ptr, 0);
    }
    /**
     * Constant-time conditional select
     * @param {boolean} condition
     * @param {number} true_val
     * @param {number} false_val
     * @returns {number}
     */
    static conditional_select(condition, true_val, false_val) {
        const ret = wasm.sidechannelprotection_conditional_select(condition, true_val, false_val);
        return ret;
    }
    /**
     * Constant-time array conditional select
     * @param {boolean} condition
     * @param {Uint8Array} true_array
     * @param {Uint8Array} false_array
     * @returns {Uint8Array}
     */
    static conditional_select_array(condition, true_array, false_array) {
        const ptr0 = passArray8ToWasm0(true_array, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passArray8ToWasm0(false_array, wasm.__wbindgen_malloc);
        const len1 = WASM_VECTOR_LEN;
        const ret = wasm.sidechannelprotection_conditional_select_array(condition, ptr0, len0, ptr1, len1);
        if (ret[3]) {
            throw takeFromExternrefTable0(ret[2]);
        }
        var v3 = getArrayU8FromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
        return v3;
    }
    /**
     * Add timing noise to prevent timing analysis
     */
    static add_timing_noise() {
        wasm.sidechannelprotection_add_timing_noise();
    }
}

const TypeDefinitionsFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_typedefinitions_free(ptr >>> 0, 1));
/**
 * TypeScript type definition generator
 */
export class TypeDefinitions {

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        TypeDefinitionsFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_typedefinitions_free(ptr, 0);
    }
    /**
     * Generate comprehensive TypeScript definitions
     * @returns {string}
     */
    static generate_type_definitions() {
        let deferred1_0;
        let deferred1_1;
        try {
            const ret = wasm.typedefinitions_generate_type_definitions();
            deferred1_0 = ret[0];
            deferred1_1 = ret[1];
            return getStringFromWasm0(ret[0], ret[1]);
        } finally {
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }
}

const UserRotationPreferencesFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_userrotationpreferences_free(ptr >>> 0, 1));
/**
 * User preferences for rotation timing and behavior
 */
export class UserRotationPreferences {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(UserRotationPreferences.prototype);
        obj.__wbg_ptr = ptr;
        UserRotationPreferencesFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        UserRotationPreferencesFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_userrotationpreferences_free(ptr, 0);
    }
    constructor() {
        const ret = wasm.userrotationpreferences_new();
        this.__wbg_ptr = ret >>> 0;
        UserRotationPreferencesFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
    /**
     * @returns {number}
     */
    get preferred_rotation_time_hour() {
        const ret = wasm.userrotationpreferences_preferred_rotation_time_hour(this.__wbg_ptr);
        return ret;
    }
    /**
     * @param {number} hour
     */
    set preferred_rotation_time_hour(hour) {
        wasm.userrotationpreferences_set_preferred_rotation_time_hour(this.__wbg_ptr, hour);
    }
    /**
     * @returns {boolean}
     */
    get allow_automatic_rotation() {
        const ret = wasm.userrotationpreferences_allow_automatic_rotation(this.__wbg_ptr);
        return ret !== 0;
    }
    /**
     * @param {boolean} allow
     */
    set allow_automatic_rotation(allow) {
        wasm.userrotationpreferences_set_allow_automatic_rotation(this.__wbg_ptr, allow);
    }
    /**
     * @returns {number}
     */
    get notification_advance_hours() {
        const ret = wasm.userrotationpreferences_notification_advance_hours(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * @param {number} hours
     */
    set notification_advance_hours(hours) {
        wasm.userrotationpreferences_set_notification_advance_hours(this.__wbg_ptr, hours);
    }
    /**
     * @returns {boolean}
     */
    get pause_during_active_usage() {
        const ret = wasm.userrotationpreferences_pause_during_active_usage(this.__wbg_ptr);
        return ret !== 0;
    }
    /**
     * @param {boolean} pause
     */
    set pause_during_active_usage(pause) {
        wasm.userrotationpreferences_set_pause_during_active_usage(this.__wbg_ptr, pause);
    }
    /**
     * @returns {boolean}
     */
    get emergency_rotation_requires_confirmation() {
        const ret = wasm.userrotationpreferences_emergency_rotation_requires_confirmation(this.__wbg_ptr);
        return ret !== 0;
    }
    /**
     * @param {boolean} requires
     */
    set emergency_rotation_requires_confirmation(requires) {
        wasm.userrotationpreferences_set_emergency_rotation_requires_confirmation(this.__wbg_ptr, requires);
    }
}

const VersionedKeyFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_versionedkey_free(ptr >>> 0, 1));
/**
 * A versioned cryptographic key with lifecycle management
 */
export class VersionedKey {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(VersionedKey.prototype);
        obj.__wbg_ptr = ptr;
        VersionedKeyFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        VersionedKeyFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_versionedkey_free(ptr, 0);
    }
    /**
     * @param {CryptoKey} key
     * @param {KeyVersion} version
     * @param {DataCategory} purpose
     */
    constructor(key, version, purpose) {
        _assertClass(key, CryptoKey);
        var ptr0 = key.__destroy_into_raw();
        _assertClass(version, KeyVersion);
        var ptr1 = version.__destroy_into_raw();
        const ret = wasm.versionedkey_new(ptr0, ptr1, purpose);
        this.__wbg_ptr = ret >>> 0;
        VersionedKeyFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
    /**
     * @returns {CryptoKey}
     */
    get key() {
        const ret = wasm.versionedkey_key(this.__wbg_ptr);
        return CryptoKey.__wrap(ret);
    }
    /**
     * @returns {KeyVersion}
     */
    get version() {
        const ret = wasm.versionedkey_version(this.__wbg_ptr);
        return KeyVersion.__wrap(ret);
    }
    /**
     * @returns {KeyStatus}
     */
    get status() {
        const ret = wasm.versionedkey_status(this.__wbg_ptr);
        return ret;
    }
    /**
     * @returns {DataCategory}
     */
    get purpose() {
        const ret = wasm.versionedkey_purpose(this.__wbg_ptr);
        return ret;
    }
    /**
     * @returns {number}
     */
    get migration_progress() {
        const ret = wasm.versionedkey_migration_progress(this.__wbg_ptr);
        return ret;
    }
    /**
     * @returns {number}
     */
    get creation_time() {
        const ret = wasm.versionedkey_creation_time(this.__wbg_ptr);
        return ret;
    }
    /**
     * @returns {number | undefined}
     */
    get last_used_time() {
        const ret = wasm.versionedkey_last_used_time(this.__wbg_ptr);
        return ret[0] === 0 ? undefined : ret[1];
    }
    /**
     * @returns {bigint}
     */
    get usage_count() {
        const ret = wasm.versionedkey_usage_count(this.__wbg_ptr);
        return BigInt.asUintN(64, ret);
    }
    /**
     * @returns {string | undefined}
     */
    get integrity_hash() {
        const ret = wasm.versionedkey_integrity_hash(this.__wbg_ptr);
        let v1;
        if (ret[0] !== 0) {
            v1 = getStringFromWasm0(ret[0], ret[1]).slice();
            wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
        }
        return v1;
    }
    /**
     * @returns {Array<any>}
     */
    get_audit_log() {
        const ret = wasm.versionedkey_get_audit_log(this.__wbg_ptr);
        return ret;
    }
    /**
     * @param {KeyStatus} status
     */
    set_status(status) {
        wasm.versionedkey_set_status(this.__wbg_ptr, status);
    }
    /**
     * @param {number} progress
     */
    set_migration_progress(progress) {
        wasm.versionedkey_set_migration_progress(this.__wbg_ptr, progress);
    }
    /**
     * @returns {boolean}
     */
    is_usable() {
        const ret = wasm.versionedkey_is_usable(this.__wbg_ptr);
        return ret !== 0;
    }
    /**
     * @param {KeyVersion} data_version
     * @returns {boolean}
     */
    can_decrypt_data_from_version(data_version) {
        _assertClass(data_version, KeyVersion);
        const ret = wasm.versionedkey_can_decrypt_data_from_version(this.__wbg_ptr, data_version.__wbg_ptr);
        return ret !== 0;
    }
    /**
     * @param {KeyVersion} target_version
     * @returns {boolean}
     */
    supports_backward_compatibility_to(target_version) {
        _assertClass(target_version, KeyVersion);
        const ret = wasm.versionedkey_supports_backward_compatibility_to(this.__wbg_ptr, target_version.__wbg_ptr);
        return ret !== 0;
    }
    /**
     * @returns {Array<any>}
     */
    get_backward_compatibility_versions() {
        const ret = wasm.versionedkey_get_backward_compatibility_versions(this.__wbg_ptr);
        return ret;
    }
    /**
     * @param {KeyVersion} predecessor
     */
    addPredecessorVersion(predecessor) {
        _assertClass(predecessor, KeyVersion);
        var ptr0 = predecessor.__destroy_into_raw();
        wasm.versionedkey_addPredecessorVersion(this.__wbg_ptr, ptr0);
    }
    /**
     * @returns {Array<any>}
     */
    getPredecessorVersions() {
        const ret = wasm.versionedkey_getPredecessorVersions(this.__wbg_ptr);
        return ret;
    }
    /**
     * @param {KeyVersion} version
     */
    setPredecessorVersion(version) {
        _assertClass(version, KeyVersion);
        var ptr0 = version.__destroy_into_raw();
        wasm.versionedkey_addPredecessorVersion(this.__wbg_ptr, ptr0);
    }
    /**
     * @returns {Array<any>}
     */
    getSupportedDecryptionVersions() {
        const ret = wasm.versionedkey_getSupportedDecryptionVersions(this.__wbg_ptr);
        return ret;
    }
    /**
     * @param {KeyVersion} version
     */
    addSupportedDecryptionVersion(version) {
        _assertClass(version, KeyVersion);
        var ptr0 = version.__destroy_into_raw();
        const ret = wasm.versionedkey_addSupportedDecryptionVersion(this.__wbg_ptr, ptr0);
        if (ret[1]) {
            throw takeFromExternrefTable0(ret[0]);
        }
    }
    /**
     * @param {KeyVersion} version
     * @returns {boolean}
     */
    validateVersionCompatibility(version) {
        _assertClass(version, KeyVersion);
        const ret = wasm.versionedkey_validateVersionCompatibility(this.__wbg_ptr, version.__wbg_ptr);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return ret[0] !== 0;
    }
    /**
     * @returns {boolean}
     */
    validateKeyIntegrity() {
        const ret = wasm.versionedkey_validateKeyIntegrity(this.__wbg_ptr);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return ret[0] !== 0;
    }
    updateUsageTracking() {
        wasm.versionedkey_updateUsageTracking(this.__wbg_ptr);
    }
    /**
     * @param {LegacyKeyRetentionPolicy} policy
     * @returns {boolean}
     */
    checkRetentionEligibility(policy) {
        _assertClass(policy, LegacyKeyRetentionPolicy);
        const ret = wasm.versionedkey_checkRetentionEligibility(this.__wbg_ptr, policy.__wbg_ptr);
        return ret !== 0;
    }
    /**
     * @param {KeyVersion} new_version
     * @param {CryptoKey} new_key
     */
    transitionToVersion(new_version, new_key) {
        _assertClass(new_version, KeyVersion);
        var ptr0 = new_version.__destroy_into_raw();
        _assertClass(new_key, CryptoKey);
        var ptr1 = new_key.__destroy_into_raw();
        const ret = wasm.versionedkey_transitionToVersion(this.__wbg_ptr, ptr0, ptr1);
        if (ret[1]) {
            throw takeFromExternrefTable0(ret[0]);
        }
    }
}

const WasmMemoryUtilsFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_wasmmemoryutils_free(ptr >>> 0, 1));
/**
 * WASM memory utilities wrapper
 */
export class WasmMemoryUtils {

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        WasmMemoryUtilsFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_wasmmemoryutils_free(ptr, 0);
    }
    /**
     * Get current WASM memory statistics
     * @returns {object}
     */
    static get_memory_stats() {
        const ret = wasm.wasmmemoryutils_get_memory_stats();
        return ret;
    }
    /**
     * Force garbage collection of WASM memory
     */
    static cleanup_memory() {
        wasm.wasmmemoryutils_cleanup_memory();
    }
    /**
     * Check for memory leaks
     * @returns {boolean}
     */
    static detect_leaks() {
        const ret = wasm.wasmmemoryutils_detect_leaks();
        return ret !== 0;
    }
}

export function __wbg_argon2params_new(arg0) {
    const ret = Argon2Params.__wrap(arg0);
    return ret;
};

export function __wbg_benchmarkresult_new(arg0) {
    const ret = BenchmarkResult.__wrap(arg0);
    return ret;
};

export function __wbg_buffer_a1a27a0dfa70165d(arg0) {
    const ret = arg0.buffer;
    return ret;
};

export function __wbg_call_f2db6205e5c51dc8() { return handleError(function (arg0, arg1, arg2) {
    const ret = arg0.call(arg1, arg2);
    return ret;
}, arguments) };

export function __wbg_call_fbe8be8bf6436ce5() { return handleError(function (arg0, arg1) {
    const ret = arg0.call(arg1);
    return ret;
}, arguments) };

export function __wbg_crypto_574e78ad8b13b65f(arg0) {
    const ret = arg0.crypto;
    return ret;
};

export function __wbg_cryptoenvelope_new(arg0) {
    const ret = CryptoEnvelope.__wrap(arg0);
    return ret;
};

export function __wbg_cryptokey_new(arg0) {
    const ret = CryptoKey.__wrap(arg0);
    return ret;
};

export function __wbg_getRandomValues_38a1ff1ea09f6cc7() { return handleError(function (arg0, arg1) {
    globalThis.crypto.getRandomValues(getArrayU8FromWasm0(arg0, arg1));
}, arguments) };

export function __wbg_getRandomValues_b8f5dbd5f3995a9e() { return handleError(function (arg0, arg1) {
    arg0.getRandomValues(arg1);
}, arguments) };

export function __wbg_getTime_2afe67905d873e92(arg0) {
    const ret = arg0.getTime();
    return ret;
};

export function __wbg_get_a131a44bd1eb6979(arg0, arg1) {
    const ret = arg0[arg1 >>> 0];
    return ret;
};

export function __wbg_instanceof_Window_68f3f67bad1729c1(arg0) {
    let result;
    try {
        result = arg0 instanceof Window;
    } catch (_) {
        result = false;
    }
    const ret = result;
    return ret;
};

export function __wbg_length_f00ec12454a5d9fd(arg0) {
    const ret = arg0.length;
    return ret;
};

export function __wbg_log_d16adc52d3decdd0(arg0, arg1) {
    console.log(getStringFromWasm0(arg0, arg1));
};

export function __wbg_masterkeystorageinfo_new(arg0) {
    const ret = MasterKeyStorageInfo.__wrap(arg0);
    return ret;
};

export function __wbg_msCrypto_a61aeb35a24c1329(arg0) {
    const ret = arg0.msCrypto;
    return ret;
};

export function __wbg_new0_97314565408dea38() {
    const ret = new Date();
    return ret;
};

export function __wbg_new_07b483f72211fd66() {
    const ret = new Object();
    return ret;
};

export function __wbg_new_58353953ad2097cc() {
    const ret = new Array();
    return ret;
};

export function __wbg_new_e30c39c06edaabf2(arg0, arg1) {
    try {
        var state0 = {a: arg0, b: arg1};
        var cb0 = (arg0, arg1) => {
            const a = state0.a;
            state0.a = 0;
            try {
                return __wbg_adapter_526(a, state0.b, arg0, arg1);
            } finally {
                state0.a = a;
            }
        };
        const ret = new Promise(cb0);
        return ret;
    } finally {
        state0.a = state0.b = 0;
    }
};

export function __wbg_new_e52b3efaaa774f96(arg0) {
    const ret = new Uint8Array(arg0);
    return ret;
};

export function __wbg_newfromslice_7c05ab1297cb2d88(arg0, arg1) {
    const ret = new Uint8Array(getArrayU8FromWasm0(arg0, arg1));
    return ret;
};

export function __wbg_newnoargs_ff528e72d35de39a(arg0, arg1) {
    const ret = new Function(getStringFromWasm0(arg0, arg1));
    return ret;
};

export function __wbg_newwithbyteoffsetandlength_3b01ecda099177e8(arg0, arg1, arg2) {
    const ret = new Uint8Array(arg0, arg1 >>> 0, arg2 >>> 0);
    return ret;
};

export function __wbg_newwithlength_08f872dc1e3ada2e(arg0) {
    const ret = new Uint8Array(arg0 >>> 0);
    return ret;
};

export function __wbg_node_905d3e251edff8a2(arg0) {
    const ret = arg0.node;
    return ret;
};

export function __wbg_now_7ab37f05ab2d0b81(arg0) {
    const ret = arg0.now();
    return ret;
};

export function __wbg_now_eb0821f3bd9f6529() {
    const ret = Date.now();
    return ret;
};

export function __wbg_performance_69756c79602db631(arg0) {
    const ret = arg0.performance;
    return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
};

export function __wbg_process_dc0fbacc7c1c06f7(arg0) {
    const ret = arg0.process;
    return ret;
};

export function __wbg_push_73fd7b5550ebf707(arg0, arg1) {
    const ret = arg0.push(arg1);
    return ret;
};

export function __wbg_queueMicrotask_46c1df247678729f(arg0) {
    queueMicrotask(arg0);
};

export function __wbg_queueMicrotask_8acf3ccb75ed8d11(arg0) {
    const ret = arg0.queueMicrotask;
    return ret;
};

export function __wbg_randomFillSync_ac0988aba3254290() { return handleError(function (arg0, arg1) {
    arg0.randomFillSync(arg1);
}, arguments) };

export function __wbg_require_60cc747a6bc5215a() { return handleError(function () {
    const ret = module.require;
    return ret;
}, arguments) };

export function __wbg_resolve_0dac8c580ffd4678(arg0) {
    const ret = Promise.resolve(arg0);
    return ret;
};

export function __wbg_set_c43293f93a35998a() { return handleError(function (arg0, arg1, arg2) {
    const ret = Reflect.set(arg0, arg1, arg2);
    return ret;
}, arguments) };

export function __wbg_set_fe4e79d1ed3b0e9b(arg0, arg1, arg2) {
    arg0.set(arg1, arg2 >>> 0);
};

export function __wbg_static_accessor_GLOBAL_487c52c58d65314d() {
    const ret = typeof global === 'undefined' ? null : global;
    return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
};

export function __wbg_static_accessor_GLOBAL_THIS_ee9704f328b6b291() {
    const ret = typeof globalThis === 'undefined' ? null : globalThis;
    return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
};

export function __wbg_static_accessor_SELF_78c9e3071b912620() {
    const ret = typeof self === 'undefined' ? null : self;
    return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
};

export function __wbg_static_accessor_WINDOW_a093d21393777366() {
    const ret = typeof window === 'undefined' ? null : window;
    return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
};

export function __wbg_subarray_dd4ade7d53bd8e26(arg0, arg1, arg2) {
    const ret = arg0.subarray(arg1 >>> 0, arg2 >>> 0);
    return ret;
};

export function __wbg_then_db882932c0c714c6(arg0, arg1) {
    const ret = arg0.then(arg1);
    return ret;
};

export function __wbg_versions_c01dfd4722a88165(arg0) {
    const ret = arg0.versions;
    return ret;
};

export function __wbindgen_cb_drop(arg0) {
    const obj = arg0.original;
    if (obj.cnt-- == 1) {
        obj.a = 0;
        return true;
    }
    const ret = false;
    return ret;
};

export function __wbindgen_closure_wrapper2127(arg0, arg1, arg2) {
    const ret = makeMutClosure(arg0, arg1, 168, __wbg_adapter_32);
    return ret;
};

export function __wbindgen_debug_string(arg0, arg1) {
    const ret = debugString(arg1);
    const ptr1 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len1 = WASM_VECTOR_LEN;
    getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
    getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
};

export function __wbindgen_init_externref_table() {
    const table = wasm.__wbindgen_export_2;
    const offset = table.grow(4);
    table.set(0, undefined);
    table.set(offset + 0, undefined);
    table.set(offset + 1, null);
    table.set(offset + 2, true);
    table.set(offset + 3, false);
    ;
};

export function __wbindgen_is_function(arg0) {
    const ret = typeof(arg0) === 'function';
    return ret;
};

export function __wbindgen_is_object(arg0) {
    const val = arg0;
    const ret = typeof(val) === 'object' && val !== null;
    return ret;
};

export function __wbindgen_is_string(arg0) {
    const ret = typeof(arg0) === 'string';
    return ret;
};

export function __wbindgen_is_undefined(arg0) {
    const ret = arg0 === undefined;
    return ret;
};

export function __wbindgen_memory() {
    const ret = wasm.memory;
    return ret;
};

export function __wbindgen_number_new(arg0) {
    const ret = arg0;
    return ret;
};

export function __wbindgen_string_get(arg0, arg1) {
    const obj = arg1;
    const ret = typeof(obj) === 'string' ? obj : undefined;
    var ptr1 = isLikeNone(ret) ? 0 : passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    var len1 = WASM_VECTOR_LEN;
    getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
    getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
};

export function __wbindgen_string_new(arg0, arg1) {
    const ret = getStringFromWasm0(arg0, arg1);
    return ret;
};

export function __wbindgen_throw(arg0, arg1) {
    throw new Error(getStringFromWasm0(arg0, arg1));
};

export function __wbindgen_uint8_array_new(arg0, arg1) {
    var v0 = getArrayU8FromWasm0(arg0, arg1).slice();
    wasm.__wbindgen_free(arg0, arg1 * 1, 1);
    const ret = v0;
    return ret;
};

