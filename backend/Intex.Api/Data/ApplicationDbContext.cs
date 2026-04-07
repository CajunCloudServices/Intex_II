using Intex.Api.Entities;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

namespace Intex.Api.Data;

public class ApplicationDbContext : IdentityDbContext<ApplicationUser, IdentityRole<Guid>, Guid>
{
    public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options) : base(options)
    {
    }

    // These DbSets define the main slices of the nonprofit domain. The frontend pages map
    // closely to these groups, which keeps it easier for a student team to find the data
    // source behind each screen.
    public DbSet<Safehouse> Safehouses => Set<Safehouse>();
    public DbSet<Supporter> Supporters => Set<Supporter>();
    public DbSet<Donation> Donations => Set<Donation>();
    public DbSet<DonationAllocation> DonationAllocations => Set<DonationAllocation>();
    public DbSet<Resident> Residents => Set<Resident>();
    public DbSet<ProcessRecording> ProcessRecordings => Set<ProcessRecording>();
    public DbSet<HomeVisitation> HomeVisitations => Set<HomeVisitation>();
    public DbSet<CaseConference> CaseConferences => Set<CaseConference>();
    public DbSet<InterventionPlan> InterventionPlans => Set<InterventionPlan>();
    public DbSet<IncidentReport> IncidentReports => Set<IncidentReport>();
    public DbSet<AuditLog> AuditLogs => Set<AuditLog>();
    public DbSet<SocialMediaPost> SocialMediaPosts => Set<SocialMediaPost>();
    public DbSet<PublicImpactSnapshot> PublicImpactSnapshots => Set<PublicImpactSnapshot>();
    public DbSet<Partner> Partners => Set<Partner>();
    public DbSet<PartnerAssignment> PartnerAssignments => Set<PartnerAssignment>();
    public DbSet<EducationRecord> EducationRecords => Set<EducationRecord>();
    public DbSet<HealthWellbeingRecord> HealthWellbeingRecords => Set<HealthWellbeingRecord>();
    public DbSet<SafehouseMonthlyMetric> SafehouseMonthlyMetrics => Set<SafehouseMonthlyMetric>();
    public DbSet<InKindDonationItem> InKindDonationItems => Set<InKindDonationItem>();

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);

        // Most of the extra configuration below falls into two categories:
        // 1. column constraints/precision so the schema is predictable
        // 2. delete behavior so the API does not accidentally cascade through major records
        //    like supporters or safehouses when one related row is removed
        builder.Entity<ApplicationUser>(entity =>
        {
            entity.Property(x => x.FullName).HasMaxLength(200);
        });

        builder.Entity<Safehouse>(entity =>
        {
            entity.Property(x => x.Code).HasMaxLength(20);
            entity.Property(x => x.Name).HasMaxLength(150);
            entity.HasIndex(x => x.Code).IsUnique();
        });

        builder.Entity<Supporter>(entity =>
        {
            entity.Property(x => x.DisplayName).HasMaxLength(150);
            entity.Property(x => x.Email).HasMaxLength(200);
            entity.HasIndex(x => x.Email);
        });

        builder.Entity<Donation>(entity =>
        {
            entity.Property(x => x.Amount).HasPrecision(12, 2);
            entity.Property(x => x.EstimatedValue).HasPrecision(12, 2);
        });

        builder.Entity<DonationAllocation>(entity =>
        {
            entity.Property(x => x.AmountAllocated).HasPrecision(12, 2);
        });

        builder.Entity<InterventionPlan>(entity =>
        {
            entity.Property(x => x.TargetValue).HasPrecision(8, 2);
        });

        builder.Entity<EducationRecord>(entity =>
        {
            entity.Property(x => x.AttendanceRate).HasPrecision(5, 2);
            entity.Property(x => x.ProgressPercent).HasPrecision(5, 2);
        });

        builder.Entity<HealthWellbeingRecord>(entity =>
        {
            entity.Property(x => x.GeneralHealthScore).HasPrecision(5, 2);
            entity.Property(x => x.NutritionScore).HasPrecision(5, 2);
            entity.Property(x => x.SleepQualityScore).HasPrecision(5, 2);
            entity.Property(x => x.EnergyLevelScore).HasPrecision(5, 2);
            entity.Property(x => x.HeightCm).HasPrecision(6, 2);
            entity.Property(x => x.WeightKg).HasPrecision(6, 2);
            entity.Property(x => x.Bmi).HasPrecision(5, 2);
        });

        builder.Entity<SafehouseMonthlyMetric>(entity =>
        {
            entity.Property(x => x.AvgEducationProgress).HasPrecision(5, 2);
            entity.Property(x => x.AvgHealthScore).HasPrecision(5, 2);
        });

        builder.Entity<InKindDonationItem>(entity =>
        {
            entity.Property(x => x.Quantity).HasPrecision(12, 2);
            entity.Property(x => x.EstimatedUnitValue).HasPrecision(12, 2);
        });

        builder.Entity<CaseConference>(entity =>
        {
            entity.Property(x => x.LeadWorker).HasMaxLength(120);
            entity.Property(x => x.Status).HasMaxLength(40);
        });

        builder.Entity<AuditLog>(entity =>
        {
            entity.Property(x => x.ActionType).HasMaxLength(20);
            entity.Property(x => x.EntityType).HasMaxLength(40);
            entity.Property(x => x.ActorUserId).HasMaxLength(100);
            entity.Property(x => x.ActorEmail).HasMaxLength(200);
            entity.Property(x => x.Summary).HasMaxLength(1000);
            entity.HasIndex(x => x.CreatedAtUtc);
            entity.HasIndex(x => new { x.EntityType, x.EntityId });
        });

        builder.Entity<SocialMediaPost>(entity =>
        {
            entity.Property(x => x.BoostBudgetPhp).HasPrecision(12, 2);
            entity.Property(x => x.EngagementRate).HasPrecision(5, 4);
            entity.Property(x => x.EstimatedDonationValuePhp).HasPrecision(12, 2);
        });

        builder.Entity<Donation>()
            .HasOne(x => x.Supporter)
            .WithMany(x => x.Donations)
            .HasForeignKey(x => x.SupporterId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.Entity<DonationAllocation>()
            .HasOne(x => x.Donation)
            .WithMany(x => x.Allocations)
            .HasForeignKey(x => x.DonationId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.Entity<DonationAllocation>()
            .HasOne(x => x.Safehouse)
            .WithMany(x => x.DonationAllocations)
            .HasForeignKey(x => x.SafehouseId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.Entity<Resident>()
            .HasOne(x => x.Safehouse)
            .WithMany(x => x.Residents)
            .HasForeignKey(x => x.SafehouseId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.Entity<ProcessRecording>()
            .HasOne(x => x.Resident)
            .WithMany(x => x.ProcessRecordings)
            .HasForeignKey(x => x.ResidentId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.Entity<HomeVisitation>()
            .HasOne(x => x.Resident)
            .WithMany(x => x.HomeVisitations)
            .HasForeignKey(x => x.ResidentId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.Entity<CaseConference>()
            .HasOne(x => x.Resident)
            .WithMany(x => x.CaseConferences)
            .HasForeignKey(x => x.ResidentId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.Entity<InterventionPlan>()
            .HasOne(x => x.Resident)
            .WithMany(x => x.InterventionPlans)
            .HasForeignKey(x => x.ResidentId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.Entity<IncidentReport>()
            .HasOne(x => x.Resident)
            .WithMany(x => x.IncidentReports)
            .HasForeignKey(x => x.ResidentId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.Entity<IncidentReport>()
            .HasOne(x => x.Safehouse)
            .WithMany(x => x.IncidentReports)
            .HasForeignKey(x => x.SafehouseId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.Entity<PartnerAssignment>()
            .HasOne(x => x.Partner)
            .WithMany(x => x.Assignments)
            .HasForeignKey(x => x.PartnerId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.Entity<PartnerAssignment>()
            .HasOne(x => x.Safehouse)
            .WithMany(x => x.PartnerAssignments)
            .HasForeignKey(x => x.SafehouseId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.Entity<EducationRecord>()
            .HasOne(x => x.Resident)
            .WithMany(x => x.EducationRecords)
            .HasForeignKey(x => x.ResidentId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.Entity<HealthWellbeingRecord>()
            .HasOne(x => x.Resident)
            .WithMany(x => x.HealthWellbeingRecords)
            .HasForeignKey(x => x.ResidentId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.Entity<SafehouseMonthlyMetric>()
            .HasOne(x => x.Safehouse)
            .WithMany(x => x.MonthlyMetrics)
            .HasForeignKey(x => x.SafehouseId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.Entity<InKindDonationItem>()
            .HasOne(x => x.Donation)
            .WithMany(x => x.InKindItems)
            .HasForeignKey(x => x.DonationId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
