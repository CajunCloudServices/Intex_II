namespace Intex.Api.Data.Seed;

public interface ICsvOperationalBackfillImporter
{
    Task<CsvBackfillResult> BackfillAsync(CancellationToken cancellationToken = default);
}

public sealed record CsvBackfillResult(
    bool Success,
    string CsvRoot,
    IReadOnlyDictionary<string, int> InsertedCounts,
    IReadOnlyDictionary<string, int> MatchedCounts,
    IReadOnlyList<string> Warnings,
    IReadOnlyList<string> Errors);
