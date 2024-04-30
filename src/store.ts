import { JSONArray, JSONObject, JSONPrimitive } from "./json-types";
import 'reflect-metadata';

export type Permission = "r" | "w" | "rw" | "none";

export type StoreResult = Store | JSONPrimitive | undefined;

export type StoreValue =
  | JSONObject
  | JSONArray
  | StoreResult
  | (() => StoreResult);

export interface IStore {
  defaultPolicy: Permission;
  allowedToRead(key: string): boolean;
  allowedToWrite(key: string): boolean;
  read(path: string): StoreResult;
  write(path: string, value: StoreValue): StoreValue;
  writeEntries(entries: JSONObject): void;
  entries(): JSONObject;
}

export function Restrict(...permission: Permission[]) {
  // write a custom decorator here
    return function(target: any, key: string) {
        Reflect.defineMetadata('permission', permission, target, key);
    }
}

export class Store implements IStore {
  defaultPolicy: Permission = "rw";

  allowedToRead(key: string): boolean {
    const permission: Permission = Reflect.getMetadata('permission', this, key) || this.defaultPolicy;
    return permission.includes("r") || permission.includes("rw");
  }

  allowedToWrite(key: string): boolean {
    const permission: Permission = Reflect.getMetadata('permission', this, key) || this.defaultPolicy;
    return permission.includes("w") || permission.includes("rw");
  }

  read(path: string): StoreResult {
    const keys = path.split(":");
    let value: any = this;
    for (const key of keys) {
      value = value[key];
      if (!this.allowedToRead(value)) {
        throw new Error(`Cannot read property ${key}`);
      }
      if (value === undefined) {
        return undefined;
      }
    }
    return value;
  }

  write(path: string, value: StoreValue): StoreValue {
    const keys = path.split(":");
    let target: any = this;
    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      if (!this.allowedToWrite(target[key])) {
        throw new Error(`Cannot write to property ${key}`);
      }
      if (!(target[key] instanceof Object)) {
        target[key] = {};
      }
      target = target[key];
    }
    const lastKey = keys[keys.length - 1];
    if (!this.allowedToWrite(lastKey)) {
      throw new Error(`Cannot write to property ${lastKey}`);
    }
    target[lastKey] = value;
    return value;
  }

  writeEntries(entries: JSONObject): void {
    for (const key in entries) {
      this.write(key, entries[key]);
    }
  }

  entries(): JSONObject {
    const result: JSONObject = {};
    // for (const key in this.data) {
    //   if (this.allowedToRead(key)) {
    //     result[key] = this.data[key];
    //   }
    // }
    return result;
  }
}