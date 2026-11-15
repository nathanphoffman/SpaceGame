using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SpaceGame.Server.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddGameSeed : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "Seed",
                table: "games",
                type: "integer",
                nullable: false,
                defaultValue: 0);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Seed",
                table: "games");
        }
    }
}
