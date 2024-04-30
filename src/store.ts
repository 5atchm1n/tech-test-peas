import "reflect-metadata";

import { JSONArray, JSONObject, JSONPrimitive } from "./json-types";

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



export function Restrict(...params: any[]): any {

  return function (target: any, key: any, descriptor: PropertyDescriptor) {
    let value = target[key];

    const getter = function () {
      return value;
    };

    const setter = function (newVal: any) {
      value = newVal;
    };

    if (delete target[key]) {
      Object.defineProperty(target, key, {
        get: getter,
        set: setter,
        enumerable: true,
        configurable: true
      });
    }
  };
}

export class Store implements IStore {
  defaultPolicy: Permission = "rw";
  private data: any = {};


  allowedToRead(key: string): boolean {
    const descriptor = Object.getOwnPropertyDescriptor(this, key);
    if (descriptor && descriptor.get) {
      console.log(descriptor.get());
      return descriptor.get().includes("r");
    }
    return this.defaultPolicy.includes("r");
  }

  allowedToWrite(key: string): boolean {
    // throw new Error("Method not implemented.");
    const descriptor = Object.getOwnPropertyDescriptor(this, key);
    if (descriptor && descriptor.get) {
      return descriptor.get().includes("w");
    }
    return this.defaultPolicy.includes("w");
  }

  read(path: string): StoreResult {
    // throw new Error("Method not implemented.");
    return this.data[path];
  }

  write(path: string, value: StoreValue): StoreValue {
    // throw new Error("Method not implemented.");
    this.data[path] = value;
    return value;
  }

  writeEntries(entries: JSONObject): void {
    // throw new Error("Method not implemented.");
    for (const key in entries) {
      if (entries.hasOwnProperty(key)) {
        this.write(key, entries[key]);
      }
    }
  }

  entries(): JSONObject {
    // throw new Error("Method not implemented.");
    return this.data;
  }
}
