// Pure helper — no "use server", no async needed

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
  notifId?: string;
}

type NotifType = "page_view" | "cta_click" | "time_on_page" | "comment" | "premium_request" | "premium_approved" | "trial_ending";

interface NotifData {
  type: NotifType;
  proposalTitle?: string | null;
  visitorName?: string | null;
  visitorEmail?: string | null;
  blockLabel?: string | null;
  durationSeconds?: number | null;
  requestUserName?: string | null;
  requestUserEmail?: string | null;
  daysLeft?: number;
}

export function buildPushPayload(data: NotifData, notifId?: string): PushPayload {
  const who = data.visitorName || data.visitorEmail || "Quelqu'un";
  const propale = data.proposalTitle ? ` — ${data.proposalTitle}` : "";

  let title = "sendli";
  let body = "Nouvelle notification";
  let url = "/dashboard";

  switch (data.type) {
    case "page_view":
      title = `Propale ouverte${propale}`;
      body = `${who} a ouvert votre propale`;
      break;
    case "cta_click": {
      const what = data.blockLabel ? `"${data.blockLabel}"` : "un bouton";
      title = `Clic CTA${propale}`;
      body = `${who} a cliqué sur ${what}`;
      break;
    }
    case "time_on_page": {
      const min = data.durationSeconds ? Math.round(data.durationSeconds / 60) : "?";
      title = `Temps passé${propale}`;
      body = `${who} a passé ${min} min sur votre propale`;
      break;
    }
    case "comment":
      title = `Nouveau commentaire${propale}`;
      body = `${who} a laissé un commentaire`;
      break;
    case "premium_request": {
      const requester = data.requestUserName || data.requestUserEmail || "Un utilisateur";
      title = "Demande Premium";
      body = `${requester} demande un accès Premium`;
      url = "/admin";
      break;
    }
    case "premium_approved":
      title = "Accès Premium activé";
      body = "Votre accès Premium a été activé.";
      url = "/settings";
      break;
    case "trial_ending":
      title = data.daysLeft !== undefined && data.daysLeft <= 1
        ? "Votre essai se termine demain"
        : `Votre essai se termine dans ${data.daysLeft} jours`;
      body = "Passez Premium pour conserver tous vos accès.";
      url = "/settings";
      break;
  }

  return { title, body, url, notifId };
}
