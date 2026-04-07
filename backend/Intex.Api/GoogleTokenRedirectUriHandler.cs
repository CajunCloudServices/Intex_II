using System.Text;
using System.Text.RegularExpressions;

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
            payload = Regex.Replace(
                payload,
                @"redirect_uri=[^&]+",
                $"redirect_uri={Uri.EscapeDataString(publicCallbackUri)}");

            request.Content = new StringContent(payload, Encoding.UTF8, "application/x-www-form-urlencoded");
        }

        return await base.SendAsync(request, cancellationToken);
    }
}
