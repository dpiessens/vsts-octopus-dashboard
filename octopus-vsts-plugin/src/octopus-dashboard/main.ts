/// <reference types="vss-web-extension-sdk" />
/// <reference path="octopusWidget.ts"/>

import {OctopusDashboardWidget} from "./octopusWidget"

VSS.require(["TFS/Dashboards/WidgetHelpers"], (WidgetHelpers) => {
    WidgetHelpers.IncludeWidgetStyles();
    
    VSS.register("OctopusDashboardWidget", () => {
        return new OctopusDashboardWidget(WidgetHelpers);
    })
    VSS.notifyLoadSucceeded();
});