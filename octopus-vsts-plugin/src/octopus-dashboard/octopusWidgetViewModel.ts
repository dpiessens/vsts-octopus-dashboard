/// <reference path="octopus/index.d.ts" />

import moment = require("moment-timezone");
import ko = require("knockout");

export class OctopusWidgetViewModel {

    public deployments: KnockoutObservableArray<DeploymentViewModel>;
    public octopusUrl: KnockoutObservable<string>;
    public setupVisible: KnockoutObservable<boolean>;
    public title : KnockoutObservable<string>;

    constructor(isSetup: boolean, title?: string, octopusUrl?: string,
                environments? : IEnvironment[], deployments?: IDeployment[], 
                environmentId?: string, columnCount?: number) {
        
        this.setupVisible = ko.observable(isSetup);
        this.octopusUrl = ko.observable(!octopusUrl ? '#' : octopusUrl);
        this.title = ko.observable(title);
        if (isSetup) {
            this.deployments = ko.observableArray<DeploymentViewModel>();
            return;
        }

        var deployVMs = this.createEnvironments(columnCount, environmentId, environments, deployments);
        this.deployments = ko.observableArray(deployVMs);
    }

    private createEnvironments(columnCount: number, environmentId: string,
    environments : IEnvironment[], deployments: IDeployment[]): DeploymentViewModel[] {
        var models = new Array<DeploymentViewModel>();

        // TODO: Handle just one environment

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
    public deployLink : KnockoutObservable<string>;
    public deployStatus: KnockoutComputed<string>;
    public environmentName: KnockoutObservable<string>;
    public environmentStatus: KnockoutComputed<string>;
    public metadata: KnockoutObservable<string>;
    public releaseNumber: KnockoutObservable<string>;
    public status: KnockoutObservable<string>;

    constructor(octopusUrl: string, environmentName: string,  deployment: IDeployment) {
        
        this.environmentName = ko.observable(environmentName);

        if (deployment === null) {
            this.deployDate = ko.observable(deployDate.from(moment()));
            this.deployId = ko.observable(null);
            this.deployLink = ko.observable(deployLink);
            this.environmentName = ko.observable(environmentName);
            this.metadata = ko.observable(metadata);
            this.releaseNumber = ko.observable(deployment.ReleaseVersion);
            this.status = ko.observable(deployment.State);
        }
        
        var deployDate = moment.tz(deployment.Created, "America/Chicago");
        var deployLink = octopusUrl.concat("app#/tasks/", deployment.TaskId);
        var metadata = "Version:  " + deployment.ReleaseVersion + 
                       "\nDuration: " + deployment.Duration + 
                       "\nStatus:   " + deployment.State + 
                       "\nDate:     " + deployDate.format("MMMM D, YYYY HH:mm A");
        

        this.deployDate = ko.observable(deployDate.from(moment()));
        this.deployId = ko.observable("deployment-" + environmentName.toLowerCase());
        this.deployLink = ko.observable(deployLink);
        this.environmentName = ko.observable(environmentName);
        this.metadata = ko.observable(metadata);
        this.releaseNumber = ko.observable(deployment.ReleaseVersion);
        this.status = ko.observable(deployment.State);
        
        this.environmentStatus = ko.computed(function() {
            return this.status() === "Success" ? "success" : "failure";
        }, this);

        this.deployStatus = ko.computed(function() {
            return this.status() === "Success" ? "bowtie-status-success" : "bowtie-status-failure";
        }, this);
    }

}