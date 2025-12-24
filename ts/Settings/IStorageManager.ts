import { ArgumentedEvent } from "../Events/Event";
import { ColorScheme } from "./ColorScheme";

export type StorageType = "local" | "sync";
type ArgEvent<TRequestArgs> = ArgumentedEvent<TRequestArgs>;
export enum StorageLimits
{
    QUOTA_BYTES = 'QUOTA_BYTES',
    QUOTA_BYTES_PER_ITEM = 'QUOTA_BYTES_PER_ITEM',
    MAX_ITEMS = 'MAX_ITEMS',
    MAX_WRITE_OPERATIONS_PER_HOUR = 'MAX_WRITE_OPERATIONS_PER_HOUR',
    MAX_WRITE_OPERATIONS_PER_MINUTE = 'MAX_WRITE_OPERATIONS_PER_MINUTE'
}

export abstract class IStorageManager
{
    abstract set(obj: Object): Promise<void>;
    abstract get<T extends Object>(key: T | null): Promise<T>;
    abstract clear(): Promise<void>;
    abstract remove(key: string | string[]): Promise<void>;
    abstract toggleSync(value: boolean): Promise<void>;
    abstract getCurrentStorage(): Promise<StorageType>;
    abstract get onStorageChanged(): ArgEvent<Partial<ColorScheme>>;
}