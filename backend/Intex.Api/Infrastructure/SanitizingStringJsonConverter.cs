using System.Text.Json;
using System.Text.Json.Serialization;
using System.Text.RegularExpressions;

namespace Intex.Api.Infrastructure;

public sealed partial class SanitizingStringJsonConverter : JsonConverter<string>
{
    public override string Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
    {
        if (reader.TokenType != JsonTokenType.String)
        {
            return string.Empty;
        }

        var value = reader.GetString() ?? string.Empty;
        var withoutControls = ControlCharacterRegex().Replace(value, string.Empty);
        return SpaceRegex().Replace(withoutControls.Trim(), " ");
    }

    public override void Write(Utf8JsonWriter writer, string value, JsonSerializerOptions options)
    {
        writer.WriteStringValue(value);
    }

    [GeneratedRegex("[\\u0000-\\u001F\\u007F]")]
    private static partial Regex ControlCharacterRegex();

    [GeneratedRegex("\\s{2,}")]
    private static partial Regex SpaceRegex();
}
