using System.Text.Json;
using System.Text.Json.Serialization;

namespace SpaceGame.Core;

/// <summary>Writes an id as a plain JSON string (also as a dictionary key) instead of a { value } object.</summary>
public class IdJsonConverter<T>(Func<string, T> make, Func<T, string> unwrap) : JsonConverter<T>
{
    public override T Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options) => make(reader.GetString() ?? "");

    public override void Write(Utf8JsonWriter writer, T value, JsonSerializerOptions options) => writer.WriteStringValue(unwrap(value));

    public override T ReadAsPropertyName(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options) => make(reader.GetString() ?? "");

    public override void WriteAsPropertyName(Utf8JsonWriter writer, T value, JsonSerializerOptions options) => writer.WritePropertyName(unwrap(value));
}

/// <summary>Identifies a player.</summary>
[JsonConverter(typeof(PlayerIdConverter))]
public readonly record struct PlayerId(string Value);

/// <summary>Identifies a planet.</summary>
[JsonConverter(typeof(PlanetIdConverter))]
public readonly record struct PlanetId(string Value);

/// <summary>Identifies a star system.</summary>
[JsonConverter(typeof(SystemIdConverter))]
public readonly record struct SystemId(string Value);

/// <summary>Identifies a fleet.</summary>
[JsonConverter(typeof(FleetIdConverter))]
public readonly record struct FleetId(string Value);

/// <summary>Writes <see cref="PlayerId"/> as a bare string so the wire format stays flat.</summary>
public sealed class PlayerIdConverter() : IdJsonConverter<PlayerId>(v => new PlayerId(v), id => id.Value);

/// <summary>Writes <see cref="PlanetId"/> as a bare string so the wire format stays flat.</summary>
public sealed class PlanetIdConverter() : IdJsonConverter<PlanetId>(v => new PlanetId(v), id => id.Value);

/// <summary>Writes <see cref="SystemId"/> as a bare string so the wire format stays flat.</summary>
public sealed class SystemIdConverter() : IdJsonConverter<SystemId>(v => new SystemId(v), id => id.Value);

/// <summary>Writes <see cref="FleetId"/> as a bare string so the wire format stays flat.</summary>
public sealed class FleetIdConverter() : IdJsonConverter<FleetId>(v => new FleetId(v), id => id.Value);
