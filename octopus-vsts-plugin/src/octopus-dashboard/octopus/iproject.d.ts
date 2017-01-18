interface IProject extends IHasId {
    Name: string,
    Slug: string,
    EnvironmentIds: string[],
    ProjectGroupId: string,
    Links: IProjectLinks
}

interface IProjectLinks {
    Self: string,
    Logo: string
}