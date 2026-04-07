using System.Text;
using Intex.Api;
using Intex.Api.Authorization;
using Intex.Api.Data;
using Intex.Api.Data.Seed;
using Intex.Api.Models.Options;
using Intex.Api.Services;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authentication.Google;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.WebUtilities;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.Text.RegularExpressions;

var builder = WebApplication.CreateBuilder(args);

builder.Services.Configure<JwtOptions>(builder.Configuration.GetSection(JwtOptions.SectionName));

// The API can run against Postgres for normal app usage or an in-memory database for tests
// and quick local verification. Keeping that choice in one place makes the rest of the app
// behave the same regardless of which provider is active.
var useInMemoryDatabase = builder.Environment.IsEnvironment("Test") ||
    string.Equals(builder.Configuration["Database:Provider"], "InMemory", StringComparison.OrdinalIgnoreCase);

builder.Services.AddDbContext<ApplicationDbContext>(options =>
{
    if (useInMemoryDatabase)
    {
        var databaseName = builder.Configuration["Database:Name"] ?? "Intex.Api.Test";
        options.UseInMemoryDatabase(databaseName);
        return;
    }

    options.UseNpgsql(
        builder.Configuration.GetConnectionString("DefaultConnection") ??
        builder.Configuration["ConnectionStrings__DefaultConnection"] ??
        "Host=localhost;Port=5432;Database=intex;Username=intex;Password=intex_dev_password");
});

builder.Services
    .AddIdentityCore<ApplicationUser>(options =>
    {
        // Password rules are intentionally stricter than the bare defaults so the project
        // can point to a concrete security control during review.
        options.Password.RequiredLength = 12;
        options.Password.RequireDigit = true;
        options.Password.RequireLowercase = true;
        options.Password.RequireUppercase = true;
        options.Password.RequireNonAlphanumeric = true;
        options.User.RequireUniqueEmail = true;
        options.Lockout.MaxFailedAccessAttempts = 5;
        options.Lockout.DefaultLockoutTimeSpan = TimeSpan.FromMinutes(15);
        options.Lockout.AllowedForNewUsers = true;
    })
    .AddRoles<IdentityRole<Guid>>()
    .AddEntityFrameworkStores<ApplicationDbContext>()
    .AddSignInManager()
    .AddDefaultTokenProviders();

var jwtOptions = builder.Configuration.GetSection(JwtOptions.SectionName).Get<JwtOptions>() ?? new JwtOptions();
var isProductionLike = !(builder.Environment.IsDevelopment() || builder.Environment.IsEnvironment("Test"));
if (isProductionLike &&
    (string.IsNullOrWhiteSpace(jwtOptions.Key) ||
     jwtOptions.Key.Length < 32 ||
     jwtOptions.Key == JwtOptions.DevelopmentPlaceholderKey))
{
    throw new InvalidOperationException(
        "Production startup requires a strong Jwt:Key value from environment variables or secret storage.");
}

var signingKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtOptions.Key));
var googleClientId = builder.Configuration["Authentication:Google:ClientId"];
var googleClientSecret = builder.Configuration["Authentication:Google:ClientSecret"];
var publicApiHostname = builder.Configuration["PUBLIC_API_HOSTNAME"];
var frontendBaseUrl = builder.Configuration["Frontend:BaseUrl"] ??
    builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>()?.FirstOrDefault();
var defaultFrontendOrigins = new[]
{
    "http://localhost:4173",
    "http://localhost:4174",
    "http://localhost:4175",
    "http://localhost:4176",
    "http://localhost:5173",
    "http://127.0.0.1:4173",
    "http://127.0.0.1:4174",
    "http://127.0.0.1:4175",
    "http://127.0.0.1:4176",
    "http://127.0.0.1:5173"
};

var authenticationBuilder = builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddCookie(IdentityConstants.ExternalScheme)
    .AddJwtBearer(options =>
    {
        options.RequireHttpsMetadata = isProductionLike;
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateIssuerSigningKey = true,
            ValidateLifetime = true,
            ValidIssuer = jwtOptions.Issuer,
            ValidAudience = jwtOptions.Audience,
            IssuerSigningKey = signingKey,
            ClockSkew = TimeSpan.FromMinutes(2)
        };
    });

if (!string.IsNullOrWhiteSpace(googleClientId) && !string.IsNullOrWhiteSpace(googleClientSecret))
{
    authenticationBuilder.AddGoogle(options =>
    {
        static string NormalizeReturnUrl(string? returnUrl)
        {
            if (string.IsNullOrWhiteSpace(returnUrl) || !returnUrl.StartsWith('/') || returnUrl.StartsWith("//"))
            {
                return "/portal";
            }

            return returnUrl;
        }

        string BuildFrontendGoogleCallbackUrl(string? returnUrl, string? error)
        {
            var resolvedFrontendBaseUrl = frontendBaseUrl ?? publicApiHostname ?? string.Empty;
            var sanitizedReturnUrl = NormalizeReturnUrl(returnUrl);
            var values = new List<string>();

            if (!string.IsNullOrWhiteSpace(error))
            {
                values.Add($"error={Uri.EscapeDataString(error)}");
            }

            values.Add($"returnUrl={Uri.EscapeDataString(sanitizedReturnUrl)}");

            return $"{resolvedFrontendBaseUrl.TrimEnd('/')}/login/google/callback#{string.Join('&', values)}";
        }

        options.SignInScheme = IdentityConstants.ExternalScheme;
        options.ClientId = googleClientId;
        options.ClientSecret = googleClientSecret;
        options.Events.OnRedirectToAuthorizationEndpoint = context =>
        {
            if (!string.IsNullOrWhiteSpace(publicApiHostname) &&
                Uri.TryCreate(publicApiHostname, UriKind.Absolute, out var publicApiUri))
            {
                var absoluteCallback = new UriBuilder(publicApiUri)
                {
                    Path = options.CallbackPath
                }.Uri.ToString();

                var rewrittenRedirect = Regex.Replace(
                    context.RedirectUri,
                    @"redirect_uri=[^&]+",
                    $"redirect_uri={Uri.EscapeDataString(absoluteCallback)}");

                context.Response.Redirect(rewrittenRedirect);
                return Task.CompletedTask;
            }

            context.Response.Redirect(context.RedirectUri);
            return Task.CompletedTask;
        };
        options.Events.OnRemoteFailure = context =>
        {
            var returnUrl = "/portal";
            if (!string.IsNullOrWhiteSpace(context.Properties?.RedirectUri) &&
                Uri.TryCreate(context.Properties.RedirectUri, UriKind.Absolute, out var redirectUri))
            {
                returnUrl = NormalizeReturnUrl(QueryHelpers.ParseQuery(redirectUri.Query)["returnUrl"].ToString());
            }

            context.Response.Redirect(BuildFrontendGoogleCallbackUrl(returnUrl, context.Failure?.Message ?? "Google sign-in could not be completed."));
            context.HandleResponse();
            return Task.CompletedTask;
        };
    });
}

builder.Services.AddAuthorization(options =>
{
    options.AddPolicy(Policies.StaffOrAdmin, policy => policy.RequireRole(RoleNames.Admin, RoleNames.Staff));
    options.AddPolicy(Policies.AdminOnly, policy => policy.RequireRole(RoleNames.Admin));
    options.AddPolicy(Policies.DonorOnly, policy => policy.RequireRole(RoleNames.Donor));
});

builder.Services.AddCors(options =>
{
    options.AddPolicy("Frontend", policy =>
    {
        // In production, CORS should come from environment variables so the deployed frontend
        // can be changed without editing code. These localhost entries are only the fallback
        // for local development when no explicit deployment origin has been provided yet.
        var configuredOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>();
        var validConfiguredOrigins = configuredOrigins?
            .Where(origin => Uri.TryCreate(origin, UriKind.Absolute, out var uri) &&
                (uri.Scheme == Uri.UriSchemeHttp || uri.Scheme == Uri.UriSchemeHttps) &&
                (uri.AbsolutePath == "/" || string.IsNullOrEmpty(uri.AbsolutePath)) &&
                (!isProductionLike || !uri.IsLoopback))
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToArray();

        if (validConfiguredOrigins is { Length: > 0 })
        {
            policy.WithOrigins(validConfiguredOrigins)
                .AllowAnyHeader()
                .AllowAnyMethod();
            return;
        }

        policy.WithOrigins(
                defaultFrontendOrigins)
            .AllowAnyHeader()
            .AllowAnyMethod();
    });
});

builder.Services.AddControllers();
builder.Services.AddOpenApi();
builder.Services.AddScoped<IJwtTokenService, JwtTokenService>();
builder.Services.AddScoped<IAuditLogService, AuditLogService>();
builder.Services.AddScoped<AppSeeder>();

var app = builder.Build();

app.UseForwardedHeaders(new ForwardedHeadersOptions
{
    ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto,
    // HarborLight is deployed behind a local reverse proxy in Docker and an external TLS proxy.
    // Clear the defaults so forwarded scheme/host data from that chain is honored consistently.
    KnownNetworks = { },
    KnownProxies = { }
});

app.Use(async (context, next) =>
{
    try
    {
        await next();
    }
    catch (Exception exception)
    {
        if (context.Response.HasStarted)
        {
            throw;
        }

        app.Logger.LogError(exception, "Unhandled API exception for {Path}", context.Request.Path);
        context.Response.Clear();
        context.Response.StatusCode = StatusCodes.Status500InternalServerError;
        context.Response.ContentType = "application/problem+json";

        var problem = new ProblemDetails
        {
            Title = "Unexpected server error",
            Status = StatusCodes.Status500InternalServerError,
            Detail = app.Environment.IsDevelopment() || app.Environment.IsEnvironment("Test")
                ? exception.Message
                : "An unexpected error occurred.",
            Instance = context.Request.Path
        };
        problem.Extensions["traceId"] = context.TraceIdentifier;

        await context.Response.WriteAsJsonAsync(problem);
    }
});

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}
else
{
    app.UseHsts();
}

// Keep HTTPS redirection for deployed environments, but avoid breaking local React/Vite development with cross-origin preflight redirects.
if (!app.Environment.IsDevelopment())
{
    app.UseHttpsRedirection();
}

app.UseRouting();

app.Use(async (context, next) =>
{
    var origin = context.Request.Headers.Origin.ToString();
    if (app.Environment.IsDevelopment() && !string.IsNullOrWhiteSpace(origin))
    {
        context.Response.Headers["Access-Control-Allow-Origin"] = origin;
        context.Response.Headers["Vary"] = "Origin";
        context.Response.Headers["Access-Control-Allow-Headers"] = "Authorization, Content-Type";
        context.Response.Headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS";

        if (HttpMethods.IsOptions(context.Request.Method))
        {
            context.Response.StatusCode = StatusCodes.Status204NoContent;
            return;
        }
    }

    context.Response.Headers["X-Content-Type-Options"] = "nosniff";
    context.Response.Headers["X-Frame-Options"] = "DENY";
    context.Response.Headers["Referrer-Policy"] = "strict-origin-when-cross-origin";
    context.Response.Headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()";

    var cspConnectSources = app.Environment.IsDevelopment()
        ? "'self' http://localhost:4173 http://localhost:4174 http://localhost:5173 http://localhost:5080 http://localhost:5081 http://localhost:5082 http://localhost:8080 https://localhost:4173 https://localhost:4174 https://localhost:5173"
        : BuildProductionConnectSources(app.Configuration);

    context.Response.Headers["Content-Security-Policy"] =
        "default-src 'self'; " +
        "base-uri 'self'; " +
        "form-action 'self'; " +
        "frame-ancestors 'none'; " +
        "object-src 'none'; " +
        "script-src 'self'; " +
        "style-src 'self' 'unsafe-inline'; " +
        "img-src 'self' data: https:; " +
        "font-src 'self' data:; " +
        $"connect-src {cspConnectSources};";

    await next();
});

app.UseCors("Frontend");
app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

using (var scope = app.Services.CreateScope())
{
    var dbContext = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
    // Keep automated tests fast and deterministic by skipping migrations when the host is running under the Test environment.
    if (!app.Environment.IsEnvironment("Test") && !useInMemoryDatabase)
    {
        await dbContext.Database.MigrateAsync();
    }

    // Seed data gives the frontend meaningful records immediately after startup. The seeder is
    // written to be idempotent, so repeated boots do not keep inserting duplicates.
    var seeder = scope.ServiceProvider.GetRequiredService<AppSeeder>();
    await seeder.SeedAsync();
}

app.Run();

static string BuildProductionConnectSources(IConfiguration configuration)
{
    var configuredOrigins = configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? [];
    var publicApiHostname = configuration["PUBLIC_API_HOSTNAME"];

    var sources = configuredOrigins
        .Append(NormalizeProductionOrigin(publicApiHostname))
        .Where(value => !string.IsNullOrWhiteSpace(value))
        .Select(value => value!.TrimEnd('/'))
        .Where(value => Uri.TryCreate(value, UriKind.Absolute, out var uri) &&
            (uri.Scheme == Uri.UriSchemeHttp || uri.Scheme == Uri.UriSchemeHttps) &&
            !uri.IsLoopback)
        .Distinct(StringComparer.OrdinalIgnoreCase)
        .ToList();

    sources.Insert(0, "'self'");
    return string.Join(' ', sources);
}

static string? NormalizeProductionOrigin(string? value)
{
    if (string.IsNullOrWhiteSpace(value))
    {
        return null;
    }

    var trimmed = value.Trim().TrimEnd('/');
    if (trimmed.StartsWith("http://", StringComparison.OrdinalIgnoreCase) ||
        trimmed.StartsWith("https://", StringComparison.OrdinalIgnoreCase))
    {
        return trimmed;
    }

    return $"https://{trimmed}";
}
