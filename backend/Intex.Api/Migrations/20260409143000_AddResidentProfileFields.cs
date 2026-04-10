using System;
using Intex.Api.Data;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Intex.Api.Migrations
{
    /// <inheritdoc />
    [DbContext(typeof(ApplicationDbContext))]
    [Migration("20260409143000_AddResidentProfileFields")]
    public partial class AddResidentProfileFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "BirthStatus",
                table: "Residents",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<DateOnly>(
                name: "DateCaseStudyPrepared",
                table: "Residents",
                type: "date",
                nullable: true);

            migrationBuilder.AddColumn<DateOnly>(
                name: "DateColbObtained",
                table: "Residents",
                type: "date",
                nullable: true);

            migrationBuilder.AddColumn<DateOnly>(
                name: "DateColbRegistered",
                table: "Residents",
                type: "date",
                nullable: true);

            migrationBuilder.AddColumn<DateOnly>(
                name: "DateEnrolled",
                table: "Residents",
                type: "date",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "FamilyParentPwd",
                table: "Residents",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "IsPwd",
                table: "Residents",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "PwdType",
                table: "Residents",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Sex",
                table: "Residents",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<bool>(
                name: "SubCatAtRisk",
                table: "Residents",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "SubCatChildLabor",
                table: "Residents",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "SubCatChildWithHiv",
                table: "Residents",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "SubCatCicl",
                table: "Residents",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "SubCatOrphaned",
                table: "Residents",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "SubCatOsaec",
                table: "Residents",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "SubCatStreetChild",
                table: "Residents",
                type: "boolean",
                nullable: false,
                defaultValue: false);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(name: "BirthStatus", table: "Residents");
            migrationBuilder.DropColumn(name: "DateCaseStudyPrepared", table: "Residents");
            migrationBuilder.DropColumn(name: "DateColbObtained", table: "Residents");
            migrationBuilder.DropColumn(name: "DateColbRegistered", table: "Residents");
            migrationBuilder.DropColumn(name: "DateEnrolled", table: "Residents");
            migrationBuilder.DropColumn(name: "FamilyParentPwd", table: "Residents");
            migrationBuilder.DropColumn(name: "IsPwd", table: "Residents");
            migrationBuilder.DropColumn(name: "PwdType", table: "Residents");
            migrationBuilder.DropColumn(name: "Sex", table: "Residents");
            migrationBuilder.DropColumn(name: "SubCatAtRisk", table: "Residents");
            migrationBuilder.DropColumn(name: "SubCatChildLabor", table: "Residents");
            migrationBuilder.DropColumn(name: "SubCatChildWithHiv", table: "Residents");
            migrationBuilder.DropColumn(name: "SubCatCicl", table: "Residents");
            migrationBuilder.DropColumn(name: "SubCatOrphaned", table: "Residents");
            migrationBuilder.DropColumn(name: "SubCatOsaec", table: "Residents");
            migrationBuilder.DropColumn(name: "SubCatStreetChild", table: "Residents");
        }
    }
}
