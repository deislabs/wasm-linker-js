import { parseText } from "binaryen";

export function moduleFromText(text: string): WebAssembly.Module {
  return new WebAssembly.Module(parseText(text).emitBinary());
}

export function asyncModuleFromText(text: string): WebAssembly.Module {
  let bytes = parseText(text);
  bytes.runPasses(["asyncify"]);

  return new WebAssembly.Module(bytes.emitBinary());
}

export const add = `
(module
    (memory 1 1)
    (export "memory" (memory 0))
    (export "add" (func $add))
    
    (func $add (param i32) (param i32) (result i32)
        (return
            (i32.add
                (local.get 0)
                (local.get 1)
            )
        )
    )
)
`;

export const usingAdd = `
(module
    (import "calculator" "add" (func $calc_add (param i32 i32) (result i32)))
    
    (memory 1 1)
    (export "memory" (memory 0))
    (export "add" (func $add))

    (func $add (param i32) (param i32) (result i32)
        (return
            (call $calc_add
                (local.get 0)
                (local.get 1)
            )
        )
    )
)
`;

export const usingAddWithAlias = `
(module
    (import "calculator1" "add" (func $calc_add (param i32 i32) (result i32)))
    (import "calculator2" "add" (func $calc_add2 (param i32 i32) (result i32)))

    (memory 1 1)
    (export "memory" (memory 0))
    (export "add" (func $add))

    (func $add (param i32) (param i32) (result i32)
        (return
            (call $calc_add
                (local.get 0)
                (local.get 1)
            )
        )
    )
)
`;
