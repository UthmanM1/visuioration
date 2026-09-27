"use client";

import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { deleteDatasetAction, prepareDatasetForChartsAction } from "@/lib/actions/datasets";

export function DeleteDatasetButton({ datasetId, name, disabled }: { datasetId: string; name: string; disabled?: boolean }) {
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function remove() {
    setDeleting(true);
    const result = await deleteDatasetAction({ datasetId });
    setDeleting(false);
    if (!result.ok) {
      toast({ tone: "error", title: "Couldn't delete the dataset", body: result.error });
      return;
    }
    setOpen(false);
    toast({ tone: "success", title: "Dataset deleted", body: `${name} and its file were removed.` });
    router.replace("/app/datasets");
    router.refresh();
  }

  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)} disabled={disabled} title={disabled ? "Viewers can’t delete datasets" : undefined} icon={<Trash2 className="h-4 w-4" aria-hidden />} className="hover:border-rust-500 hover:text-rust-700">
        Delete
      </Button>
      <Modal
        open={open}
        onClose={() => !deleting && setOpen(false)}
        title="Delete dataset?"
        description={`“${name}” and its uploaded file will be permanently deleted. Projects that use it will keep working but show no dataset.`}
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)} disabled={deleting} data-autofocus>Cancel</Button>
            <Button variant="danger" onClick={remove} loading={deleting}>Delete dataset</Button>
          </>
        }
      >
        <p className="text-sm text-ink-muted">This can&apos;t be undone.</p>
      </Modal>
    </>
  );
}

/** Re-renders the page every few seconds while the dataset is still being processed. */
export function RefreshWhilePending({ pending }: { pending: boolean }) {
  const router = useRouter();
  useEffect(() => {
    if (!pending) return;
    const timer = window.setInterval(() => router.refresh(), 4000);
    return () => window.clearInterval(timer);
  }, [pending, router]);
  return null;
}

export function PrepareForChartsButton({ datasetId, disabled }: { datasetId: string; disabled?: boolean }) {
  const router = useRouter();
  const toast = useToast();
  const [working, setWorking] = useState(false);
  async function prepare() {
    setWorking(true);
    const result = await prepareDatasetForChartsAction({ datasetId });
    setWorking(false);
    if (!result.ok) {
      toast({ tone: "error", title: "Couldn't prepare the dataset", body: result.error });
      return;
    }
    toast({ tone: "success", title: "Ready for charts", body: `${result.data.rows.toLocaleString("en-US")} rows loaded.` });
    router.refresh();
  }
  return (
    <Button onClick={prepare} loading={working} disabled={disabled} title={disabled ? "Viewers can’t prepare datasets" : undefined}>
      {working ? "Preparing…" : "Prepare for charts"}
    </Button>
  );
}
