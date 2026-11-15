import { z } from "zod";
import { useGetReport, useListReports } from "./generated/api";

// The generated schemas type ids as objects (see Requests in CONTRACTS.md), so parse the real wire format here.
export const battleReportSchema = z.object({
	id: z.string(),
	time: z.coerce.number(),
	planet: z.string(),
	attackersWon: z.boolean(),
	rounds: z.coerce.number(),
});

export type BattleReportDto = z.infer<typeof battleReportSchema>;

const parseList = (body: unknown): BattleReportDto[] => z.array(battleReportSchema).parse(body);

const parseOne = (body: unknown): BattleReportDto => battleReportSchema.parse(body);

export const useReports = (gameId: string) => useListReports(gameId, { query: { select: parseList } });

export const useReport = (gameId: string, reportId: string) => useGetReport(gameId, reportId, { query: { select: parseOne } });

export function reportOutcome(report: BattleReportDto): string {
	return report.attackersWon ? "Attackers won" : "Defenders held";
}
