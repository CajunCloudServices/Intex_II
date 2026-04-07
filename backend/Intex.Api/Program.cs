using System.Text;
using Intex.Api;
using Intex.Api.Authorization;
using Intex.Api.Data;
using Intex.Api.Data.Seed;
using Intex.Api.Models.Options;
using Intex.Api.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;

var builder = WebApplication.CreateBuilder(args);

builder.Services.Configure<JwtOptions>(builder.Configuration.GetSection(JwtOptions.SectionName));
builder.Services.Configure<MlInferenceOptions>(builder.Configuration.GetSection(MlInferenceOptions.SectionName));

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
        options.Password.RequiredLength = 12;
        options.Password.RequireDigit = true;
        options.Password.RequireLowercase = true;
        options.Password.RequireUppercase = true;
        options.Password.RequireNonAlphanumeric = true;
        options.User.RequireUniqueEmail = true;
    })
    .AddRoles<IdentityRole<Guid>>()
    .AddEntityFrameworkStores<ApplicationDbContext>()
    .AddSignInManager()
    .AddDefaultTokenProviders();

var jwtOptions = builder.Configuration.GetSection(JwtOptions.SectionName).Get<JwtOptions>() ?? new JwtOptions();
var signingKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtOptions.Key));
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

builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.RequireHttpsMetadata = false;
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
        var configuredOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>();
        var validConfiguredOrigins = configuredOrigins?
            .Where(origin => Uri.TryCreate(origin, UriKind.Absolute, out var uri) &&
                (uri.Scheme == Uri.UriSchemeHttp || uri.Scheme == Uri.UriSchemeHttps) &&
                (uri.AbsolutePath == "/" || string.IsNullOrEmpty(uri.AbsolutePath)))
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
builder.Services.AddScoped<IReintegrationFeatureBuilder, ReintegrationFeatureBuilder>();
builder.Services.AddHttpClient<IMlInferenceClient, MlInferenceClient>((serviceProvider, client) =>
{
    var options = serviceProvider.GetRequiredService<IOptions<MlInferenceOptions>>().Value;
    client.BaseAddress = new Uri(options.BaseUrl);
    client.Timeout = TimeSpan.FromSeconds(Math.Max(1, options.TimeoutSeconds));
});
builder.Services.AddScoped<AppSeeder>();

var app = builder.Build();

app.UseForwardedHeaders(new ForwardedHeadersOptions
{
    ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto
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

    // This CSP is intentionally small for the local starter stack.
    // When the app gets deployed, replace these localhost allowances with the real production domains only.
    context.Response.Headers["Content-Security-Policy"] =
        "default-src 'self'; " +
        "script-src 'self'; " +
        "style-src 'self' 'unsafe-inline'; " +
        "img-src 'self' data: https:; " +
        "font-src 'self' data:; " +
        "connect-src 'self' http://localhost:4173 http://localhost:4174 http://localhost:5173 http://localhost:5080 http://localhost:5081 http://localhost:5082 http://localhost:8080 https://localhost:4173 https://localhost:4174 https://localhost:5173; " +
        "frame-ancestors 'none';";

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

    var seeder = scope.ServiceProvider.GetRequiredService<AppSeeder>();
    await seeder.SeedAsync();
}

app.Run();
