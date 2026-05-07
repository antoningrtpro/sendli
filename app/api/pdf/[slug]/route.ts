import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  const snap = await adminDb.collection("proposals")
    .where("slug", "==", slug)
    .where("published", "==", true)
    .limit(1)
    .get();

  if (snap.empty) {
    return new NextResponse("Proposal not found or not published", { status: 404 });
  }

  const proposal = snap.docs[0].data();

  // Use the request host so the PDF renderer fetches the correct domain
  const host = req.headers.get("host") ?? "app.sendli.fr";
  const baseUrl = host.includes("localhost")
    ? `http://${host}`
    : process.env.NEXT_PUBLIC_APP_URL || `https://${host}`;
  const publicUrl = `${baseUrl}/p/${slug}`;

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const chromium = require("@sparticuz/chromium-min");
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const puppeteer = require("puppeteer-core");

    const executablePath = await chromium.executablePath(
      "https://github.com/Sparticuz/chromium/releases/download/v131.0.1/chromium-v131.0.1-pack.tar"
    );

    const browser = await puppeteer.launch({
      executablePath,
      headless: chromium.headless,
      args: chromium.args,
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1200, height: 900 });

    // Wait until network is fully idle so fonts and images load
    await page.goto(publicUrl, { waitUntil: "networkidle0", timeout: 30_000 });

    // Brief pause for web fonts to render
    await new Promise((r) => setTimeout(r, 800));

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "20mm", bottom: "20mm", left: "15mm", right: "15mm" },
    });

    await browser.close();

    const safeName = proposal.title.replace(/[^a-z0-9]/gi, "_").toLowerCase();

    return new NextResponse(Buffer.from(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${safeName}.pdf"`,
      },
    });
  } catch (err) {
    console.error("PDF generation error:", err);
    return new NextResponse("PDF generation failed", { status: 500 });
  }
}
