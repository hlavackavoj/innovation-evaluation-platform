import { Buffer } from "buffer";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const PROJECT_DOCUMENTS_BUCKET = "project-documents";

const allowedMimeTypes = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  // Some clients still fallback to octet-stream for office docs.
  "application/octet-stream"
]);

const allowedExtensions = new Set(["pdf", "docx", "xlsx", "pptx"]);

function assertSupabaseStorageEnv() {
  if (!SUPABASE_URL) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL.");
  }

  if (!SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY.");
  }
}

function getSupabaseCredentials() {
  assertSupabaseStorageEnv();

  return {
    supabaseUrl: SUPABASE_URL as string,
    serviceRoleKey: SUPABASE_SERVICE_ROLE_KEY as string
  };
}

function sanitizeFilename(rawName: string) {
  return rawName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9.\-_]+/g, "-")
    .replace(/-+/g, "-");
}

function extensionFromFilename(fileName: string) {
  return fileName.split(".").pop()?.toLowerCase() ?? "";
}

function assertAllowedFile(file: File) {
  const extension = extensionFromFilename(file.name);
  const hasAllowedExtension = allowedExtensions.has(extension);
  const hasAllowedMimeType = allowedMimeTypes.has(file.type);

  if (!hasAllowedExtension || !hasAllowedMimeType) {
    throw new Error("Only PDF, DOCX, and XLSX files are supported.");
  }
}

async function ensureBucketExists() {
  const { supabaseUrl, serviceRoleKey } = getSupabaseCredentials();

  const checkResponse = await fetch(
    `${supabaseUrl}/storage/v1/bucket/${encodeURIComponent(PROJECT_DOCUMENTS_BUCKET)}`,
    {
      headers: {
        Authorization: `Bearer ${serviceRoleKey}`,
        apikey: serviceRoleKey
      },
      cache: "no-store"
    }
  );

  if (checkResponse.ok) {
    return;
  }

  if (checkResponse.status !== 404) {
    throw new Error("Could not verify storage bucket.");
  }

  const createResponse = await fetch(`${supabaseUrl}/storage/v1/bucket`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${serviceRoleKey}`,
      apikey: serviceRoleKey,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      id: PROJECT_DOCUMENTS_BUCKET,
      name: PROJECT_DOCUMENTS_BUCKET,
      public: false
    })
  });

  if (!createResponse.ok) {
    const payload = await createResponse.text();
    throw new Error(`Could not create storage bucket: ${payload}`);
  }
}

function isAbsoluteUrl(value: string) {
  return /^https?:\/\//i.test(value);
}

async function uploadFile({
  pathPrefix,
  file
}: {
  pathPrefix: string;
  file: File;
}) {
  const { supabaseUrl, serviceRoleKey } = getSupabaseCredentials();
  assertAllowedFile(file);
  await ensureBucketExists();

  const extension = extensionFromFilename(file.name);
  const safeName = sanitizeFilename(file.name);
  const datePath = new Date().toISOString().slice(0, 10);
  const objectPath = `${pathPrefix}/${datePath}/${crypto.randomUUID()}-${safeName || `upload.${extension}`}`;
  const fileBytes = Buffer.from(await file.arrayBuffer());

  const uploadResponse = await fetch(
    `${supabaseUrl}/storage/v1/object/${PROJECT_DOCUMENTS_BUCKET}/${objectPath}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${serviceRoleKey}`,
        apikey: serviceRoleKey,
        "Content-Type": file.type || "application/octet-stream",
        "x-upsert": "false"
      },
      body: fileBytes
    }
  );

  if (!uploadResponse.ok) {
    const payload = await uploadResponse.text();
    throw new Error(`Storage upload failed: ${payload}`);
  }

  return { objectPath };
}

export async function uploadProjectDocumentFile({
  projectId,
  file
}: {
  projectId: string;
  file: File;
}) {
  return uploadFile({
    pathPrefix: `projects/${projectId}`,
    file
  });
}

export async function uploadTemplateFile(file: File) {
  return uploadFile({
    pathPrefix: "templates",
    file
  });
}

export async function createSignedFileUrl(storagePath: string, expiresIn = 60 * 60) {
  if (isAbsoluteUrl(storagePath)) {
    return storagePath;
  }

  const { supabaseUrl, serviceRoleKey } = getSupabaseCredentials();
  await ensureBucketExists();

  const signResponse = await fetch(
    `${supabaseUrl}/storage/v1/object/sign/${PROJECT_DOCUMENTS_BUCKET}/${storagePath}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${serviceRoleKey}`,
        apikey: serviceRoleKey,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        expiresIn
      }),
      cache: "no-store"
    }
  );

  if (!signResponse.ok) {
    if (storagePath.startsWith("seed/")) {
      return "#";
    }

    const payload = await signResponse.text();
    throw new Error(`Could not create signed URL: ${payload}`);
  }

  const data = (await signResponse.json()) as { signedURL?: string; signedUrl?: string };
  const signedPath = data.signedURL ?? data.signedUrl;

  if (!signedPath) {
    throw new Error("Could not create signed URL.");
  }

  return signedPath.startsWith("http") ? signedPath : `${supabaseUrl}/storage/v1${signedPath}`;
}
