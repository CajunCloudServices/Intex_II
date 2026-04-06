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

    public DbSet<Safehouse> Safehouses => Set<Safehouse>();
    public DbSet<Supporter> Supporters => Set<Supporter>();
    public DbSet<Donation> Donations => Set<Donation>();
    public DbSet<DonationAllocation> DonationAllocations => Set<DonationAllocation>();
    public DbSet<Resident> Residents => Set<Resident>();
    public DbSet<ProcessRecording> ProcessRecordings => Set<ProcessRecording>();
    public DbSet<HomeVisitation> HomeVisitations => Set<HomeVisitation>();
    public DbSet<InterventionPlan> InterventionPlans => Set<InterventionPlan>();
    public DbSet<IncidentReport> IncidentReports => Set<IncidentReport>();
    public DbSet<SocialMediaPost> SocialMediaPosts => Set<SocialMediaPost>();
    public DbSet<PublicImpactSnapshot> PublicImpactSnapshots => Set<PublicImpactSnapshot>();

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);

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
    }
}
