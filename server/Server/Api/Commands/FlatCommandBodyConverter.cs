using System.Text.Json;
using System.Text.Json.Nodes;
using System.Text.Json.Serialization;

namespace SpaceGame.Server.Api;

/// <summary>Reads and writes <see cref="CommandBody"/> as one flat JSON object, as the API contract says.</summary>
public sealed class FlatCommandBodyConverter : JsonConverter<CommandBody>
{
    public override CommandBody Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
    {
        // The wire format is one flat object; each part below reads only the fields it knows from the same object.
        var root = JsonElement.ParseValue(ref reader);

        if (root.ValueKind != JsonValueKind.Object)
        {
            throw new JsonException("A command must be a JSON object.");
        }

        var type = root.TryGetProperty("type", out var typeValue) && typeValue.ValueKind == JsonValueKind.String
            ? typeValue.GetString()
            : null;

        return new CommandBody(
            type,
            root.Deserialize<CommandTarget>(options)!,
            root.Deserialize<CommandChoice>(options)!,
            root.Deserialize<FleetPayload>(options)!);
    }

    public override void Write(Utf8JsonWriter writer, CommandBody value, JsonSerializerOptions options)
    {
        var flat = new JsonObject { ["type"] = value.Type };

        foreach (var part in new object[] { value.Target, value.Choice, value.Payload })
        {
            foreach (var (name, node) in JsonSerializer.SerializeToNode(part, part.GetType(), options)!.AsObject())
            {
                flat[name] = node?.DeepClone();
            }
        }

        flat.WriteTo(writer);
    }
}
