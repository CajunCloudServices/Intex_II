using System.Net;
using Intex.Api;
using Intex.Api.Authorization;
using Intex.Api.Data;
using Intex.Api.Data.Seed;
using Intex.Api.Infrastructure;
using Intex.Api.Models.Options;
using Intex.Api.Services;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authentication.Google;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.AspNetCore.WebUtilities;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using System.Text.RegularExpressions;
using System.Threading.RateLimiting;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddHsts(options =>
{
    options.MaxAge = TimeSpan.FromDays(365);
    options.IncludeSubDomains = true;
    options.Preload = true;
});

builder.Services.Configure<MlInferenceOptions>(builder.Configuration.GetSection(MlInferenceOptions.SectionName));
builder.Services.Configure<MlDashboardOptions>(builder.Configuration.GetSection(MlDashboardOptions.SectionName));
builder.Services.Configure<SeedOptions>(builder.Configuration.GetSection(SeedOptions.SectionName));
builder.Services.Configure<DonationImpactOptions>(builder.Configuration.GetSection(DonationImpactOptions.SectionName));

ConfigureForwardedHeaders(builder);

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

    var connectionString = builder.Configuration.GetConnectionString("DefaultConnection") ??
        builder.Configuration["ConnectionStrings__DefaultConnection"];
    if (string.IsNullOrWhiteSpace(connectionString))
    {
        throw new InvalidOperationException(
            "A database connection string is required. Set ConnectionStrings:DefaultConnection or ConnectionStrings__DefaultConnection via environment variables or user secrets.");
    }

    options.UseNpgsql(connectionString);
});

builder.Services
    .AddIdentity<ApplicationUser, IdentityRole<Guid>>(options =>
    {
        options.Password.RequiredLength = 14;
        options.Password.RequireDigit = false;
        options.Password.RequireLowercase = false;
        options.Password.RequireUppercase = false;
        options.Password.RequireNonAlphanumeric = false;
        options.User.RequireUniqueEmail = true;
        options.Lockout.MaxFailedAccessAttempts = 5;
        options.Lockout.DefaultLockoutTimeSpan = TimeSpan.FromMinutes(15);
        options.Lockout.AllowedForNewUsers = true;
    })
    .AddEntityFrameworkStores<ApplicationDbContext>()
    .AddDefaultTokenProviders();

builder.Services.AddScoped<IUserClaimsPrincipalFactory<ApplicationUser>, ApplicationUserClaimsPrincipalFactory>();

var isProductionLike = !(builder.Environment.IsDevelopment() || builder.Environment.IsEnvironment("Test"));

builder.Services.ConfigureApplicationCookie(options =>
{
    options.Cookie.Name = "Intex.Auth";
    options.Cookie.HttpOnly = true;
    options.Cookie.SecurePolicy = isProductionLike ? CookieSecurePolicy.Always : CookieSecurePolicy.SameAsRequest;
    options.Cookie.SameSite = isProductionLike ? SameSiteMode.None : SameSiteMode.Lax;
    options.SlidingExpiration = true;
    options.ExpireTimeSpan = TimeSpan.FromHours(2);
    options.Events.OnRedirectToLogin = context =>
    {
        context.Response.StatusCode = StatusCodes.Status401Unauthorized;
        return Task.CompletedTask;
    };
    options.Events.OnRedirectToAccessDenied = context =>
    {
        context.Response.StatusCode = StatusCodes.Status403Forbidden;
        return Task.CompletedTask;
    };
});

builder.Services.Configure<CookieAuthenticationOptions>(IdentityConstants.ExternalScheme, options =>
{
    options.Cookie.Name = "Intex.External";
    options.Cookie.HttpOnly = true;
    options.Cookie.SecurePolicy = isProductionLike ? CookieSecurePolicy.Always : CookieSecurePolicy.SameAsRequest;
    options.Cookie.SameSite = isProductionLike ? SameSiteMode.None : SameSiteMode.Lax;
    options.ExpireTimeSpan = TimeSpan.FromMinutes(15);
});

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

// Identity already registers the External cookie scheme; only add the Google handler when configured.
if (!string.IsNullOrWhiteSpace(googleClientId) && !string.IsNullOrWhiteSpace(googleClientSecret))
{
    builder.Services.AddAuthentication()
        .AddGoogle(options =>
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
            var path = $"{resolvedFrontendBaseUrl.TrimEnd('/')}/login/google/callback";

            if (!string.IsNullOrWhiteSpace(error))
            {
                return QueryHelpers.AddQueryString(path, new Dictionary<string, string?>
                {
                    ["returnUrl"] = sanitizedReturnUrl,
                    ["error"] = error
                });
            }

            return QueryHelpers.AddQueryString(path, "returnUrl", sanitizedReturnUrl);
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

        if (!string.IsNullOrWhiteSpace(publicApiHostname) &&
            Uri.TryCreate(publicApiHostname, UriKind.Absolute, out var publicApiUri))
        {
            var publicCallbackUri = new UriBuilder(publicApiUri)
            {
                Path = options.CallbackPath
            }.Uri.ToString();

            options.BackchannelHttpHandler = new GoogleTokenRedirectUriHandler(publicCallbackUri)
            {
                InnerHandler = new HttpClientHandler()
            };
        }
    });
}

builder.Services.AddAuthorization(options =>
{
    options.AddPolicy(Policies.StaffOrAdmin, policy => policy.RequireRole(RoleNames.Admin, RoleNames.Staff));
    options.AddPolicy(Policies.AdminOnly, policy => policy.RequireRole(RoleNames.Admin));
    options.AddPolicy(Policies.DonorOnly, policy => policy.RequireRole(RoleNames.Donor));
});

var isTestEnvironment = builder.Environment.IsEnvironment("Test");

builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    options.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(context =>
    {
        var remoteIp = context.Connection.RemoteIpAddress?.ToString() ?? "unknown";
        return RateLimitPartition.GetFixedWindowLimiter(
            partitionKey: remoteIp,
            factory: _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = isTestEnvironment ? 1_000_000 : 120,
                Window = TimeSpan.FromMinutes(1),
                QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
                QueueLimit = 0,
                AutoReplenishment = true
            });
    });

    options.AddFixedWindowLimiter("auth-login", limiterOptions =>
    {
        // Integration tests perform many sequential logins; keep strict limits for non-test environments only.
        limiterOptions.PermitLimit = isTestEnvironment ? 1_000_000 : 10;
        limiterOptions.Window = TimeSpan.FromMinutes(1);
        limiterOptions.QueueProcessingOrder = QueueProcessingOrder.OldestFirst;
        limiterOptions.QueueLimit = 0;
        limiterOptions.AutoReplenishment = true;
    });

    options.AddFixedWindowLimiter("reports-heavy", limiterOptions =>
    {
        limiterOptions.PermitLimit = isTestEnvironment ? 1_000_000 : 60;
        limiterOptions.Window = TimeSpan.FromMinutes(1);
        limiterOptions.QueueProcessingOrder = QueueProcessingOrder.OldestFirst;
        limiterOptions.QueueLimit = 0;
        limiterOptions.AutoReplenishment = true;
    });
});

builder.Services.AddCors(options =>
{
    options.AddPolicy("Frontend", policy =>
    {
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
                .AllowAnyMethod()
                .AllowCredentials();
            return;
        }

        policy.WithOrigins(defaultFrontendOrigins)
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials();
    });
});

builder.Services
    .AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.Converters.Add(new SanitizingStringJsonConverter());
    })
    .ConfigureApiBehaviorOptions(options =>
    {
        options.InvalidModelStateResponseFactory = context =>
        {
            var errors = context.ModelState
                .Where(entry => entry.Value?.Errors.Count > 0)
                .SelectMany(entry => entry.Value!.Errors.Select(error => new
                {
                    field = entry.Key,
                    message = string.IsNullOrWhiteSpace(error.ErrorMessage) ? "Invalid value." : error.ErrorMessage
                }))
                .ToList();

            return new BadRequestObjectResult(new
            {
                title = "Validation failed",
                message = "One or more input fields are invalid.",
                status = StatusCodes.Status400BadRequest,
                traceId = context.HttpContext.TraceIdentifier,
                errors
            });
        };
    });
builder.Services.AddOpenApi();
builder.Services.AddScoped<IReintegrationFeatureBuilder, ReintegrationFeatureBuilder>();
builder.Services.AddScoped<ICsvRelationalSeeder, CsvRelationalSeeder>();
builder.Services.AddHttpClient<IMlInferenceClient, MlInferenceClient>((serviceProvider, client) =>
{
    var options = serviceProvider.GetRequiredService<IOptions<MlInferenceOptions>>().Value;
    client.BaseAddress = new Uri(options.BaseUrl);
    client.Timeout = TimeSpan.FromSeconds(Math.Max(1, options.TimeoutSeconds));
});
builder.Services.AddScoped<IAuditLogService, AuditLogService>();
builder.Services.AddScoped<AppSeeder>();

var app = builder.Build();

if (app.Environment.IsProduction())
{
    ValidateProductionCorsOrigins(app.Configuration);
}

app.UseForwardedHeaders();

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

if (!app.Environment.IsDevelopment())
{
    app.UseHttpsRedirection();
}

app.UseRouting();
app.UseRateLimiter();

app.Use(async (context, next) =>
{
    var origin = context.Request.Headers.Origin.ToString();
    if (app.Environment.IsDevelopment() && !string.IsNullOrWhiteSpace(origin))
    {
        context.Response.Headers["Access-Control-Allow-Origin"] = origin;
        context.Response.Headers["Vary"] = "Origin";
        context.Response.Headers["Access-Control-Allow-Credentials"] = "true";
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
    context.Response.Headers["Cross-Origin-Opener-Policy"] = "same-origin";
    context.Response.Headers["Referrer-Policy"] = "strict-origin-when-cross-origin";
    context.Response.Headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()";

    var cspConnectSources = app.Environment.IsDevelopment()
        ? "'self' http://localhost:4173 http://localhost:4174 http://localhost:5173 http://localhost:5080 http://localhost:5081 http://localhost:5082 http://localhost:8080 https://localhost:4173 https://localhost:4174 https://localhost:5173"
        : BuildProductionConnectSources(app.Configuration);

    var imgSrc = BuildContentSecurityPolicyImgSrc(app.Configuration, app.Environment);

    context.Response.Headers["Content-Security-Policy"] =
        "default-src 'self'; " +
        "base-uri 'self'; " +
        "form-action 'self'; " +
        "frame-ancestors 'none'; " +
        "object-src 'none'; " +
        "script-src 'self' https://static.cloudflareinsights.com; " +
        "style-src 'self' https://fonts.googleapis.com; " +
        $"img-src {imgSrc}; " +
        "font-src 'self' data: https://fonts.gstatic.com; " +
        $"connect-src {cspConnectSources} https://cloudflareinsights.com;";

    await next();
});

app.UseCors("Frontend");
app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

using (var scope = app.Services.CreateScope())
{
    var dbContext = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
    if (!app.Environment.IsEnvironment("Test") && !useInMemoryDatabase)
    {
        await dbContext.Database.MigrateAsync();
    }

    var seeder = scope.ServiceProvider.GetRequiredService<AppSeeder>();
    await seeder.SeedAsync();
}

app.Run();

static void ValidateProductionCorsOrigins(IConfiguration configuration)
{
    var origins = configuration.GetSection("Cors:AllowedOrigins").Get<string[]>();
    if (origins is not { Length: > 0 })
    {
        throw new InvalidOperationException(
            "Production requires Cors:AllowedOrigins with at least one origin. Set CORS__ALLOWEDORIGINS__0 (and further indices) to your deployed frontend origin(s), e.g. https://app.example.com");
    }

    foreach (var origin in origins)
    {
        if (string.IsNullOrWhiteSpace(origin) ||
            !Uri.TryCreate(origin.Trim(), UriKind.Absolute, out var uri) ||
            (uri.Scheme != Uri.UriSchemeHttp && uri.Scheme != Uri.UriSchemeHttps))
        {
            throw new InvalidOperationException(
                $"Cors:AllowedOrigins must contain only absolute http(s) URLs. Invalid entry: '{origin}'.");
        }

        if (uri.IsLoopback)
        {
            throw new InvalidOperationException(
                "Cors:AllowedOrigins cannot include loopback or localhost origins in Production. Remove development-only origins from deployment configuration.");
        }
    }
}

static void ConfigureForwardedHeaders(WebApplicationBuilder builder)
{
    builder.Services.Configure<ForwardedHeadersOptions>(options =>
    {
        options.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
        // Limits how many proxy hops are honored from X-Forwarded-* chains (reduces header spoofing).
        options.ForwardLimit = 1;
        var knownProxies = builder.Configuration.GetSection("ForwardedHeaders:KnownProxyIPs").Get<string[]>();
        if (knownProxies is { Length: > 0 })
        {
            options.KnownProxies.Clear();
            foreach (var ip in knownProxies)
            {
                if (IPAddress.TryParse(ip, out var address))
                {
                    options.KnownProxies.Add(address);
                }
            }
        }

        var knownNetworks = builder.Configuration.GetSection("ForwardedHeaders:KnownNetworks").Get<string[]>();
        if (knownNetworks is { Length: > 0 })
        {
            options.KnownIPNetworks.Clear();
            foreach (var cidr in knownNetworks)
            {
                if (System.Net.IPNetwork.TryParse(cidr, out var network))
                {
                    options.KnownIPNetworks.Add(network);
                }
            }
        }
    });
}

static string BuildContentSecurityPolicyImgSrc(IConfiguration configuration, IWebHostEnvironment environment)
{
    var configured = configuration.GetSection("Csp:ImgSrcAllowlist").Get<string[]>() ?? [];
    var parts = new List<string> { "'self'", "data:", "https://fonts.gstatic.com" };
    foreach (var entry in configured)
    {
        if (!string.IsNullOrWhiteSpace(entry))
        {
            parts.Add(entry.Trim());
        }
    }

    if (environment.IsDevelopment())
    {
        // Local testing may load images from arbitrary HTTPS origins (e.g. placeholder CDNs).
        parts.Add("https:");
    }

    return string.Join(' ', parts.Distinct(StringComparer.Ordinal));
}

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
