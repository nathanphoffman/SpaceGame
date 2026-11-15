import { CreateGameForm, JoinGameForm } from "@/components/home/HomeForms";

type Props = { searchParams: Promise<{ code?: string }> };

export default async function HomePage({ searchParams }: Props) {
	const { code } = await searchParams;

	return (
		<main style={{ maxWidth: 480, margin: "0 auto", padding: 16 }}>
			<h1>Space Game</h1>
			<CreateGameForm />
			<JoinGameForm defaultCode={code} />
		</main>
	);
}
