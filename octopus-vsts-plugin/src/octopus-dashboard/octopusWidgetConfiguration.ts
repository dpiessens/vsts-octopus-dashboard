/// <reference types="vss-web-extension-sdk" />
/// <reference types="knockout" />

/// <reference path="isettings.d.ts" />
/// <reference path="settings.ts" />
/// <reference path="octopus/index.d.ts" />
/// <reference path="apiCalls.ts" />

import Q = require("q");
import Controls = require("VSS/Controls");
import Combos = require("VSS/Controls/Combos");
import TaskAgentRestClient = require("TFS/DistributedTask/TaskAgentRestClient");
import DistributedTask_Contracts = require("TFS/DistributedTask/Contracts");
import { ApiCalls } from "./apiCalls";
import ko = require("knockout");

export class Configuration {

    constructor(public WidgetHelpers) { }

    widgetConfigurationContext = null;
    model: OctopusDashboardConfigViewModel = null;

    public load(widgetSettings, widgetConfigurationContext) {
        var _that = this;
        this.widgetConfigurationContext = widgetConfigurationContext;

        var webContext = VSS.getWebContext();
        var projectId = webContext.project.id;

        this.getServiceEndpoints()
            .then(serviceEndpoints => {
                var settings: ISettings = JSON.parse(widgetSettings.customSettings.data);
                if (settings === null) {
                    settings = (<ISettings>
                        {
                            name: null,
                            endpointId: null,
                            projectId: null,
                            environmentId: null
                        });
                }

                this.model = new OctopusDashboardConfigViewModel(serviceEndpoints, settings, projectId);
                ko.applyBindings(this.model);
                this.model.settingsObservable.subscribe(s => this.notifyModelChanged());
            });

        return this.WidgetHelpers.WidgetStatusHelper.Success();
    }

    private notifyModelChanged() {

        var settingData = this.model.settingsObservable();
        console.log("Settings: " + settingData);
        var result = {
            data: settingData
        };

        this.widgetConfigurationContext.notify(this.WidgetHelpers.WidgetEvent.ConfigurationChange,
            this.WidgetHelpers.WidgetEvent.Args(result));
    }

    private getServiceEndpoints(): IPromise<DistributedTask_Contracts.ServiceEndpoint[]> {
        var deferred = Q.defer<DistributedTask_Contracts.ServiceEndpoint[]>();
        var webContext = VSS.getWebContext();

        var endpointClient = TaskAgentRestClient.getClient();
        var displayClass = this;

        endpointClient.getServiceEndpoints(webContext.project.id, "OctopusDashboardEndpoint").then(endpoints => {
            if (endpoints.length > 0) {
                deferred.resolve(endpoints);
            }
            else {
                deferred.resolve(null);
            }
        });

        return deferred.promise;
    }

    private getCustomSettings() {

        var data = this.model.settingsObservable();
        console.log("Settings: " + data);
        var result = {
            data: data
        };

        return result;
    }

    public onSave() {
        console.log("View Model: " + JSON.stringify(this.model));

        var isValid = true;
        if (isValid) {
            return this.WidgetHelpers.WidgetConfigurationSave.Valid(this.getCustomSettings());
        }
        else {
            return this.WidgetHelpers.WidgetConfigurationSave.Invalid();
        }
    }
}

export class OctopusDashboardConfigViewModel {

    public nameObservable: KnockoutObservable<string>;
    public endpointsObservable: KnockoutObservableArray<DistributedTask_Contracts.ServiceEndpoint>;
    public selectedEndpoint: KnockoutObservable<DistributedTask_Contracts.ServiceEndpoint>;
    public projectsObservable: KnockoutObservable<IProject[]>;
    public selectedProject: KnockoutObservable<IProject>;
    public environmentsObservable: KnockoutComputed<IEnvironment[]>;
    public selectedEnvironment: KnockoutObservable<IEnvironment>;
    public settingsObservable: KnockoutComputed<string>;

    private environments: KnockoutObservable<IEnvironment[]>;
    private filteredEnvironments: KnockoutObservable<string[]>;
    private projectId: string;

    constructor(endpoints: DistributedTask_Contracts.ServiceEndpoint[],
        settings: ISettings, projectId: string) {

        var endpoint = this.getById(endpoints, settings.endpointId);
        this.projectId = projectId;

        this.nameObservable = ko.observable(settings.name);
        this.projectsObservable = ko.observable<IProject[]>();
        this.endpointsObservable = ko.observableArray(endpoints);
        this.selectedProject = ko.observable(null as IProject);
        this.selectedEnvironment = ko.observable(null as IEnvironment);
        this.selectedEndpoint = ko.observable(endpoint);
        this.environments = ko.observable([]);
        this.filteredEnvironments = ko.observable(null as string[]);

        var self = this;
        this.settingsObservable = ko.computed(function () {

            var endpoint = this.selectedEndpoint();
            var project = this.selectedProject();
            var env = this.selectedEnvironment();
            var name = this.nameObservable();

            return ko.toJSON((<ISettings>
                {
                    name: (!name || name === "") ? null : name,
                    endpointId: endpoint != null ? endpoint.id : null,
                    projectId: project != null ? project.Id : null,
                    environmentId: env != null ? env.Id : null
                }));
        }, self);

        this.environmentsObservable = ko.computed(function () {
            console.log("Recomputing environments, list: " + JSON.stringify(this.environments()));

            var noneOption = [(<IEnvironment>{
                Id: null,
                Name: "All Environments"
            })];

            var filter: string[] = this.filteredEnvironments() as string[];

            if (!filter || filter.length === 0) {
                var envList = this.environments() as IEnvironment[];
            } else {
                var envList = ko.utils.arrayFilter<IEnvironment>(this.environments(), function (item) {
                    return ko.utils.arrayFirst<string>(filter, f => {
                        return f === item.Id;
                    }) != null;
                });
            }

            return noneOption.concat(envList);

        }, self);

        // Initialize data
        this.initializeData(settings, endpoint);

        this.selectedProject.subscribe(project => this.updateProject(project, self));
        this.selectedEnvironment.subscribe(env => this.updateEnvironment(env, self));
        this.selectedEndpoint.subscribe(endpoint => {
            this.getOctopusData(endpoint).then(data => {
                self.projectsObservable(data.Projects as IProject[]);
                self.environments(data.Environments as IEnvironment[]);
            });
        });
    }

    private getById(items: DistributedTask_Contracts.ServiceEndpoint[], id: string) {
        if (!id || id === null || id === "") {
            return null;
        }

        return ko.utils.arrayFirst(items, function (item) {
            return item.id === id;
        });
    }

    private getEnvironmentById(items: IEnvironment[], id: string) {
        if (!id || id === null || id === "") {
            return null;
        }

        return ko.utils.arrayFirst(items, function (item) {
            return item.Id === id;
        });
    }

    private getProjectById(items: IProject[], id: string) {
        if (!id || id === null || id === "") {
            return null;
        }

        return ko.utils.arrayFirst(items, function (item) {
            return item.Id === id;
        });
    }

    private getOctopusData(endpoint: DistributedTask_Contracts.ServiceEndpoint): IPromise<any> {
        var deferred = Q.defer<any>();

        var projectId = this.projectId;
        var endpointId = endpoint.id;
        ApiCalls.getEnvironments(projectId, endpointId)
            .then(environments => {
                return ApiCalls.getProjects(projectId, endpointId)
                    .then(projects => {
                        var data = {
                            Projects: projects,
                            Environments: environments
                        };
                        deferred.resolve(data);
                    });
            });

        return deferred.promise;
    }

    private initializeData(settings: ISettings, endpoint: DistributedTask_Contracts.ServiceEndpoint) {
        var deferred = Q.defer();

        if (!endpoint) {
            deferred.resolve();
            return deferred.promise;
        }

        var self = this;
        this.getOctopusData(endpoint).then(data => {
            var projects = data.Projects as IProject[];
            var environments = data.Environments as IEnvironment[];

            self.projectsObservable(projects);
            self.environments(environments);
            self.selectedProject(this.getProjectById(projects, settings.projectId));
            self.selectedEnvironment(this.getEnvironmentById(environments, settings.environmentId));
            deferred.resolve();
        });

        return deferred.promise;
    }

    private updateProject(project: IProject, viewModel: OctopusDashboardConfigViewModel) {
        console.log("Selected Project: " + JSON.stringify(project));
        if (project != null) {
            viewModel.filteredEnvironments(project.EnvironmentIds);

        }
        else {
            viewModel.filteredEnvironments(null);
        }
        viewModel.settingsObservable.notifySubscribers();
    }

    private updateEnvironment(environment: IEnvironment, viewModel: OctopusDashboardConfigViewModel) {
        console.log("Selected Environment: " + JSON.stringify(environment));
        viewModel.settingsObservable.notifySubscribers();
    }
}

VSS.require(["TFS/Dashboards/WidgetHelpers"], (WidgetHelpers) => {
    WidgetHelpers.IncludeWidgetConfigurationStyles();

    VSS.register("OctopusDashboardWidget-Configuration",
        () => {
            var configuration = new Configuration(WidgetHelpers);
            return configuration;
        });

    VSS.notifyLoadSucceeded();
});