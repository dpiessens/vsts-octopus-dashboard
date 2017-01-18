/// <reference types="vss-web-extension-sdk" />

/// <reference path="isettings.d.ts" />
/// <reference path="settings.ts" />
/// <reference path="octopus/index.d.ts" />

import Work_Client = require("TFS/Work/RestClient");
import WebApi_Constants = require("VSS/WebApi/Constants");
import TFS_Core_Contracts = require("TFS/Core/Contracts");
import Service = require("VSS/Service");
import Axios from 'axios';
import moment = require("moment-timezone");
import TaskAgentRestClient = require("TFS/DistributedTask/TaskAgentRestClient");
import System_Contracts = require("VSS/Common/Contracts/System");
import _ = require('underscore');
import {Settings} from "./settings";

export class OctopusDashboardWidget {
    constructor(public WidgetHelpers) { }

    private displayEmptyWidget() {
        var $widgetShell = $('#widget-shell');
        var $widgetSetup = $('#widget-setup');
        
        $widgetSetup.show();
        $widgetShell.hide();

        return this.WidgetHelpers.WidgetStatusHelper.Success();
    }

    private display(project: IProject, environment: IEnvironment, deployment: IDeployment, 
        customSettings: ISettings, octopusUrl: string) {
        
        console.log("displaying widget");
        // Toggle visibility
        $('#widget-shell').show();
        $('#widget-setup').hide();

        // Set the Title
        var $title = $("#title");
        var name = (!customSettings.name ? project.Name : customSettings.name)
        $title.text(name);

        // Set the Link for the widget
        var $widgetLink = $("#widget-link");
        $widgetLink.attr({ "href" : octopusUrl, "title" : name });
       
        // Calculate dates
        var deployDate = moment.tz(deployment.Created, "America/Chicago");

        // Set visuals
        $('#environment-name').text(environment.Name);

        $('#deploy-date').text(deployDate.from(moment()));
        $('#deploy-version').text(deployment.ReleaseVersion);

        var deployLink = octopusUrl.concat("app#/tasks/", deployment.TaskId);
        var metadata = "Version:  " + deployment.ReleaseVersion + 
                       "\nDuration: " + deployment.Duration + 
                       "\nStatus:   " + deployment.State + 
                       "\nDate:     " + deployDate.format("MMMM dd, yyyy HH:mm A");

        $("#deployment-link").attr({ "href" : deployLink, "title" : metadata });

        var $deployStatus = $('#deploy-status');
        var $environmentContainer = $('#environment-container');
        
        if (deployment.State === "Success") {
            $deployStatus.removeClass("bowtie-status-failure");
            $deployStatus.addClass("bowtie-status-success");
            $environmentContainer.removeClass("failure");
            $environmentContainer.addClass("success");
        }
        else {
            $deployStatus.removeClass("bowtie-status-success");
            $deployStatus.addClass("bowtie-status-failure");
            $environmentContainer.removeClass("success");
            $environmentContainer.addClass("failure");
        }

        return this.WidgetHelpers.WidgetStatusHelper.Success();
    }

    private getDashboardWidget(data, customSettings: ISettings, url: string) {
        console.log("Entering getDashboardWidget");
        var environment = _.chain(data.Environments as IEnvironment[])
            .select(function(item) { return item.Id === customSettings.environmentId})
            .first()
            .value();

        var project = _.chain(data.Projects as IProject[])
            .select(function(item) { return item.Id === customSettings.projectId})
            .first()
            .value();

        var deployment = _.chain(data.Items as IDeployment[])
            .select(function(entry) { return entry.EnvironmentId === customSettings.environmentId && entry.ProjectId === customSettings.projectId && entry.IsCurrent})
            .first()
            .value();

        if (!environment || !project || !deployment) {
            console.log("Displaying default widget because project, environment or deployment does not exist.")
            return this.displayEmptyWidget();
        }

        console.log("displaying widget calling");
        return this.display(project, environment, deployment, customSettings, url);
    }

    private showDashboard(widgetSettings) {
        console.log("Showing octopus dashboard widget.");
        var customSettings = JSON.parse(widgetSettings.customSettings.data) as ISettings;
        
        if (!customSettings) {
            // Return the default screen here
            console.log("Displaying default widget because settings do not exist.")
            //return this.displayEmptyWidget();
            customSettings = new Settings("7ddebfb7-e766-4095-b9ad-96c83102d43f", null, "Projects-1", "Environments-1");
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
                            return displayClass.getDashboardWidget(response.data, customSettings, endpoint.url);
                        })
                        .catch(function (error) {
                            console.log(error);
                            return displayClass.displayEmptyWidget();
                        });
                });
        }
        catch (e) {
            console.log(e);
            return displayClass.displayEmptyWidget();
        }
    }

    public load(widgetSettings) {
        var result = this.showDashboard(widgetSettings);
        console.log("Load Result: " + result);
        return result;
    }

    public reload(widgetSettings) {
        var result = this.showDashboard(widgetSettings);
        console.log("Reload Result: " + result);
        return result;
    }
}