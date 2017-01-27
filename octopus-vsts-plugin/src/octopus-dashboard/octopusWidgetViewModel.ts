/// <reference path="octopus/index.d.ts" />

import moment = require("moment-timezone");
import ko = require("knockout");

export class OctopusWidgetViewModel {

    public deployments: KnockoutObservableArray<DeploymentViewModel>;
    public octopusUrl: KnockoutObservable<string>;
    public setupVisible: KnockoutObservable<boolean>;
    public title: KnockoutObservable<string>;

    constructor() {

        this.setupVisible = ko.observable(true);
        this.octopusUrl = ko.observable('#');
        this.title = ko.observable(null);
        this.deployments = ko.observableArray<DeploymentViewModel>();
    }

    public isSetup() {
        this.setupVisible(true);
        this.octopusUrl('#');
        this.title(null);
        this.deployments.removeAll();
    }

    public setMetadata(title: string, octopusUrl: string) {
        this.octopusUrl(octopusUrl);
        this.title(title);
    }

    public setModel(environments: IEnvironment[], deployments: IDeployment[],
        environmentId: string, columnCount: number) {

            var deployVMs = this.createEnvironments(columnCount, environmentId, environments, deployments);
            
            this.deployments.removeAll();
            deployVMs.forEach(element => {
                this.deployments.push(element);
            });

            this.setupVisible(false);
    }

    private createEnvironments(columnCount: number, environmentId: string,
        environments: IEnvironment[], deployments: IDeployment[]): DeploymentViewModel[] {
        var models = new Array<DeploymentViewModel>();

        // Handle just one environment by filtering the array
        if (environmentId) {
            environments = ko.utils.arrayFilter(environments, i => i.Id === environmentId);
            columnCount = 1;
        }

        var environmentCount = 0;
        var octoUrl = this.octopusUrl();
        while (environmentCount < columnCount) {
            var environment = environments[environmentCount];
            var deployment = ko.utils.arrayFirst(deployments, i => i.EnvironmentId === environment.Id);

            models.push(new DeploymentViewModel(octoUrl, environment.Name, deployment));

            environmentCount++;
        }

        return models;
    }
}

export class DeploymentViewModel {

    public deployDate: KnockoutObservable<string>;
    public deployId: KnockoutObservable<string>;
    public deployLink: KnockoutObservable<string>;
    public deployStatus: KnockoutComputed<string>;
    public environmentName: KnockoutObservable<string>;
    public environmentStatus: KnockoutComputed<string>;
    public metadata: KnockoutObservable<string>;
    public releaseNumber: KnockoutObservable<string>;
    public status: KnockoutObservable<string>;

    constructor(octopusUrl: string, environmentName: string, deployment: IDeployment) {

        this.environmentName = ko.observable(environmentName);
        this.deployId = ko.observable("deployment-" + environmentName.toLowerCase());

        if (!deployment) {
            this.deployDate = ko.observable(null);
            this.deployId = ko.observable(null);
            this.deployLink = ko.observable(null);
            this.metadata = ko.observable(null);
            this.releaseNumber = ko.observable(null);
            this.status = ko.observable(null);
        }
        else {
            var deployDate = moment.tz(deployment.Created, "America/Chicago");
            var deployLink = octopusUrl.concat("/app#/tasks/", deployment.TaskId);
            var metadata = "Version:  " + deployment.ReleaseVersion +
                "\nDuration: " + deployment.Duration +
                "\nStatus:   " + deployment.State +
                "\nDate:     " + deployDate.format("MMMM D, YYYY HH:mm A");


            this.deployDate = ko.observable(deployDate.from(moment()));
            this.deployLink = ko.observable(deployLink);
            this.metadata = ko.observable(metadata);
            this.releaseNumber = ko.observable(deployment.ReleaseVersion);
            this.status = ko.observable(deployment.State);
        }

        this.environmentStatus = ko.computed(function () {
            return this.getClassForState(this.status());
        }, this);

        this.deployStatus = ko.computed(function () {
            return this.getIconForState(this.status());
        }, this);
    }

    private getClassForState(state: string): string {
        
        if (!state) {
            return "none";
        }

        switch (state) {
            case "Queued":
                return "success";
            case "Executing":
                return "run";
            case "Failed":
                return "failure";
            case "TimedOut":
                return "failure";
            case "Canceled":
                return "stop";
            case "Cancelling":
                return "stop";
            case "Success":
                return "success";
            default:
                return "none";
        }
    }

    private getIconForState(state: string): string {
        
        if (!state) {
            return "";
        }

        switch (state) {
            case "Queued":
                return "fa-spinner fa-spin";
            case "Executing":
                return "fa-spinner fa-spin";
            case "Failed":
                return "fa-exclamation-triangle";
            case "TimedOut":
                return "fa-exclamation-triangle";
            case "Canceled":
                return "fa-user-times";
            case "Cancelling":
                return "fa-user-times";
            case "Success":
                return "fa-check";
            default:
                return "";
        }
    }
}