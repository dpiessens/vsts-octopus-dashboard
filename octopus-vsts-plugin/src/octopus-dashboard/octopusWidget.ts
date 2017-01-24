/// <reference types="vss-web-extension-sdk" />

/// <reference path="isettings.d.ts" />
/// <reference path="settings.ts" />
/// <reference path="octopusWidgetViewModel.ts" />
/// <reference path="octopus/index.d.ts" />

import Work_Client = require("TFS/Work/RestClient");
import WebApi_Constants = require("VSS/WebApi/Constants");
import TFS_Core_Contracts = require("TFS/Core/Contracts");
import Service = require("VSS/Service");
import Axios from 'axios';
import moment = require("moment-timezone");
import TaskAgentRestClient = require("TFS/DistributedTask/TaskAgentRestClient");
import System_Contracts = require("VSS/Common/Contracts/System");
import {Settings} from "./settings";
import {OctopusWidgetViewModel} from "./octopusWidgetViewModel";
import ko = require("knockout");

export class OctopusDashboardWidget {
    constructor(public WidgetHelpers) { }

    private displayEmptyWidget() {

        var viewModel = new OctopusWidgetViewModel(true);
        ko.applyBindings(viewModel);

        return this.WidgetHelpers.WidgetStatusHelper.Success();
    }

    private display(project: IProject, environments: IEnvironment[], deployments: IDeployment[], 
        customSettings: ISettings, octopusUrl: string, columnCount: number) {
        
        var name = (!customSettings.name ? project.Name : customSettings.name)

        var viewModel = new OctopusWidgetViewModel(false, name, octopusUrl, environments, deployments, customSettings.environmentId, columnCount);
        ko.applyBindings(viewModel);
       
        return this.WidgetHelpers.WidgetStatusHelper.Success();
    }

    private getDashboardWidget(data, customSettings: ISettings, url: string, columnCount: number) {
        
        var environments = data.Environments as IEnvironment[];
        var project = ko.utils.arrayFirst(data.Projects as IProject[], item => item.Id === customSettings.projectId);

        var deployments = ko.utils.arrayFilter(data.Items as IDeployment[], 
            entry => entry.ProjectId === customSettings.projectId && entry.IsCurrent);

        if (!environments || !project) {
            console.debug("Displaying default widget because project, environment or deployment does not exist.")
            return this.displayEmptyWidget();
        }

        return this.display(project, environments, deployments, customSettings, url, columnCount);
    }

    private showDashboard(widgetSettings) {
        var customSettings = JSON.parse(widgetSettings.customSettings.data) as ISettings;
        var columnSize = widgetSettings.size.columnSpan as number;

        if (!customSettings) {
            // Return the default screen here
            return this.displayEmptyWidget();
        }

        try {
            var webContext = VSS.getWebContext();
            var endpointClient = TaskAgentRestClient.getClient();
            var displayClass = this;
            

            return endpointClient.getServiceEndpointDetails(webContext.project.id, customSettings.endpointId)
                .then(endpoint => {
                    if (!endpoint) {
                        return displayClass.displayEmptyWidget();
                    }

                    console.log("Endpoint data: " + JSON.stringify(endpoint));

                    var octopusApi = Axios.create({
                        baseURL: endpoint.url,
                        headers: {'X-Octopus-ApiKey': "API-CBR9BO2ELOJKJDBWANHKEFCNANU"}
                    });

                    return octopusApi.get("/api/dashboard")
                        .then(function (response) {
                            return displayClass.getDashboardWidget(response.data, customSettings, endpoint.url, columnSize);
                        })
                        .catch(function (error) {
                            console.error(error);
                            return displayClass.displayEmptyWidget();
                        });
                });
        }
        catch (e) {
            console.error(e);
            return displayClass.displayEmptyWidget();
        }
    }

    public load(widgetSettings) {
        var result = this.showDashboard(widgetSettings);
        return result;
    }

    public reload(widgetSettings) {
        var result = this.showDashboard(widgetSettings);
        return result;
    }
}