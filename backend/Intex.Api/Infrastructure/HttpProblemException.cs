using Microsoft.AspNetCore.Mvc;

namespace Intex.Api.Infrastructure;

public sealed class HttpProblemException : Exception
{
    public HttpProblemException(int statusCode, string title, string detail, string? instance = null, Exception? innerException = null)
        : base(detail, innerException)
    {
        StatusCode = statusCode;
        Title = title;
        Detail = detail;
        Instance = instance;
    }

    public int StatusCode { get; }

    public string Title { get; }

    public string Detail { get; }

    public string? Instance { get; }

    public ProblemDetails ToProblemDetails() =>
        new()
        {
            Title = Title,
            Status = StatusCode,
            Detail = Detail,
            Instance = Instance
        };
}
