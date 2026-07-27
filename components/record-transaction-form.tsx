"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { ImagePlus, Info, Loader2, X } from "lucide-react";
import { toast } from "sonner";

import { recordTransaction } from "@/app/actions/transactions";
import { AmountInput } from "@/components/amount-input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createClient } from "@/lib/supabase/client";
import { formatRupiah } from "@/lib/format";
import type { TxType } from "@/lib/types";

const MAX_BYTES = 5 * 1024 * 1024;
const ACCEPTED = ["image/jpeg", "image/png", "image/webp", "image/heic"];

type Props = {
  groupId: string;
  groupName: string;
  userId: string;
  type: TxType;
  isOwner: boolean;
  balance: string;
};

export function RecordTransactionForm({
  groupId,
  groupName,
  userId,
  type,
  isOwner,
  balance,
}: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [amount, setAmount] = useState(0);
  const [note, setNote] = useState("");
  const [uploading, setUploading] = useState(false);
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const isWithdrawal = type === "withdrawal";
  const noteRequired = isWithdrawal;
  const busy = uploading || pending;

  const canSubmit =
    amount > 0 && file !== null && (!noteRequired || note.trim().length > 0);

  function pickFile(selected: File | null) {
    if (!selected) return;

    if (!ACCEPTED.includes(selected.type)) {
      return toast.error("Format file tidak didukung", {
        description: "Gunakan JPG, PNG, WEBP, atau HEIC.",
      });
    }
    if (selected.size > MAX_BYTES) {
      return toast.error("Ukuran file terlalu besar", {
        description: "Maksimal 5 MB per foto.",
      });
    }

    setFile(selected);
    setPreviewUrl(URL.createObjectURL(selected));
  }

  function clearFile() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(null);
    setPreviewUrl(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  async function submit() {
    if (!file) return;

    setUploading(true);

    // Path WAJIB berpola {group_id}/{user_id}/{nama} — baik policy Storage
    // maupun trigger transactions_before_insert memverifikasinya, supaya tidak
    // ada yang bisa mengklaim bukti transfer orang lain.
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${groupId}/${userId}/${crypto.randomUUID()}.${ext}`;

    const supabase = createClient();
    const { error: uploadError } = await supabase.storage
      .from("proofs")
      .upload(path, file, { contentType: file.type, upsert: false });

    setUploading(false);

    if (uploadError) {
      return toast.error("Gagal mengunggah bukti", {
        description: uploadError.message,
      });
    }

    startTransition(async () => {
      const { error } = await recordTransaction({
        groupId,
        type,
        amount,
        proofPath: path,
        note,
      });

      if (error) {
        // File sudah terunggah tapi transaksinya gagal. Bersihkan supaya tidak
        // meninggalkan objek nyangkut di bucket.
        await supabase.storage.from("proofs").remove([path]);
        toast.error("Gagal menyimpan transaksi", { description: error });
        return;
      }

      toast.success(
        isWithdrawal
          ? "Penarikan dana tercatat"
          : isOwner
            ? "Setoran tercatat dan langsung terverifikasi"
            : "Setoran terkirim, menunggu persetujuan owner",
      );
      router.push(`/g/${groupId}`);
    });
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex flex-1 flex-col gap-6 px-4 py-5">
        <p className="text-muted-foreground text-[13px] leading-relaxed">
          {isWithdrawal ? (
            <>
              Tarik dana dari <span className="text-foreground font-semibold">{groupName}</span>.
              Saldo sekarang{" "}
              <span className="text-foreground tnum font-semibold">
                {formatRupiah(balance)}
              </span>
              .
            </>
          ) : (
            <>
              Transfer dulu secara manual, lalu catat di sini beserta bukti
              transfernya ke <span className="text-foreground font-semibold">{groupName}</span>.
            </>
          )}
        </p>

        <AmountInput
          id="amount"
          name="amount"
          label={isWithdrawal ? "Nominal ditarik" : "Nominal setoran"}
          required
          autoFocus
          placeholder="500.000"
          value={amount}
          onValueChange={setAmount}
        />

        <div className="flex flex-col gap-2">
          <Label className="text-[13px] font-semibold">
            Foto bukti{" "}
            <span className="text-bad bg-bad-surface ml-1 rounded px-1.5 py-0.5 text-[10px] font-bold tracking-wide uppercase">
              wajib
            </span>
          </Label>

          <input
            ref={inputRef}
            type="file"
            accept={ACCEPTED.join(",")}
            capture="environment"
            className="sr-only"
            id="proof"
            onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
          />

          {previewUrl ? (
            <div className="relative overflow-hidden rounded-xl border">
              <Image
                src={previewUrl}
                alt="Pratinjau bukti transfer"
                width={400}
                height={400}
                unoptimized
                className="max-h-64 w-full object-contain"
              />
              <button
                type="button"
                onClick={clearFile}
                aria-label="Hapus foto"
                className="bg-background/85 focus-visible:ring-ring absolute top-2 right-2 grid size-8 place-items-center rounded-full backdrop-blur focus-visible:ring-2 focus-visible:outline-none"
              >
                <X className="size-4" />
              </button>
            </div>
          ) : (
            <label
              htmlFor="proof"
              className="border-input hover:bg-muted/50 focus-within:ring-ring flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed px-4 py-8 text-center transition-colors focus-within:ring-2"
            >
              <span className="bg-muted text-muted-foreground grid size-10 place-items-center rounded-xl">
                <ImagePlus className="size-5" />
              </span>
              <span className="text-sm font-semibold">Ambil atau pilih foto</span>
              <span className="text-muted-foreground text-xs">
                JPG, PNG, WEBP, atau HEIC · maks 5 MB
              </span>
            </label>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="note" className="flex items-center gap-2 text-[13px] font-semibold">
            {isWithdrawal ? "Keterangan pengeluaran" : "Catatan"}
            {noteRequired ? (
              <span className="text-bad bg-bad-surface rounded px-1.5 py-0.5 text-[10px] font-bold tracking-wide uppercase">
                wajib
              </span>
            ) : (
              <span className="text-muted-foreground bg-muted rounded px-1.5 py-0.5 text-[10px] font-bold tracking-wide uppercase">
                opsional
              </span>
            )}
          </Label>
          <Textarea
            id="note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            required={noteRequired}
            placeholder={
              isWithdrawal ? "DP tiket pesawat" : "Setoran bulan Juli"
            }
            className="resize-none rounded-xl text-sm"
          />
        </div>

        {!isOwner && !isWithdrawal ? (
          <p className="bg-muted text-muted-foreground flex gap-2.5 rounded-xl px-3.5 py-3 text-xs leading-relaxed">
            <Info className="mt-0.5 size-4 shrink-0" />
            Setoranmu berstatus menunggu sampai owner menyetujuinya. Kalau
            ditolak, kamu bisa mengunggah ulang sebagai transaksi baru.
          </p>
        ) : null}
      </div>

      <div className="bottom-bar px-4 pt-3">
        <Button
          type="button"
          size="lg"
          onClick={submit}
          disabled={!canSubmit || busy}
          className="h-12 w-full gap-2 rounded-xl text-[15px] font-bold"
        >
          {busy ? <Loader2 className="size-4 animate-spin" /> : null}
          {uploading
            ? "Mengunggah bukti…"
            : pending
              ? "Menyimpan…"
              : isWithdrawal
                ? "Catat penarikan"
                : "Kirim setoran"}
        </Button>
      </div>

    </div>
  );
}
