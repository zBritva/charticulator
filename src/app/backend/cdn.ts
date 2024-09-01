// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.
import { ItemData, ItemDescription, ItemMetadata } from "./abstract";

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

export interface ICDNBackendOptions {
    resourcesDescriptionUrl: string;
    createUrl: string;
    updateUrl: string;
    deleteUrl: string;
}

/** Responsible to manage saving, loading, storing charts created by user in IndexedDB of the browser */
export class CDNBackend {
    private resourcesDescriptionUrl: string;
    createUrl: string;
    updateUrl: string;
    deleteUrl: string;

    private resources: IResourceDescription[]

    constructor(options: ICDNBackendOptions) {
        this.resourcesDescriptionUrl = options.resourcesDescriptionUrl;
        this.createUrl = options.createUrl;
        this.updateUrl = options.updateUrl;
        this.deleteUrl = options.deleteUrl;
        this.resources = null;
    }

    public open(): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            if (this.resources) {
                resolve();
                return;
            }
            fetch(this.resourcesDescriptionUrl, {
                method: "GET",
                credentials: "include"
            }).then(response => {
                return response.json();
            }).then(json => {
                this.resources = json;
                resolve();
            }).catch(reject);
        });
    }

    public list(
        type: string,
        orderBy: string = "timeCreated",
        start: number = 0,
        count: number = 50
    ): Promise<{ items: ItemDescription[]; totalCount: number }> {
        return this.open().then(
            () =>
                new Promise<{ items: ItemDescription[]; totalCount: number }>(
                    (resolve) => {
                        const filtered = this.resources
                            .filter(res => res.type === type)
                            .sort((i1, i2) => i1.metadata.timeCreated - i2.metadata.timeCreated)
                            .slice(start, start + count);
                        resolve({
                            items: filtered,
                            totalCount: this.resources.length
                        });
                    }
                )
        );
    }

    public get(id: string): Promise<ItemData> {
        return this.open().then(
            () =>
                new Promise<ItemData>((resolve) => {
                    const item = this.resources.find(res => res.id == id);
                    resolve(item);
                })
        );
    }

    public put(id: string, data: any, metadata?: ItemMetadata): Promise<void> {
        return this.open().then(
            () =>
                new Promise<void>((resolve) => {
                    fetch(this.updateUrl, {
                        method: "PUT",
                        mode: "cors",
                        credentials: "include",
                        body: JSON.stringify({
                            id,
                            data,
                            metadata
                        }),
                        headers: {
                            'Accept': 'application/json',
                            'Content-Type': 'application/json'
                        }
                    }).then(() => {
                        resolve()
                    })
                })
        );
    }

    public create(
        type: string,
        data: any,
        metadata?: ItemMetadata
    ): Promise<string> {
        return this.open().then(
            () =>
                new Promise<string>((resolve, reject) => {
                    fetch(this.updateUrl, {
                        method: "POST",
                        mode: "cors",
                        credentials: "include",
                        body: JSON.stringify({
                            type,
                            data,
                            metadata
                        }),
                        headers: {
                            'Accept': 'application/json',
                            'Content-Type': 'application/json'
                        }
                    }).then(response => {
                        return response.json();
                    }).then(json => {
                        resolve(json.id);
                    })
                })
        );
    }

    public delete(id: string): Promise<void> {
        return this.open().then(
            () =>
                new Promise<void>((resolve, reject) => {
                    fetch(this.updateUrl, {
                        method: "DELETE",
                        mode: "cors",
                        credentials: "include",
                        body: JSON.stringify({
                            id,
                        }),
                        headers: {
                            'Accept': 'application/json',
                            'Content-Type': 'application/json'
                        }
                    }).then(() => {
                        resolve()
                    })
                })
        );
    }
}
