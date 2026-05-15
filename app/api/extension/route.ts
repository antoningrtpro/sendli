import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import type { AppNotification } from "@/app/actions/notifications";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://app.sendli.fr";

function corsHeaders(request: NextRequest): Record<string, string> {
  const origin = request.headers.get("origin") ?? "";
  const headers: Record<string, string> = {
    "Access-Control-Allow-Methods": "GET, PATCH, OPTIONS",
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
  };
  if (origin.startsWith("chrome-extension://")) {
    headers["Access-Control-Allow-Origin"] = origin;
  }
  return headers;
}

async function getUserByToken(token: string): Promise<{ id: string } | null> {
  const snap = await adminDb
    .collection("users")
    .where("extensionToken", "==", token)
    .limit(1)
    .get();
  if (snap.empty) return null;
  return { id: snap.docs[0].id };
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders(request),
  });
}

export async function GET(request: NextRequest) {
  const cors = corsHeaders(request);

  const authHeader = request.headers.get("authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: cors });
  }

  const user = await getUserByToken(token);
  if (!user) {
    return NextResponse.json({ error: "Invalid token" }, { status: 401, headers: cors });
  }

  const snap = await adminDb
    .collection("notifications")
    .where("userId", "==", user.id)
    .limit(120)
    .get();

  const notifications: AppNotification[] = snap.docs
    .map((d) => {
      const data = d.data();
      return {
        id: d.id,
        type: data.type as AppNotification["type"],
        proposalId: data.proposalId as string,
        proposalTitle: data.proposalTitle as string,
        visitorName: (data.visitorName as string | null | undefined) ?? null,
        visitorEmail: (data.visitorEmail as string | null | undefined) ?? null,
        blockLabel: (data.blockLabel as string | null | undefined) ?? null,
        durationSeconds: (data.durationSeconds as number | null | undefined) ?? null,
        read: data.read as boolean,
        createdAt: data.createdAt?.toDate?.() ?? new Date(),
      };
    })
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, 60);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return NextResponse.json(
    { notifications, unreadCount, appUrl: APP_URL },
    { headers: cors }
  );
}

export async function PATCH(request: NextRequest) {
  const cors = corsHeaders(request);

  const authHeader = request.headers.get("authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: cors });
  }

  const user = await getUserByToken(token);
  if (!user) {
    return NextResponse.json({ error: "Invalid token" }, { status: 401, headers: cors });
  }

  const body = (await request.json()) as { notificationId?: string; all?: boolean };

  if (body.all === true) {
    const snap = await adminDb
      .collection("notifications")
      .where("userId", "==", user.id)
      .where("read", "==", false)
      .get();
    const batch = adminDb.batch();
    snap.docs.forEach((d) => batch.update(d.ref, { read: true }));
    await batch.commit();
    return NextResponse.json({ ok: true }, { headers: cors });
  }

  if (body.notificationId) {
    const docRef = adminDb.collection("notifications").doc(body.notificationId);
    const snap = await docRef.get();
    if (snap.exists && snap.data()?.userId === user.id) {
      await docRef.update({ read: true });
    }
    return NextResponse.json({ ok: true }, { headers: cors });
  }

  return NextResponse.json({ error: "Bad request" }, { status: 400, headers: cors });
}
