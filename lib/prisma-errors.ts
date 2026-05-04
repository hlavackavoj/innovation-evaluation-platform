type PrismaLikeError = {
  code?: unknown;
  name?: unknown;
  message?: unknown;
};

export function isPrismaConnectivityError(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }

  const prismaError = error as PrismaLikeError;
  const code = typeof prismaError.code === "string" ? prismaError.code : "";
  const name = typeof prismaError.name === "string" ? prismaError.name : "";
  const message = typeof prismaError.message === "string" ? prismaError.message.toLowerCase() : "";

  if (code === "P1001" || code === "P1002" || code === "P1017") {
    return true;
  }

  if (name !== "PrismaClientInitializationError") {
    return false;
  }

  return (
    message.includes("can't reach database server") ||
    message.includes("database server") ||
    message.includes("timed out")
  );
}
