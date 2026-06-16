import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { readUploadedFile } from "@/lib/uploads";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const session = await auth();
  if (!session?.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { path: segments } = await params;
  const relativePath = segments.map(decodeURIComponent).join("/");

  try {
    const { buffer } = await readUploadedFile(relativePath);
    const lower = relativePath.toLowerCase();
    const ext = lower.split(".").pop() ?? "";
    const mime =
      ext === "pdf"
        ? "application/pdf"
        : ext === "png"
        ? "image/png"
        : ext === "jpg" || ext === "jpeg"
        ? "image/jpeg"
        : ext === "webp"
        ? "image/webp"
        : "application/octet-stream";

    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": mime,
        "Content-Disposition": `inline; filename="${relativePath.split("/").pop()}"`,
        "Cache-Control": "private, max-age=60",
      },
    });
  } catch (err) {
    return new Response("Not found", { status: 404 });
  }
}
