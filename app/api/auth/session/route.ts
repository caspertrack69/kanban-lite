import { connection } from "next/server";
import { handleApi, jsonResponse } from "@/lib/http";
import { getSession } from "@/lib/session";

export async function GET() {
  await connection();
  return handleApi(async () => {
    const session = await getSession();
    return jsonResponse({ authenticated: session.authenticated === true });
  });
}
