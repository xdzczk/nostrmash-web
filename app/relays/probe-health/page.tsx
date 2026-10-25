import { redirect } from "next/navigation";

/** Connection checks now live on the status page. */
export default function RelayProbeHealthPage() {
  redirect("/relays/health#connect");
}
