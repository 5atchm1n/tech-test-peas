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



export function Restrict(...permission: Permission[]): any {
  return function (target: IStore, key: string) {
    if (permission.length === 0) {
      permission = [target.defaultPolicy];
    }
    Reflect.defineMetadata("permissions", permission, target, key);
  }
}

export class Store implements IStore {
  defaultPolicy: Permission = "rw";
  private data: JSONObject = {};


  allowedToRead(key: string): boolean {
    const permissions: Permission[] = Reflect.getMetadata("permissions", this, key);
    return permissions.includes("r") || permissions.includes("rw");
  }

  allowedToWrite(key: string): boolean {
    const permissions: Permission[] = Reflect.getMetadata("permissions", this, key);
    return permissions.includes("w") || permissions.includes("rw");
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
