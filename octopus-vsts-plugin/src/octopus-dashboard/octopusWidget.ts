/// <reference types="vss-web-extension-sdk" />

/// <reference path="isettings.d.ts" />
/// <reference path="settings.ts" />
/// <reference path="octopusWidgetViewModel.ts" />
/// <reference path="octopus/index.d.ts" />
/// <reference path="apiCalls.ts" />

import moment = require("moment-timezone");
import TaskAgentRestClient = require("TFS/DistributedTask/TaskAgentRestClient");
import { Settings } from "./settings";
import { OctopusWidgetViewModel } from "./octopusWidgetViewModel";
import { ApiCalls } from "./apiCalls";
import ko = require("knockout");

export class OctopusDashboardWidget {

    public ViewModel: OctopusWidgetViewModel

    constructor(public WidgetHelpers) {
        this.ViewModel = new OctopusWidgetViewModel();
        ko.applyBindings(this.ViewModel);
    }

    private displayEmptyWidget() {

        this.ViewModel.isSetup();
        return this.WidgetHelpers.WidgetStatusHelper.Success();
    }

    private getDashboardWidget(deployments: IDeployment[], environments: IEnvironment[], customSettings: ISettings, url: string, columnCount: number) {

        var projectDeploys = ko.utils.arrayFilter(deployments, d => d.ProjectId === customSettings.projectId);

        if (!environments) {
            console.debug("Displaying default widget because project or environments do not exist.")
            return this.displayEmptyWidget();
        }

        var name = (!customSettings.name ? "Octopus Deploy" : customSettings.name);
        var envId = customSettings.environmentId;

        this.ViewModel.setMetadata(name, url);
        this.ViewModel.setModel(environments, projectDeploys, envId, columnCount);

        return this.WidgetHelpers.WidgetStatusHelper.Success();
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

                    var projectId = webContext.project.id;
                    var endpointId = customSettings.endpointId;
                    return ApiCalls.getEnvironments(projectId, endpointId)
                        .then(environments => {
                            return ApiCalls.getDeployments(projectId, endpointId)
                                .then(deployments => {
                                    return displayClass.getDashboardWidget(deployments, environments, customSettings, endpoint.url, columnSize);
                                });
                        });
                });
        }
        catch (e) {
            console.error(e);
            return displayClass.displayEmptyWidget();
        }
    }

    public load(widgetSettings) {
        console.debug("Calling load");
        var result = this.showDashboard(widgetSettings);
        return result;
    }

    public reload(widgetSettings) {
        console.debug("Calling reload");
        var result = this.showDashboard(widgetSettings);
        return result;
    }
}