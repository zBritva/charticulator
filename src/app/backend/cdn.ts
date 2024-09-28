// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.
import { AbstractBackend, ItemData, ItemDescription, ItemMetadata, ItemType } from "./abstract";

export interface IResourceDescription extends ItemData {
    id: string;
    url: string;
    name: string;
    img: string;
    type: ItemType;
    hidden: boolean;
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

/** Responsible to manage saving, loading, storing charts created by user in backend */
export class CDNBackend extends AbstractBackend {
    private resourcesDescriptionUrl: string;
    createUrl: string;
    updateUrl: string;
    deleteUrl: string;

    private resources: IResourceDescription[]

    constructor(options: ICDNBackendOptions) {
        super();
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
                method: "GET"
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
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        orderBy: string = "timeCreated",
        start: number = 0,
        count: number = 50
    ): Promise<{ items: ItemDescription[]; totalCount: number }> {
        return this.open().then(
            () =>
                new Promise<{ items: ItemDescription[]; totalCount: number }>(
                    (resolve) => {
                        const filtered = this.resources
                            .filter(res => !res.hidden)
                            .filter(res => res.type === type || type === null)
                            .sort((i1, i2) => <number>i1.metadata[orderBy] - <number>i2.metadata[orderBy])
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

                    fetch(item.url, {
                        method: "GET"
                    }).then(response => {
                        return response.json();
                    }).then(json => {
                        resolve({
                            ...item,
                            data: json
                        });
                    })
                    
                })
        );
    }

    public put(id: string, data: any, metadata?: ItemMetadata): Promise<void> {
        return this.open().then(
            () =>
                new Promise<void>((resolve) => {
                    if (this.updateUrl == null) {
                        resolve();
                    }
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
                new Promise<string>((resolve) => {
                    if (this.updateUrl == null) {
                        resolve(null);
                    }
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
                new Promise<void>((resolve) => {
                    if (this.updateUrl == null) {
                        resolve();
                    }
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
