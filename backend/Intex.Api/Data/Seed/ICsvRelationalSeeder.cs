namespace Intex.Api.Data.Seed;

public interface ICsvRelationalSeeder
{
    Task<CsvSeedResult> SeedAsync(CancellationToken cancellationToken = default);
    Task ReconcileIdentitySequencesAsync(CancellationToken cancellationToken = default);
}

public sealed record CsvSeedResult(
    bool Success,
    IReadOnlyDictionary<string, int> ImportedCounts,
    IReadOnlyList<string> Errors);
