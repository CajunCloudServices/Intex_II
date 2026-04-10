using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Intex.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddSafetyConcernDetails : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "SafetyConcernDetails",
                table: "HomeVisitations",
                type: "text",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "SafetyConcernDetails",
                table: "HomeVisitations");
        }
    }
}
