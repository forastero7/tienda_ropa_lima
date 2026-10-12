import data from "@/data/ubigeo.json";

// [código INEI, departamento, provincia, distrito]
type Row = [string, string, string, string];
const rows = data as Row[];

export type Place = { code: string; name: string };
export type District = { ubigeo: string; department: string; province: string; district: string };

const byCode = new Map<string, District>(
  rows.map(([ubigeo, department, province, district]) => [ubigeo, { ubigeo, department, province, district }]),
);

export function getDistrict(ubigeo: string): District | undefined {
  return byCode.get(ubigeo);
}

export function listDepartments(): Place[] {
  const seen = new Map<string, string>();
  for (const [code, dep] of rows) seen.set(code.slice(0, 2), dep);
  return [...seen].map(([code, name]) => ({ code, name })).sort((a, b) => a.name.localeCompare(b.name, "es"));
}

export function listProvinces(departmentCode: string): Place[] {
  const seen = new Map<string, string>();
  for (const [code, , prov] of rows) if (code.startsWith(departmentCode)) seen.set(code.slice(0, 4), prov);
  return [...seen].map(([code, name]) => ({ code, name })).sort((a, b) => a.name.localeCompare(b.name, "es"));
}

export function listDistricts(provinceCode: string): Place[] {
  return rows
    .filter(([code]) => code.startsWith(provinceCode))
    .map(([code, , , name]) => ({ code, name }))
    .sort((a, b) => a.name.localeCompare(b.name, "es"));
}
