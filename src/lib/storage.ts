import { mkdir, writeFile } from "fs/promises";
import path from "path";

export async function storePayoutDocument(opts: {
  payoutId: string;
  fileName: string;
  bytes: Buffer;
}): Promise<{ fileUrl: string }> {
  const root = process.env.UPLOAD_DIR || "public/uploads";
  const dir = path.join(process.cwd(), root, "payouts", opts.payoutId);
  await mkdir(dir, { recursive: true });
  const safe = opts.fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  const stamp = Date.now();
  const dest = path.join(dir, `${stamp}-${safe}`);
  await writeFile(dest, opts.bytes);
  const publicRoot = root.startsWith("public/") ? root.slice("public/".length) : root;
  return { fileUrl: `/${publicRoot}/payouts/${opts.payoutId}/${stamp}-${safe}` };
}
