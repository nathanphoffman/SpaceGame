using Microsoft.AspNetCore.OpenApi;
using Microsoft.OpenApi;
using SpaceGame.Core;

namespace SpaceGame.Server.Api;

/// <summary>Documents the id types as plain strings, which is how they are sent on the wire.</summary>
public static class IdSchema
{
    private static readonly HashSet<Type> IdTypes = [typeof(PlayerId), typeof(PlanetId), typeof(SystemId), typeof(FleetId)];

    public static Task Transform(OpenApiSchema schema, OpenApiSchemaTransformerContext context, CancellationToken cancel)
    {
        if (IdTypes.Contains(Nullable.GetUnderlyingType(context.JsonTypeInfo.Type) ?? context.JsonTypeInfo.Type))
        {
            schema.Type = JsonSchemaType.String;
            schema.Properties = null;
            schema.Required = null;
            schema.AdditionalPropertiesAllowed = true;
        }

        return Task.CompletedTask;
    }
}
