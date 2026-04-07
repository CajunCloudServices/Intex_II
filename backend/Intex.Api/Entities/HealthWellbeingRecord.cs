namespace Intex.Api.Entities;

public class HealthWellbeingRecord
{
    public int Id { get; set; }
    public int ResidentId { get; set; }
    public DateOnly RecordDate { get; set; }
    public decimal GeneralHealthScore { get; set; }
    public decimal NutritionScore { get; set; }
    public decimal SleepQualityScore { get; set; }
    public decimal EnergyLevelScore { get; set; }
    public decimal? HeightCm { get; set; }
    public decimal? WeightKg { get; set; }
    public decimal? Bmi { get; set; }
    public bool MedicalCheckupDone { get; set; }
    public bool DentalCheckupDone { get; set; }
    public bool PsychologicalCheckupDone { get; set; }
    public string? Notes { get; set; }

    public Resident? Resident { get; set; }
}
