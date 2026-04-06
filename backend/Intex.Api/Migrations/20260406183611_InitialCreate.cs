using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace Intex.Api.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "AspNetRoles",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: true),
                    NormalizedName = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: true),
                    ConcurrencyStamp = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AspNetRoles", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "AspNetUsers",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    FullName = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    SupporterId = table.Column<int>(type: "integer", nullable: true),
                    UserName = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: true),
                    NormalizedUserName = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: true),
                    Email = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: true),
                    NormalizedEmail = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: true),
                    EmailConfirmed = table.Column<bool>(type: "boolean", nullable: false),
                    PasswordHash = table.Column<string>(type: "text", nullable: true),
                    SecurityStamp = table.Column<string>(type: "text", nullable: true),
                    ConcurrencyStamp = table.Column<string>(type: "text", nullable: true),
                    PhoneNumber = table.Column<string>(type: "text", nullable: true),
                    PhoneNumberConfirmed = table.Column<bool>(type: "boolean", nullable: false),
                    TwoFactorEnabled = table.Column<bool>(type: "boolean", nullable: false),
                    LockoutEnd = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    LockoutEnabled = table.Column<bool>(type: "boolean", nullable: false),
                    AccessFailedCount = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AspNetUsers", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "PublicImpactSnapshots",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    SnapshotDate = table.Column<DateOnly>(type: "date", nullable: false),
                    Headline = table.Column<string>(type: "text", nullable: false),
                    SummaryText = table.Column<string>(type: "text", nullable: false),
                    MetricPayloadJson = table.Column<string>(type: "text", nullable: false),
                    IsPublished = table.Column<bool>(type: "boolean", nullable: false),
                    PublishedAt = table.Column<DateOnly>(type: "date", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PublicImpactSnapshots", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Safehouses",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Code = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    Name = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: false),
                    Region = table.Column<string>(type: "text", nullable: false),
                    City = table.Column<string>(type: "text", nullable: false),
                    Province = table.Column<string>(type: "text", nullable: false),
                    Country = table.Column<string>(type: "text", nullable: false),
                    OpenDate = table.Column<DateOnly>(type: "date", nullable: false),
                    Status = table.Column<string>(type: "text", nullable: false),
                    CapacityGirls = table.Column<int>(type: "integer", nullable: false),
                    CapacityStaff = table.Column<int>(type: "integer", nullable: false),
                    CurrentOccupancy = table.Column<int>(type: "integer", nullable: false),
                    Notes = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Safehouses", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "SocialMediaPosts",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Platform = table.Column<string>(type: "text", nullable: false),
                    PlatformPostId = table.Column<string>(type: "text", nullable: false),
                    PostUrl = table.Column<string>(type: "text", nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    PostType = table.Column<string>(type: "text", nullable: false),
                    MediaType = table.Column<string>(type: "text", nullable: false),
                    Caption = table.Column<string>(type: "text", nullable: false),
                    Hashtags = table.Column<string>(type: "text", nullable: true),
                    HasCallToAction = table.Column<bool>(type: "boolean", nullable: false),
                    CallToActionType = table.Column<string>(type: "text", nullable: true),
                    ContentTopic = table.Column<string>(type: "text", nullable: false),
                    SentimentTone = table.Column<string>(type: "text", nullable: false),
                    FeaturesResidentStory = table.Column<bool>(type: "boolean", nullable: false),
                    CampaignName = table.Column<string>(type: "text", nullable: true),
                    IsBoosted = table.Column<bool>(type: "boolean", nullable: false),
                    BoostBudgetPhp = table.Column<decimal>(type: "numeric(12,2)", precision: 12, scale: 2, nullable: true),
                    Impressions = table.Column<int>(type: "integer", nullable: false),
                    Reach = table.Column<int>(type: "integer", nullable: false),
                    Likes = table.Column<int>(type: "integer", nullable: false),
                    Comments = table.Column<int>(type: "integer", nullable: false),
                    Shares = table.Column<int>(type: "integer", nullable: false),
                    ClickThroughs = table.Column<int>(type: "integer", nullable: false),
                    EngagementRate = table.Column<decimal>(type: "numeric(5,4)", precision: 5, scale: 4, nullable: false),
                    DonationReferrals = table.Column<int>(type: "integer", nullable: false),
                    EstimatedDonationValuePhp = table.Column<decimal>(type: "numeric(12,2)", precision: 12, scale: 2, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SocialMediaPosts", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Supporters",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    SupporterType = table.Column<string>(type: "text", nullable: false),
                    DisplayName = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: false),
                    OrganizationName = table.Column<string>(type: "text", nullable: true),
                    FirstName = table.Column<string>(type: "text", nullable: true),
                    LastName = table.Column<string>(type: "text", nullable: true),
                    RelationshipType = table.Column<string>(type: "text", nullable: false),
                    Region = table.Column<string>(type: "text", nullable: false),
                    Country = table.Column<string>(type: "text", nullable: false),
                    Email = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Phone = table.Column<string>(type: "text", nullable: true),
                    Status = table.Column<string>(type: "text", nullable: false),
                    FirstDonationDate = table.Column<DateOnly>(type: "date", nullable: true),
                    AcquisitionChannel = table.Column<string>(type: "text", nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Supporters", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "AspNetRoleClaims",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    RoleId = table.Column<Guid>(type: "uuid", nullable: false),
                    ClaimType = table.Column<string>(type: "text", nullable: true),
                    ClaimValue = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AspNetRoleClaims", x => x.Id);
                    table.ForeignKey(
                        name: "FK_AspNetRoleClaims_AspNetRoles_RoleId",
                        column: x => x.RoleId,
                        principalTable: "AspNetRoles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "AspNetUserClaims",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    ClaimType = table.Column<string>(type: "text", nullable: true),
                    ClaimValue = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AspNetUserClaims", x => x.Id);
                    table.ForeignKey(
                        name: "FK_AspNetUserClaims_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "AspNetUserLogins",
                columns: table => new
                {
                    LoginProvider = table.Column<string>(type: "text", nullable: false),
                    ProviderKey = table.Column<string>(type: "text", nullable: false),
                    ProviderDisplayName = table.Column<string>(type: "text", nullable: true),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AspNetUserLogins", x => new { x.LoginProvider, x.ProviderKey });
                    table.ForeignKey(
                        name: "FK_AspNetUserLogins_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "AspNetUserRoles",
                columns: table => new
                {
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    RoleId = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AspNetUserRoles", x => new { x.UserId, x.RoleId });
                    table.ForeignKey(
                        name: "FK_AspNetUserRoles_AspNetRoles_RoleId",
                        column: x => x.RoleId,
                        principalTable: "AspNetRoles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_AspNetUserRoles_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "AspNetUserTokens",
                columns: table => new
                {
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    LoginProvider = table.Column<string>(type: "text", nullable: false),
                    Name = table.Column<string>(type: "text", nullable: false),
                    Value = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AspNetUserTokens", x => new { x.UserId, x.LoginProvider, x.Name });
                    table.ForeignKey(
                        name: "FK_AspNetUserTokens_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Residents",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    CaseControlNumber = table.Column<string>(type: "text", nullable: false),
                    InternalCode = table.Column<string>(type: "text", nullable: false),
                    SafehouseId = table.Column<int>(type: "integer", nullable: false),
                    CaseStatus = table.Column<string>(type: "text", nullable: false),
                    DateOfBirth = table.Column<DateOnly>(type: "date", nullable: false),
                    PlaceOfBirth = table.Column<string>(type: "text", nullable: false),
                    Religion = table.Column<string>(type: "text", nullable: false),
                    CaseCategory = table.Column<string>(type: "text", nullable: false),
                    IsTrafficked = table.Column<bool>(type: "boolean", nullable: false),
                    IsPhysicalAbuseCase = table.Column<bool>(type: "boolean", nullable: false),
                    IsSexualAbuseCase = table.Column<bool>(type: "boolean", nullable: false),
                    HasSpecialNeeds = table.Column<bool>(type: "boolean", nullable: false),
                    SpecialNeedsDiagnosis = table.Column<string>(type: "text", nullable: true),
                    FamilyIs4Ps = table.Column<bool>(type: "boolean", nullable: false),
                    FamilySoloParent = table.Column<bool>(type: "boolean", nullable: false),
                    FamilyIndigenous = table.Column<bool>(type: "boolean", nullable: false),
                    FamilyInformalSettler = table.Column<bool>(type: "boolean", nullable: false),
                    DateOfAdmission = table.Column<DateOnly>(type: "date", nullable: false),
                    ReferralSource = table.Column<string>(type: "text", nullable: false),
                    ReferringAgencyPerson = table.Column<string>(type: "text", nullable: true),
                    AssignedSocialWorker = table.Column<string>(type: "text", nullable: false),
                    InitialCaseAssessment = table.Column<string>(type: "text", nullable: false),
                    ReintegrationType = table.Column<string>(type: "text", nullable: true),
                    ReintegrationStatus = table.Column<string>(type: "text", nullable: true),
                    InitialRiskLevel = table.Column<string>(type: "text", nullable: false),
                    CurrentRiskLevel = table.Column<string>(type: "text", nullable: false),
                    DateClosed = table.Column<DateOnly>(type: "date", nullable: true),
                    CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    RestrictedNotes = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Residents", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Residents_Safehouses_SafehouseId",
                        column: x => x.SafehouseId,
                        principalTable: "Safehouses",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "Donations",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    SupporterId = table.Column<int>(type: "integer", nullable: false),
                    DonationType = table.Column<string>(type: "text", nullable: false),
                    DonationDate = table.Column<DateOnly>(type: "date", nullable: false),
                    ChannelSource = table.Column<string>(type: "text", nullable: false),
                    CurrencyCode = table.Column<string>(type: "text", nullable: true),
                    Amount = table.Column<decimal>(type: "numeric(12,2)", precision: 12, scale: 2, nullable: true),
                    EstimatedValue = table.Column<decimal>(type: "numeric(12,2)", precision: 12, scale: 2, nullable: false),
                    ImpactUnit = table.Column<string>(type: "text", nullable: false),
                    IsRecurring = table.Column<bool>(type: "boolean", nullable: false),
                    CampaignName = table.Column<string>(type: "text", nullable: true),
                    Notes = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Donations", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Donations_Supporters_SupporterId",
                        column: x => x.SupporterId,
                        principalTable: "Supporters",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "HomeVisitations",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    ResidentId = table.Column<int>(type: "integer", nullable: false),
                    VisitDate = table.Column<DateOnly>(type: "date", nullable: false),
                    SocialWorker = table.Column<string>(type: "text", nullable: false),
                    VisitType = table.Column<string>(type: "text", nullable: false),
                    LocationVisited = table.Column<string>(type: "text", nullable: false),
                    FamilyMembersPresent = table.Column<string>(type: "text", nullable: false),
                    Purpose = table.Column<string>(type: "text", nullable: false),
                    Observations = table.Column<string>(type: "text", nullable: false),
                    FamilyCooperationLevel = table.Column<string>(type: "text", nullable: false),
                    SafetyConcernsNoted = table.Column<bool>(type: "boolean", nullable: false),
                    FollowUpNeeded = table.Column<bool>(type: "boolean", nullable: false),
                    FollowUpNotes = table.Column<string>(type: "text", nullable: true),
                    VisitOutcome = table.Column<string>(type: "text", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_HomeVisitations", x => x.Id);
                    table.ForeignKey(
                        name: "FK_HomeVisitations_Residents_ResidentId",
                        column: x => x.ResidentId,
                        principalTable: "Residents",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "IncidentReports",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    ResidentId = table.Column<int>(type: "integer", nullable: false),
                    SafehouseId = table.Column<int>(type: "integer", nullable: false),
                    IncidentDate = table.Column<DateOnly>(type: "date", nullable: false),
                    IncidentType = table.Column<string>(type: "text", nullable: false),
                    Severity = table.Column<string>(type: "text", nullable: false),
                    Description = table.Column<string>(type: "text", nullable: false),
                    ResponseTaken = table.Column<string>(type: "text", nullable: false),
                    Resolved = table.Column<bool>(type: "boolean", nullable: false),
                    ResolutionDate = table.Column<DateOnly>(type: "date", nullable: true),
                    ReportedBy = table.Column<string>(type: "text", nullable: false),
                    FollowUpRequired = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_IncidentReports", x => x.Id);
                    table.ForeignKey(
                        name: "FK_IncidentReports_Residents_ResidentId",
                        column: x => x.ResidentId,
                        principalTable: "Residents",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_IncidentReports_Safehouses_SafehouseId",
                        column: x => x.SafehouseId,
                        principalTable: "Safehouses",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "InterventionPlans",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    ResidentId = table.Column<int>(type: "integer", nullable: false),
                    PlanCategory = table.Column<string>(type: "text", nullable: false),
                    PlanDescription = table.Column<string>(type: "text", nullable: false),
                    ServicesProvided = table.Column<string>(type: "text", nullable: false),
                    TargetValue = table.Column<decimal>(type: "numeric(8,2)", precision: 8, scale: 2, nullable: true),
                    TargetDate = table.Column<DateOnly>(type: "date", nullable: false),
                    Status = table.Column<string>(type: "text", nullable: false),
                    CaseConferenceDate = table.Column<DateOnly>(type: "date", nullable: true),
                    CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_InterventionPlans", x => x.Id);
                    table.ForeignKey(
                        name: "FK_InterventionPlans_Residents_ResidentId",
                        column: x => x.ResidentId,
                        principalTable: "Residents",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ProcessRecordings",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    ResidentId = table.Column<int>(type: "integer", nullable: false),
                    SessionDate = table.Column<DateOnly>(type: "date", nullable: false),
                    SocialWorker = table.Column<string>(type: "text", nullable: false),
                    SessionType = table.Column<string>(type: "text", nullable: false),
                    SessionDurationMinutes = table.Column<int>(type: "integer", nullable: false),
                    EmotionalStateObserved = table.Column<string>(type: "text", nullable: false),
                    EmotionalStateEnd = table.Column<string>(type: "text", nullable: false),
                    SessionNarrative = table.Column<string>(type: "text", nullable: false),
                    InterventionsApplied = table.Column<string>(type: "text", nullable: false),
                    FollowUpActions = table.Column<string>(type: "text", nullable: false),
                    ProgressNoted = table.Column<bool>(type: "boolean", nullable: false),
                    ConcernsFlagged = table.Column<bool>(type: "boolean", nullable: false),
                    ReferralMade = table.Column<bool>(type: "boolean", nullable: false),
                    RestrictedNotes = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ProcessRecordings", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ProcessRecordings_Residents_ResidentId",
                        column: x => x.ResidentId,
                        principalTable: "Residents",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "DonationAllocations",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    DonationId = table.Column<int>(type: "integer", nullable: false),
                    SafehouseId = table.Column<int>(type: "integer", nullable: false),
                    ProgramArea = table.Column<string>(type: "text", nullable: false),
                    AmountAllocated = table.Column<decimal>(type: "numeric(12,2)", precision: 12, scale: 2, nullable: false),
                    AllocationDate = table.Column<DateOnly>(type: "date", nullable: false),
                    AllocationNotes = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DonationAllocations", x => x.Id);
                    table.ForeignKey(
                        name: "FK_DonationAllocations_Donations_DonationId",
                        column: x => x.DonationId,
                        principalTable: "Donations",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_DonationAllocations_Safehouses_SafehouseId",
                        column: x => x.SafehouseId,
                        principalTable: "Safehouses",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_AspNetRoleClaims_RoleId",
                table: "AspNetRoleClaims",
                column: "RoleId");

            migrationBuilder.CreateIndex(
                name: "RoleNameIndex",
                table: "AspNetRoles",
                column: "NormalizedName",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_AspNetUserClaims_UserId",
                table: "AspNetUserClaims",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_AspNetUserLogins_UserId",
                table: "AspNetUserLogins",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_AspNetUserRoles_RoleId",
                table: "AspNetUserRoles",
                column: "RoleId");

            migrationBuilder.CreateIndex(
                name: "EmailIndex",
                table: "AspNetUsers",
                column: "NormalizedEmail");

            migrationBuilder.CreateIndex(
                name: "UserNameIndex",
                table: "AspNetUsers",
                column: "NormalizedUserName",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_DonationAllocations_DonationId",
                table: "DonationAllocations",
                column: "DonationId");

            migrationBuilder.CreateIndex(
                name: "IX_DonationAllocations_SafehouseId",
                table: "DonationAllocations",
                column: "SafehouseId");

            migrationBuilder.CreateIndex(
                name: "IX_Donations_SupporterId",
                table: "Donations",
                column: "SupporterId");

            migrationBuilder.CreateIndex(
                name: "IX_HomeVisitations_ResidentId",
                table: "HomeVisitations",
                column: "ResidentId");

            migrationBuilder.CreateIndex(
                name: "IX_IncidentReports_ResidentId",
                table: "IncidentReports",
                column: "ResidentId");

            migrationBuilder.CreateIndex(
                name: "IX_IncidentReports_SafehouseId",
                table: "IncidentReports",
                column: "SafehouseId");

            migrationBuilder.CreateIndex(
                name: "IX_InterventionPlans_ResidentId",
                table: "InterventionPlans",
                column: "ResidentId");

            migrationBuilder.CreateIndex(
                name: "IX_ProcessRecordings_ResidentId",
                table: "ProcessRecordings",
                column: "ResidentId");

            migrationBuilder.CreateIndex(
                name: "IX_Residents_SafehouseId",
                table: "Residents",
                column: "SafehouseId");

            migrationBuilder.CreateIndex(
                name: "IX_Safehouses_Code",
                table: "Safehouses",
                column: "Code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Supporters_Email",
                table: "Supporters",
                column: "Email");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "AspNetRoleClaims");

            migrationBuilder.DropTable(
                name: "AspNetUserClaims");

            migrationBuilder.DropTable(
                name: "AspNetUserLogins");

            migrationBuilder.DropTable(
                name: "AspNetUserRoles");

            migrationBuilder.DropTable(
                name: "AspNetUserTokens");

            migrationBuilder.DropTable(
                name: "DonationAllocations");

            migrationBuilder.DropTable(
                name: "HomeVisitations");

            migrationBuilder.DropTable(
                name: "IncidentReports");

            migrationBuilder.DropTable(
                name: "InterventionPlans");

            migrationBuilder.DropTable(
                name: "ProcessRecordings");

            migrationBuilder.DropTable(
                name: "PublicImpactSnapshots");

            migrationBuilder.DropTable(
                name: "SocialMediaPosts");

            migrationBuilder.DropTable(
                name: "AspNetRoles");

            migrationBuilder.DropTable(
                name: "AspNetUsers");

            migrationBuilder.DropTable(
                name: "Donations");

            migrationBuilder.DropTable(
                name: "Residents");

            migrationBuilder.DropTable(
                name: "Supporters");

            migrationBuilder.DropTable(
                name: "Safehouses");
        }
    }
}
