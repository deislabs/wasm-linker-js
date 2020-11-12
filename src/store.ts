export class Store {
  public instances: Record<string, WebAssembly.Instance>;
  public imports: Record<string, Record<string, WebAssembly.ImportValue>>;

  constructor() {
    this.imports = {};
    this.instances = {};
  }

  /**
   * Add an import to the imports cache.
   *
   * Identical import names will always be replaced
   * by the last one defined.
   */
  public addImport(
    module: string,
    name: string,
    item: WebAssembly.ImportValue
  ): void {
    // If this is the first import defined for the given module,
    // create the entry for the module in the imports cache.
    if (this.imports[module] === undefined) {
      this.imports[module] = {};
    }

    this.imports[module][name] = item;
  }

  /**
   * Add an imports object to the imports cache.
   */
  public addImportObject(importObject: any): void {
    for (const [mod, im] of Object.entries(importObject)) {
      this.imports[mod] = im as Record<string, WebAssembly.ImportValue>;
    }
  }

  /**
   * Add an instance to the store's instance cache, and
   * all its exports to the imports cache.
   *
   * After each call to the `addInstance` function, the imports
   * cache will contain all exports from the instance, with
   * identical import names replaced by the latest definition
   */
  public addInstance(name: string, instance: WebAssembly.Instance): void {
    this.instances[name] = instance;

    for (const [exp, value] of Object.entries(instance.exports)) {
      this.addImport(name, exp, value);
    }
  }

  public aliasModule(module: string, asModule: string): void {
    for (const [name, value] of Object.entries(this.imports[module])) {
      this.addImport(asModule, name, value);
    }
  }
}
