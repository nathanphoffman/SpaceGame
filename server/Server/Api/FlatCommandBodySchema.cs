using Microsoft.AspNetCore.OpenApi;
using Microsoft.OpenApi;

namespace SpaceGame.Server.Api;

/// <summary>Documents <see cref="CommandBody"/> as the flat object it is on the wire, not as its nested parts.</summary>
public static class FlatCommandBodySchema
{
    private static readonly Type[] Parts = [typeof(CommandTarget), typeof(CommandChoice), typeof(FleetPayload)];

    public static async Task Transform(OpenApiSchema schema, OpenApiSchemaTransformerContext context, CancellationToken cancel)
    {
        if (context.JsonTypeInfo.Type != typeof(CommandBody))
        {
            return;
        }

        schema.Type = JsonSchemaType.Object;
        schema.Properties = new Dictionary<string, IOpenApiSchema>
        {
            ["type"] = new OpenApiSchema { Type = JsonSchemaType.Null | JsonSchemaType.String },
        };

        foreach (var part in Parts)
        {
            var partSchema = await context.GetOrCreateSchemaAsync(part, null, cancel);

            foreach (var (name, property) in partSchema.Properties ?? new Dictionary<string, IOpenApiSchema>())
            {
                schema.Properties[name] = property;
            }
        }

        schema.Required = new HashSet<string>(schema.Properties.Keys);
    }
}
