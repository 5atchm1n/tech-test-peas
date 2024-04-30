import "reflect-metadata";

import { JSONArray, JSONObject, JSONPrimitive } from "./json-types";

export type Permission = "r" | "w" | "rw" | "none";

export type StoreResult = Store | JSONPrimitive | undefined;

export type StoreValue =
  | JSONObject
  | JSONArray
  | StoreResult
  | (() => StoreResult);

export enum DataType {
  DEFAULT, STORE, FUNCTION
}

export interface IStore {
  defaultPolicy: Permission;
  allowedToRead(key: string): boolean;
  allowedToWrite(key: string): boolean;
  read(path: string): StoreResult;
  write(path: string, value: StoreValue): StoreValue;
  writeEntries(entries: JSONObject): void;
  entries(): JSONObject;
}



export function Restrict(...permissions: Permission[]): any {
  return function (target: IStore, key: string) {
    Reflect.defineMetadata("permission", permissions, target, key);
  }
}

export class Store implements IStore {
  defaultPolicy: Permission = "rw";
  private data: StoreValue = {};


  allowedToRead(key: string): boolean {
    const permissions: Permission[] = Reflect.getMetadata("permission", this, key);
    if (!permissions) {
      return this.defaultPolicy === "r" || this.defaultPolicy === "rw";
    }
    return permissions.includes("r") || permissions.includes("rw");
  }

  allowedToWrite(key: string): boolean {
    const permissions: Permission[] = Reflect.getMetadata("permission", this, key);
    if (!permissions) {
      return this.defaultPolicy === "w" || this.defaultPolicy === "rw";
    }
    return permissions.includes("w") || permissions.includes("rw");
  }

  read(path: string): StoreResult {
    const keys = this._splitPath(path);
    const primaryKey = keys[0];
    const keyFragment = keys.slice(1).join(":");
    const data: any = this;

    if (keys.length > 1 && data[primaryKey] instanceof Store) {
      return data[primaryKey].read(keyFragment);
    }

    if (!this.allowedToRead(keys[0])) {
      throw new Error('No permission for read');
    }

    const result = !this._isFinalKey(keys) ? this._Read(keys, this) : data[primaryKey]

    return result instanceof Function ? result() : result;
  }

  write(path: string, value: StoreValue): StoreValue {
    const keys = this._splitPath(path);
    const primaryKey = keys[0];
    const keyFragment = keys.slice(1).join(":");

    const data: any = this;

    if (!this._isFinalKey(keys) && data[primaryKey] instanceof Store) {
      return data[primaryKey].write(keyFragment, value);
    }

    if (!this.allowedToWrite(primaryKey)) {
      throw new Error('No permission for write');
    }

    this._Write(keys, this, value);

    return value;

  }

  writeEntries(entries: JSONObject): void {
    for (const key in entries) {
      if (entries.hasOwnProperty(key)) {
        this.write(key, entries[key]);
      }
    }
  }

  entries(): JSONObject {
    const keys = Object.keys(this);
    const entries: JSONObject = {};
    const data: any = this;

    for (const key of keys) {
      if (Reflect.getMetadata('permission', this, key) && this.allowedToRead(key)) {
        entries[key] = data[key]
      }
    }
    return entries
  }

  /**
   * read and write helper functions
  **/

  private _Read(keys: string[], data: any): StoreResult {
    const currentKey = keys[0];
    const dataType = this._isInstanceOf(data[currentKey]);
    const nextKeyFragment = keys.slice(1);

    switch (dataType) {
        case DataType.STORE:
            return this._Read(nextKeyFragment, data[currentKey]);
        case DataType.FUNCTION:
            return this._readFunctionValue(data[currentKey], keys);
        default:
            return this._readDataValue(data[currentKey], keys);
    }
  }

  private _Write(keys: string[], data: any, value: StoreValue): void {
    const currentKey = keys[0];
    const nextKeyFragment = keys.slice(1);

    if (!this._isFinalKey(keys)) {
      if (data[currentKey] instanceof Store) {
        this._Write(nextKeyFragment, data[currentKey], value);
      } else {
        data[currentKey] = data[currentKey] || {};
        this._Write(nextKeyFragment, data[currentKey], value);
      }
    } else {
      data[currentKey] = value;
    }
  }

  /**
  * UTILITY FUNCTIONS
  **/

  private _readFunctionValue(data: Function, keys: string[]) {
    const nextKeyFragment = keys.slice(1);
    return this._isFinalKey(keys) ? data(): this._Read(nextKeyFragment, data());
  }

  private _readDataValue(data: any, keys: string[]) {
    const nextKeyFragment = keys.slice(1);
    return this._isFinalKey(keys) ? data: this._Read(nextKeyFragment, data);
  }

  private _splitPath(path: string): string[] {
    return path.split(":");
  }

  private _isFinalKey(keys: string[]): boolean {
    return keys.length === 1;
  }

  private _isInstanceOf(data: any): DataType {
    if (data instanceof Store) {
      return DataType.STORE;
    }
    if (data instanceof Function) {
      return DataType.FUNCTION;
    }
    return DataType.DEFAULT;
  }
}
