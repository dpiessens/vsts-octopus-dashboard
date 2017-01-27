/// <reference types="vss-web-extension-sdk" />
/// <reference path="octopus/index.d.ts" />

import TFS_Task_Contracts = require("TFS/DistributedTask/Contracts");
import TaskAgentRestClient = require("TFS/DistributedTask/TaskAgentRestClient");
import Q = require("q");
import ko = require('knockout');

export class ApiCalls {

    public static getDeployments(projectId: string, endpointId: string) : IPromise<IDeployment[]> {
        
        var deferred = Q.defer<IDeployment[]>();
        var endpointClient = TaskAgentRestClient.getClient();

        var serviceEndpointRequest = <TFS_Task_Contracts.ServiceEndpointRequest>({
            dataSourceDetails: {
                dataSourceName: "OctopusDeployments"
            }
        });

        endpointClient.executeServiceEndpointRequest(serviceEndpointRequest, projectId, endpointId)
            .then(response => {
                if (!response || !response.result || response.statusCode != 'ok') {
                    console.warn("Octopus dashboard service call responded with error: " + response.errorMessage);
                    deferred.resolve([] as IDeployment[]);
                }

                var deploys = ko.utils.arrayMap(response.result as string[], s => JSON.parse(s) as IDeployment);
                deferred.resolve(deploys);
            });
        
        return deferred.promise;
    }

    public static getEnvironments(projectId: string, endpointId: string) : IPromise<IEnvironment[]> {
        
        var deferred = Q.defer<IEnvironment[]>();
        var endpointClient = TaskAgentRestClient.getClient();

        var serviceEndpointRequest = <TFS_Task_Contracts.ServiceEndpointRequest>({
            dataSourceDetails: {
                dataSourceName: "OctopusAllEnvironments"
            }
        });

        endpointClient.executeServiceEndpointRequest(serviceEndpointRequest, projectId, endpointId)
            .then(response => {
                if (!response || !response.result || response.statusCode != 'ok') {
                    console.warn("Octopus project service call responded with error: " + response.errorMessage);
                    deferred.resolve([] as IEnvironment[]);
                }

                var envs = ko.utils.arrayMap(response.result as string[], s => JSON.parse(s) as IEnvironment);
                deferred.resolve(envs);
            });
        
        return deferred.promise;
    }

    public static getProjects(projectId: string, endpointId: string) : IPromise<IProject[]> {
                
        var deferred = Q.defer<IProject[]>();
        var endpointClient = TaskAgentRestClient.getClient();

        var serviceEndpointRequest = <TFS_Task_Contracts.ServiceEndpointRequest>({
            dataSourceDetails: {
                dataSourceName: "OctopusAllProjects"
            }
        });

        endpointClient.executeServiceEndpointRequest(serviceEndpointRequest, projectId, endpointId)
            .then(response => {
                if (!response || !response.result || response.statusCode != 'ok') {
                    console.warn("Octopus project service call responded with error: " + response.errorMessage);
                    deferred.resolve([] as IProject[]);
                }

                var projects = ko.utils.arrayMap(response.result as string[], s => JSON.parse(s) as IProject);
                deferred.resolve(projects);
            });
        
        return deferred.promise;
    }
}