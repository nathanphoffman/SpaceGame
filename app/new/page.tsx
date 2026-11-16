import { redirect } from "next/navigation";

type Props = { searchParams: Promise<{ code?: string }> };

export default async function NewRedirectPage({ searchParams }: Props) {
	const { code } = await searchParams;
	redirect(code ? `/?code=${encodeURIComponent(code)}` : "/");
}
