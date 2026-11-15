"use client";

import { friendlyError } from "@/lib/api/errors";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import type { z } from "zod";
import {
	createGame,
	createGameSchema,
	fieldErrors,
	GAME_MODES,
	joinGame,
	joinGameSchema,
	lobbyPath,
} from "@/lib/api/gameForms";

type Errors = Record<string, string>;

const MODE_LABELS = { week: "One week", test: "1-hour test" } as const;

function Field(props: { label: string; name: string; error?: string; placeholder?: string; defaultValue?: string }) {
	return (
		<label style={{ display: "block", marginBottom: 8 }}>
			{props.label}
			<input name={props.name} placeholder={props.placeholder} defaultValue={props.defaultValue} style={{ display: "block", width: "100%" }} />
			{props.error && <span role="alert">{props.error}</span>}
		</label>
	);
}

/** Validates the form with a schema, then runs the action; shows field errors or the API error. */
function useSchemaForm<T>(schema: z.ZodType<T>, action: (input: T) => Promise<string>) {
	const router = useRouter();
	const [errors, setErrors] = useState<Errors>({});
	const mutation = useMutation({
		mutationFn: action,
		onSuccess: (gameId) => router.push(lobbyPath(gameId)),
	});

	const submit = (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		const parsed = schema.safeParse(Object.fromEntries(new FormData(event.currentTarget)));
		setErrors(parsed.success ? {} : fieldErrors(parsed.error));

		if (parsed.success) mutation.mutate(parsed.data);
	};

	return { errors, submit, apiError: mutation.error ? friendlyError(mutation.error) : undefined, pending: mutation.isPending };
}

export function CreateGameForm() {
	const form = useSchemaForm(createGameSchema, createGame);

	return (
		<form onSubmit={form.submit} aria-label="Create a game">
			<h2>Create a game</h2>
			<Field label="Your name" name="name" error={form.errors.name} />
			<label style={{ display: "block", marginBottom: 8 }}>
				Mode
				<select name="mode" defaultValue="week">
					{GAME_MODES.map((mode) => (
						<option key={mode} value={mode}>
							{MODE_LABELS[mode]}
						</option>
					))}

				</select>
			</label>
			<Field
				label="Discord webhook (optional)"
				name="discordWebhookUrl"
				error={form.errors.discordWebhookUrl}
			/>
			<button type="submit" disabled={form.pending}>Create</button>
			{form.apiError && <p role="alert">{form.apiError}</p>}
		</form>
	);
}

/** `defaultCode` comes from the `?code=` in the invite link. */
export function JoinGameForm({ defaultCode }: { defaultCode?: string }) {
	const form = useSchemaForm(joinGameSchema, joinGame);

	return (
		<form onSubmit={form.submit} aria-label="Join a game">
			<h2>Join a game</h2>
			<Field label="Game code" name="code" error={form.errors.code} defaultValue={defaultCode} />
			<Field label="Your name" name="playerName" error={form.errors.playerName} />
			<button type="submit" disabled={form.pending}>Join</button>
			{form.apiError && <p role="alert">{form.apiError}</p>}
		</form>
	);
}
