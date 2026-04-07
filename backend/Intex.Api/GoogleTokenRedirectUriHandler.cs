using System.Text;
using Microsoft.AspNetCore.WebUtilities;

namespace Intex.Api;

sealed class GoogleTokenRedirectUriHandler(string publicCallbackUri) : DelegatingHandler
{
    protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
    {
        if (request.Content is not null &&
            request.Method == HttpMethod.Post &&
            request.RequestUri is not null &&
            request.RequestUri.AbsoluteUri.Contains("googleapis.com/token", StringComparison.OrdinalIgnoreCase))
        {
            var payload = await request.Content.ReadAsStringAsync(cancellationToken);
            var parameters = QueryHelpers.ParseQuery($"?{payload}")
                .ToDictionary(
                    pair => pair.Key,
                    pair => pair.Key == "redirect_uri" ? publicCallbackUri : pair.Value.ToString(),
                    StringComparer.Ordinal);

            request.Content = new FormUrlEncodedContent(parameters);
        }

        return await base.SendAsync(request, cancellationToken);
    }
}
