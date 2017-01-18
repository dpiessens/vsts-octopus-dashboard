/// <reference path="isettings.d.ts" />

export class Settings implements ISettings {
    constructor (
        public endpointId: string,
        public name: string,
        public projectId: string,
        public environmentId: string) {
    }
}