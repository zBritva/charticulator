// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.
import { AbstractBackend, ItemData, ItemDescription, ItemMetadata } from "./abstract";
import { CDNBackend, ICDNBackendOptions } from "./cdn";
import { IndexedDBBackend } from "./indexed_db";

export interface IResourceDescription extends ItemData {
    id: string;
    url: string;
    name: string;
    img: string;
    type: "chart" | "tmplt";
    author: {
        name: string;
        contact: string;
    }
}

export interface IHybridBackendOptions extends ICDNBackendOptions {
    priorityToLoad: "indexed" | "cdn";
}

/** Responsible to manage saving, loading, storing charts created by user in IndexedDB of the browser and plus loading public charts from gallery */
export class HybridBackend extends AbstractBackend {
    private cdn: CDNBackend;
    private indexed: IndexedDBBackend;

    private options: IHybridBackendOptions;

    constructor(options: IHybridBackendOptions) {
        super();
        this.options = options;
        this.indexed = new IndexedDBBackend();
        this.cdn = new CDNBackend(options);
    }

    public open(): Promise<void> {
        return Promise.all([
            this.indexed.open(),
            this.cdn.open()
        ]).then(() => {
            return;
        });
    }

    public list(
        type: string,
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        orderBy: string = "timeCreated",
        start: number = 0,
        count: number = 50
    ): Promise<{ items: ItemDescription[]; totalCount: number }> {
        return Promise.all([
            this.indexed.list(type, orderBy, start, count),
            this.cdn.list(type, orderBy, start, count)
        ]).then(([indexed, cdn]) => {
            return {
                items: [...indexed.items, ...cdn.items],
                totalCount: indexed.totalCount + cdn.totalCount
            }
        })
    }

    public get(id: string): Promise<ItemData> {
        return new Promise<ItemData>((resolve) => {
            let firstBackend: AbstractBackend = null;
            let secondBackend: AbstractBackend = null;

            if (this.options.priorityToLoad == "cdn") {
                firstBackend = this.cdn;
                secondBackend = this.indexed;
            } else {
                firstBackend = this.indexed;
                secondBackend = this.cdn;
            }

            firstBackend
                .get(id)
                .then(value => {
                    if (value != null) {
                        return resolve(value);
                    } else {
                        secondBackend
                            .get(id)
                            .then(value => {
                                resolve(value);
                            });
                    }
                })
                .catch((error) => {
                    console.log(error);
                    secondBackend
                        .get(id)
                        .then(value => {
                            resolve(value);
                        });
                });
        });
    }

    public put(id: string, data: any, metadata?: ItemMetadata): Promise<void> {
        return this.indexed.put(id, data, metadata);
    }

    public create(
        type: string,
        data: any,
        metadata?: ItemMetadata
    ): Promise<string> {
        return this.indexed.create(type, data, metadata);
    }

    public delete(id: string): Promise<void> {
        return this.indexed.delete(id);
    }
}
