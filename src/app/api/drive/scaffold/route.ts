import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import { getDriveAuth } from "../_auth";

// Folder structure: phase label -> subfolder names -> agent IDs that save there
const PHASE_STRUCTURE: Record<string, { label: string; subfolders: Record<string, string> }> = {
  Plan: {
    label: "Phase 1 - Plan",
    subfolders: {
      "Meeting Recording": "meeting_input",
      "Transcript": "stt",
      "Summary": "summarise",
      "CPS": "cps",
      "PRD": "prd",
    },
  },
  Design: {
    label: "Phase 2 - Design",
    subfolders: {
      "Event Storm": "event_storm",
      "Principles": "principles",
      "Domain Model": "domain_model",
    },
  },
  Architecture: {
    label: "Phase 3 - Architecture",
    subfolders: {
      "Architecture": "architecture",
      "Spec": "spec",
      "Agents.md": "agents_md",
    },
  },
  Review: {
    label: "Phase 4 - Review",
    subfolders: {
      "Security Review": "security_agent",
      "Definition Doc": "doc_agent",
    },
  },
  Build: {
    label: "Phase 5 - Build",
    subfolders: {
      "PM Tickets": "pm_agent",
      "Handover Doc": "reverse_doc",
    },
  },
  Eval: {
    label: "Phase 6 - Eval",
    subfolders: {
      "Evaluation Reports": "eval_agent",
    },
  },
};


const SHARED_DRIVE_NAME = "Shinko1 Customers";

async function findSharedDrive(
  drive: ReturnType<typeof google.drive>
): Promise<{ id: string }> {
  const res = await drive.drives.list({
    q: `name='${SHARED_DRIVE_NAME}'`,
    fields: "drives(id,name)",
    pageSize: 10,
  });
  const found = res.data.drives?.find((d) => d.name === SHARED_DRIVE_NAME);
  if (!found?.id) throw new Error(`Shared Drive "${SHARED_DRIVE_NAME}" not found — check Drive access`);
  return { id: found.id };
}

async function findOrCreate(
  drive: ReturnType<typeof google.drive>,
  name: string,
  parentId: string,
  driveId: string
): Promise<{ id: string; url: string }> {
  const q = `name='${name}' and '${parentId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`;
  const res = await drive.files.list({
    q,
    fields: "files(id,webViewLink)",
    spaces: "drive",
    corpora: "drive",
    driveId,
    includeItemsFromAllDrives: true,
    supportsAllDrives: true,
    pageSize: 1,
  });
  if (res.data.files?.length) {
    return { id: res.data.files[0].id!, url: res.data.files[0].webViewLink! };
  }
  const file = await drive.files.create({
    requestBody: {
      name,
      mimeType: "application/vnd.google-apps.folder",
      parents: [parentId],
    },
    fields: "id,webViewLink",
    supportsAllDrives: true,
  });
  return { id: file.data.id!, url: file.data.webViewLink! };
}

export async function POST(req: NextRequest) {
  const driveAuth = getDriveAuth(req);
  if (!driveAuth) return NextResponse.json({ error: "Not connected to Google Drive" }, { status: 401 });

  const { clientName, projectName } = await req.json() as {
    clientName: string;
    projectName: string;
  };

  if (!clientName || !projectName) {
    return NextResponse.json({ error: "Missing clientName or projectName" }, { status: 400 });
  }

  const drive = google.drive({ version: "v3", auth: driveAuth.auth });

  try {
    // Build: Shared Drives / Shinko1 Customers / {Client} / {Project}
    const { id: driveId } = await findSharedDrive(drive);
    const customer = await findOrCreate(drive, clientName, driveId, driveId);
    const project  = await findOrCreate(drive, projectName, customer.id, driveId);

    const phases: Record<string, string> = {};
    const subfolders: Record<string, string> = {};

    for (const [phase, { label, subfolders: subs }] of Object.entries(PHASE_STRUCTURE)) {
      const phaseFolder = await findOrCreate(drive, label, project.id, driveId);
      phases[phase] = phaseFolder.id;

      for (const [subName, agentId] of Object.entries(subs)) {
        const sub = await findOrCreate(drive, subName, phaseFolder.id, driveId);
        subfolders[agentId] = sub.id;
      }
    }

    const res = NextResponse.json({
      projectRoot: project.id,
      projectUrl: project.url,
      phases,
      subfolders,
    });
    driveAuth.setTokenCookies(res);
    return res;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[drive/scaffold]", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
