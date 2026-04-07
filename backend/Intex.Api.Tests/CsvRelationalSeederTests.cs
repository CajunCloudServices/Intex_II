using Intex.Api.Data;
using Intex.Api.Data.Seed;
using Intex.Api.Models.Options;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.FileProviders;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;

namespace Intex.Api.Tests;

public class CsvRelationalSeederTests
{
    [Fact]
    public async Task SeedAsync_ImportsAllTables_WhenDatabaseEmpty()
    {
        await using var dbContext = CreateDbContext(nameof(SeedAsync_ImportsAllTables_WhenDatabaseEmpty));
        var seeder = CreateSeeder(dbContext, ResolveCsvRoot());

        var result = await seeder.SeedAsync();

        Assert.True(result.Success, string.Join(Environment.NewLine, result.Errors));
        Assert.True(result.ImportedCounts.Count >= 17);
        Assert.NotEmpty(await dbContext.Safehouses.ToListAsync());
        Assert.NotEmpty(await dbContext.Residents.ToListAsync());
        Assert.NotEmpty(await dbContext.Donations.ToListAsync());
    }

    [Fact]
    public async Task SeedAsync_IsIdempotent_WhenCalledTwice()
    {
        await using var dbContext = CreateDbContext(nameof(SeedAsync_IsIdempotent_WhenCalledTwice));
        var seeder = CreateSeeder(dbContext, ResolveCsvRoot());

        var first = await seeder.SeedAsync();
        var safehouseCountAfterFirst = await dbContext.Safehouses.CountAsync();

        var second = await seeder.SeedAsync();
        var safehouseCountAfterSecond = await dbContext.Safehouses.CountAsync();

        Assert.True(first.Success, string.Join(Environment.NewLine, first.Errors));
        Assert.True(second.Success, string.Join(Environment.NewLine, second.Errors));
        Assert.Equal(safehouseCountAfterFirst, safehouseCountAfterSecond);
        Assert.Empty(second.ImportedCounts);
    }

    [Fact]
    public async Task SeedAsync_ReturnsFailure_WhenCsvPathMissing()
    {
        await using var dbContext = CreateDbContext(nameof(SeedAsync_ReturnsFailure_WhenCsvPathMissing));
        var seeder = CreateSeeder(dbContext, Path.Combine(Path.GetTempPath(), $"missing-{Guid.NewGuid():N}"));

        var result = await seeder.SeedAsync();

        Assert.False(result.Success);
        Assert.NotEmpty(result.Errors);
        Assert.Contains(result.Errors, error => error.Contains("Missing CSV file", StringComparison.OrdinalIgnoreCase));
    }

    private static ApplicationDbContext CreateDbContext(string databaseName)
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(databaseName)
            .Options;
        return new ApplicationDbContext(options);
    }

    private static CsvRelationalSeeder CreateSeeder(ApplicationDbContext dbContext, string csvPath)
    {
        var options = Options.Create(new SeedOptions
        {
            Mode = "Csv",
            ImportCsvOnStartup = true,
            CsvPath = csvPath
        });

        return new CsvRelationalSeeder(
            dbContext,
            options,
            new TestHostEnvironment(),
            NullLogger<CsvRelationalSeeder>.Instance);
    }

    private static string ResolveCsvRoot()
        => Path.GetFullPath(Path.Combine(AppContext.BaseDirectory, "..", "..", "..", "..", "..", "ml-pipelines", "lighthouse_csv_v7"));

    private sealed class TestHostEnvironment : IHostEnvironment
    {
        public string EnvironmentName { get; set; } = "Test";
        public string ApplicationName { get; set; } = "Intex.Api.Tests";
        public string ContentRootPath { get; set; } = AppContext.BaseDirectory;
        public IFileProvider ContentRootFileProvider { get; set; } = new NullFileProvider();
    }
}
