namespace Intex.Api.Models.Options;

public class SeedOptions
{
    public const string SectionName = "Seed";

    // Allowed values: Csv, Fixture
    public string Mode { get; set; } = "Csv";

    // When true, importer runs if domain tables are empty.
    public bool ImportCsvOnStartup { get; set; } = true;

    // Optional absolute or relative path to CSV folder.
    public string? CsvPath { get; set; }
}
