import { ExtensionContext, Memento } from "vscode";

class Cache {
  private _cache: Memento;
  private _namespace: string;

  /**
   * The constructor initializes a new instance of the Cache class.
   * @param context - The ExtensionContext object that provides the globalState property.
   * @param namespace - The namespace to use for the keys in the cache.
   */
  constructor(context: ExtensionContext, namespace: string) {
    this._cache = context.globalState;
    this._namespace = namespace;
  }

  /**
   * The get method retrieves a value from the cache using a key.
   * @param key - The key of the value to retrieve.
   * @returns The value associated with the key, or undefined if the key does not exist.
   */
  public get(key: string): any {
    return this._cache.get(`${this._namespace}.${key}`);
  }

  /**
   * The set method stores a value in the cache using a key.
   * @param key - The key to associate with the value.
   * @param value - The value to store in the cache.
   * @returns A Thenable that resolves when the value has been stored.
   */
  public set(key: string, value: any) {
    return this._cache.update(`${this._namespace}.${key}`, value);
  }

  /**
   * The delete method removes a value from the cache using a key.
   * @param key - The key of the value to remove.
   * @returns A Thenable that resolves when the value has been removed.
   */
  public delete(key: string) {
    return this._cache.update(`${this._namespace}.${key}`, undefined);
  }
}

export default Cache;
