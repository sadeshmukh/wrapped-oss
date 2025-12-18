import { Metadata } from "next";
import { getShareByPublicId } from "@/lib/share";
import SharedWrappedView from "@/components/wrapped/SharedWrappedView";
import Link from "next/link";

type Props = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const id = (await params).id;
  const data = await getShareByPublicId(id);

  if (!data) {
    return {
      title: "Wrapped Not Found",
    };
  }

  return {
    title: `${data.userName}'s 2025 Wrapped`,
    description: `Check out ${data.userName}'s year on Hack Club Slack!`,
  };
}

export default async function SharedWrappedPage({ params }: Props) {
  const id = (await params).id;
  const data = await getShareByPublicId(id);

  if (!data) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-wrapped-black text-wrapped-cream p-4">
        <h1 className="text-4xl font-black mb-4">Wrapped Not Found</h1>
        <p className="text-xl opacity-80 mb-8">
          This link might be invalid or the user has stopped sharing their
          wrapped.
        </p>
        <Link
          href="/"
          className="bg-wrapped-red text-wrapped-cream px-8 py-3 rounded-xl text-xl font-bold hover:scale-105 transition-transform"
        >
          Get Your Own Wrapped
        </Link>
      </div>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-between">
      <SharedWrappedView data={data} />
    </main>
  );
}
