import { NextResponse } from "next/server";
import { listDepartments, listDistricts, listProvinces } from "@/lib/ubigeo";

export function GET(req: Request) {
  const url = new URL(req.url);
  const dep = url.searchParams.get("departamento");
  const prov = url.searchParams.get("provincia");
  const data = prov && /^\d{4}$/.test(prov) ? listDistricts(prov) : dep && /^\d{2}$/.test(dep) ? listProvinces(dep) : listDepartments();
  return NextResponse.json(data, { headers: { "Cache-Control": "public, max-age=86400" } });
}
