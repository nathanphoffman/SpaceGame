import { CreateGameForm, JoinGameForm } from "@/components/home/HomeForms";

export default function NewHomePage() {
	return (
		<main style={{ maxWidth: 480, margin: "0 auto", padding: 16 }}>
			<h1>Space Game</h1>
			<CreateGameForm />
			<JoinGameForm />
		</main>
	);
}
