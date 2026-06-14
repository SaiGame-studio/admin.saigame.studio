import { redirect } from "next/navigation";
export default function LegacyPlayerDetailPage({ params, }: {
    params: {
        id: string;
        progressId: string;
    };
}) {
    redirect(`/games/${params.id}/players/${params.progressId}`);
}
