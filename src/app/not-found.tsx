import Link from "next/link";

export default function NotFound() {
  return (
    <div className="container-page py-20 text-center">
      <h1 className="text-3xl font-black">No encontramos esta página</h1>
      <Link href="/tienda" className="btn-primary mt-6">Ir a la tienda</Link>
    </div>
  );
}
