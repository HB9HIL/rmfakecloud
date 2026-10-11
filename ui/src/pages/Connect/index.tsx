import { useLoaderData, useRevalidator } from "react-router";
import { FaRepeat } from "react-icons/fa6";

import type { getCode } from "../../api";
import { cardClass } from "../../components/styles";
import { Button } from "../../components/ui";

export default function Connect() {
  const code = useLoaderData<typeof getCode>();
  const revalidator = useRevalidator();

  return (
    <div className="mx-auto max-w-xl px-4 py-12 text-center">
      <h2 className="font-serif text-2xl">Connect a device</h2>
      <p className="mt-2 text-muted">Enter this one-time code on your reMarkable.</p>
      <div className={`${cardClass} my-8 px-4 py-10`}>
        <h1 className="font-mono text-4xl tracking-[0.3em] break-all sm:text-5xl">{code}</h1>
      </div>
      <Button onClick={() => revalidator.revalidate()} disabled={revalidator.state === "loading"}>
        <FaRepeat /> New code
      </Button>
    </div>
  );
}
