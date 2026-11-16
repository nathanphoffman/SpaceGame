import { useGetReport, useListReports } from "./generated/api";
import { battleReportSchema, type BattleReportDto } from "./adapters/schemas";

export { battleReportSchema, type BattleReportDto };

const parseList = (body: unknown): BattleReportDto[] => battleReportSchema.array().parse(body);

const parseOne = (body: unknown): BattleReportDto => battleReportSchema.parse(body);

export const useReports = (gameId: string) => useListReports(gameId, { query: { select: parseList } });

export const useReport = (gameId: string, reportId: string) => useGetReport(gameId, reportId, { query: { select: parseOne } });

export function reportOutcome(report: BattleReportDto): string {
	return report.attackersWon ? "Attackers won" : "Defenders held";
}
