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
import {Settings} from "./settings";
import ko = require("knockout");

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
        
        var environment = ko.utils.arrayFirst(data.Environments as IEnvironment[], item => item.Id === customSettings.environmentId);
        var project = ko.utils.arrayFirst(data.Projects as IProject[], item => item.Id === customSettings.projectId);

        var deployment = ko.utils.arrayFirst(data.Items as IDeployment[], 
            entry => entry.EnvironmentId === customSettings.environmentId && entry.ProjectId === customSettings.projectId && entry.IsCurrent);

        if (!environment || !project || !deployment) {
            console.log("Displaying default widget because project, environment or deployment does not exist.")
            return this.displayEmptyWidget();
        }

        return this.display(project, environment, deployment, customSettings, url);
    }

    private showDashboard(widgetSettings) {
        var customSettings = JSON.parse(widgetSettings.customSettings.data) as ISettings;
        
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
                            return displayClass.getDashboardWidget(response.data, customSettings, endpoint.url);
                        })
                        .catch(function (error) {
                            console.log(error);
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