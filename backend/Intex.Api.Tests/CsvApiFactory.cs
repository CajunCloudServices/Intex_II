using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace Intex.Api.Tests;

public class CsvApiFactory : WebApplicationFactory<Program>
{
    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Test");
        builder.ConfigureLogging(logging => logging.ClearProviders());
        builder.ConfigureAppConfiguration((_, config) =>
        {
            config.AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Database:Name"] = $"IntexCsvTests-{Guid.NewGuid():N}",
                ["Seed:Mode"] = "Csv",
                ["Seed:ImportCsvOnStartup"] = "true",
                ["Seed:BackfillCsvOnStartup"] = "false",
                ["Seed:CsvPath"] = ResolveCsvRoot()
            });
        });
    }

    private static string ResolveCsvRoot()
        => Path.GetFullPath(Path.Combine(
            AppContext.BaseDirectory,
            "..",
            "..",
            "..",
            "..",
            "..",
            "ml-pipelines",
            "lighthouse_csv_v7"));
}
