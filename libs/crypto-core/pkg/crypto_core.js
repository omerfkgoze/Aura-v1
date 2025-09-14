import * as wasm from "./crypto_core_bg.wasm";
export * from "./crypto_core_bg.js";
import { __wbg_set_wasm } from "./crypto_core_bg.js";
__wbg_set_wasm(wasm);
wasm.__wbindgen_start();
