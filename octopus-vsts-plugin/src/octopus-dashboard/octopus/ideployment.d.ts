interface IDeployment extends IHasId {
    ProjectId: string,
    ReleaseId: string,
    EnvironmentId: string,
    TaskId: string,
    TenantId: string,
    ChannelId: string,
    ReleaseVersion: string,
    Created: string,
    State: string,
    Duration: string,
    ErrorMessage: string,
    IsCurrent: boolean,
    IsPrevious: boolean,
    IsCompleted: boolean
}