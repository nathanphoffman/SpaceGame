using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SpaceGame.Server.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddGameStartedAt : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "StartedAt",
                table: "games",
                type: "timestamp with time zone",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "StartedAt",
                table: "games");
        }
    }
}
