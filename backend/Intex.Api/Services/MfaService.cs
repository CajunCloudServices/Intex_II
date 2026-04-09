using System;
using System.Text;
using System.Threading.Tasks;
using Intex.Api.DTOs;
using Intex.Api.Entities;
using Microsoft.AspNetCore.Identity;

namespace Intex.Api.Services;

public class MfaService(UserManager<ApplicationUser> userManager)
{
    private const string Issuer = "TanglawProject";

    public async Task<MfaSetupResponse> BuildSetupResponseAsync(ApplicationUser user)
    {
        // Retrieve or generate the authenticator key
        var unformattedKey = await userManager.GetAuthenticatorKeyAsync(user);
        if (string.IsNullOrEmpty(unformattedKey))
        {
            await userManager.ResetAuthenticatorKeyAsync(user);
            unformattedKey = await userManager.GetAuthenticatorKeyAsync(user);
        }

        var email = await userManager.GetEmailAsync(user) ?? string.Empty;
        var encodedEmail = Uri.EscapeDataString(email);
        var encodedIssuer = Uri.EscapeDataString(Issuer);

        var uri = $"otpauth://totp/{encodedIssuer}:{encodedEmail}" +
                  $"?secret={unformattedKey}&issuer={encodedIssuer}&digits=6";

        return new MfaSetupResponse(
            SharedKey: FormatKey(unformattedKey!),
            AuthenticatorUri: uri
        );
    }

    private static string FormatKey(string key)
    {
        // Break into groups of 4 characters separated by spaces
        var result = new StringBuilder();
        for (int i = 0; i < key.Length; i++)
        {
            if (i > 0 && i % 4 == 0) result.Append(' ');
            result.Append(key[i]);
        }
        return result.ToString().ToLowerInvariant();
    }
}
