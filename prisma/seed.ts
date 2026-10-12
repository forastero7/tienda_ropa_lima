// Datos de demostración: catálogo ficticio, zonas de envío y contenido.
// Reemplázalos por el catálogo real con la carga CSV del panel.
import { PrismaClient, type Gender } from "@prisma/client";

const prisma = new PrismaClient();

const COLORS: Record<string, { name: string; hex: string }> = {
  negro: { name: "Negro", hex: "#1f1f1f" },
  blanco: { name: "Blanco", hex: "#f2efe9" },
  arena: { name: "Arena", hex: "#d8c3a5" },
  oliva: { name: "Oliva", hex: "#6b7046" },
  azul: { name: "Azul noche", hex: "#2f4a6d" },
  terracota: { name: "Terracota", hex: "#b5583a" },
  gris: { name: "Gris jaspeado", hex: "#8d8d8d" },
  rosa: { name: "Rosa palo", hex: "#e7b7b0" },
};

type SeedProduct = {
  slug: string;
  name: string;
  category: string;
  shape: string;
  gender: Gender;
  price: number;
  compareAt?: number;
  colors: string[];
  sizes: string[];
  composition: string;
  description: string;
  isNew?: boolean;
  isFeatured?: boolean;
  measurements: Record<string, Record<string, number>>;
  weight: number;
};

const top = (base: number) => ({
  S: { Pecho: base, Largo: 68, Hombro: 44 },
  M: { Pecho: base + 3, Largo: 70, Hombro: 46 },
  L: { Pecho: base + 6, Largo: 72, Hombro: 48 },
  XL: { Pecho: base + 9, Largo: 74, Hombro: 50 },
});
const bottom = {
  "28": { Cintura: 72, Cadera: 96, Tiro: 26, Largo: 100 },
  "30": { Cintura: 77, Cadera: 100, Tiro: 27, Largo: 101 },
  "32": { Cintura: 82, Cadera: 104, Tiro: 28, Largo: 102 },
  "34": { Cintura: 87, Cadera: 108, Tiro: 29, Largo: 103 },
};

const products: SeedProduct[] = [
  { slug: "polo-oversize-algodon-pima", name: "Polo oversize algodón pima", category: "polos", shape: "polo", gender: "UNISEX", price: 79, colors: ["negro", "blanco", "arena"], sizes: ["S", "M", "L", "XL"], composition: "100% algodón pima peruano, 200 g/m²", description: "Corte amplio y hombro caído. Tejido pima de fibra larga, suave y resistente al lavado.", isNew: true, isFeatured: true, measurements: top(56), weight: 250 },
  { slug: "polo-basico-cuello-redondo", name: "Polo básico cuello redondo", category: "polos", shape: "polo", gender: "HOMBRE", price: 59, colors: ["blanco", "gris", "azul"], sizes: ["S", "M", "L", "XL"], composition: "100% algodón, jersey 180 g/m²", description: "El básico de todos los días, de calce regular.", measurements: top(50), weight: 220 },
  { slug: "polo-crop-rib", name: "Polo crop acanalado", category: "polos", shape: "polo", gender: "MUJER", price: 65, compareAt: 79, colors: ["negro", "rosa", "blanco"], sizes: ["S", "M", "L"], composition: "95% algodón, 5% elastano", description: "Tejido acanalado con elasticidad y largo a la cintura.", isFeatured: true, measurements: { S: { Pecho: 40, Largo: 44 }, M: { Pecho: 43, Largo: 45 }, L: { Pecho: 46, Largo: 46 } }, weight: 180 },
  { slug: "hoodie-french-terry", name: "Hoodie french terry", category: "polerones", shape: "hoodie", gender: "UNISEX", price: 149, colors: ["gris", "negro", "oliva"], sizes: ["S", "M", "L", "XL"], composition: "80% algodón, 20% poliéster, french terry 320 g/m²", description: "Capucha forrada y bolsillo canguro. Abriga sin pesar.", isNew: true, isFeatured: true, measurements: top(60), weight: 600 },
  { slug: "polera-cuello-redondo", name: "Polera cuello redondo", category: "polerones", shape: "hoodie", gender: "MUJER", price: 129, compareAt: 159, colors: ["arena", "rosa"], sizes: ["S", "M", "L"], composition: "70% algodón, 30% poliéster", description: "Polera de calce relajado con puños acanalados.", measurements: top(55), weight: 520 },
  { slug: "jogger-cargo", name: "Jogger cargo", category: "pantalones", shape: "pantalon", gender: "HOMBRE", price: 139, colors: ["oliva", "negro", "arena"], sizes: ["28", "30", "32", "34"], composition: "98% algodón, 2% elastano, drill", description: "Bolsillos laterales con fuelle y basta con elástico.", isFeatured: true, measurements: bottom, weight: 550 },
  { slug: "jean-wide-leg", name: "Jean wide leg", category: "pantalones", shape: "pantalon", gender: "MUJER", price: 159, colors: ["azul"], sizes: ["28", "30", "32"], composition: "100% algodón, denim 12 oz", description: "Tiro alto y pierna amplia. Denim rígido que se adapta con el uso.", isNew: true, measurements: bottom, weight: 650 },
  { slug: "casaca-denim-clasica", name: "Casaca denim clásica", category: "casacas", shape: "casaca", gender: "UNISEX", price: 219, colors: ["azul", "negro"], sizes: ["S", "M", "L", "XL"], composition: "100% algodón, denim 13 oz", description: "Botones metálicos y bolsillos al pecho. Para todas las estaciones.", isFeatured: true, measurements: top(58), weight: 900 },
  { slug: "casaca-rompevientos", name: "Casaca rompevientos", category: "casacas", shape: "casaca", gender: "UNISEX", price: 179, compareAt: 219, colors: ["oliva", "terracota", "negro"], sizes: ["S", "M", "L", "XL"], composition: "100% poliéster con acabado repelente al agua", description: "Ligera, con capucha guardable. Ideal para la garúa limeña.", isNew: true, measurements: top(60), weight: 400 },
  { slug: "vestido-midi-lino", name: "Vestido midi de lino", category: "vestidos", shape: "vestido", gender: "MUJER", price: 189, colors: ["arena", "terracota", "blanco"], sizes: ["S", "M", "L"], composition: "55% lino, 45% viscosa", description: "Fresco, de caída suelta y largo a media pierna.", isNew: true, isFeatured: true, measurements: { S: { Busto: 86, Cintura: 70, Largo: 115 }, M: { Busto: 90, Cintura: 74, Largo: 117 }, L: { Busto: 95, Cintura: 79, Largo: 119 } }, weight: 380 },
  { slug: "vestido-tubo-rib", name: "Vestido tubo acanalado", category: "vestidos", shape: "vestido", gender: "MUJER", price: 99, colors: ["negro", "oliva"], sizes: ["S", "M", "L"], composition: "92% algodón, 8% elastano", description: "Ajustado al cuerpo, con elasticidad para todo el día.", measurements: { S: { Busto: 76, Cintura: 62, Largo: 105 }, M: { Busto: 80, Cintura: 66, Largo: 107 }, L: { Busto: 84, Cintura: 70, Largo: 109 } }, weight: 300 },
  { slug: "short-deportivo", name: "Short deportivo", category: "pantalones", shape: "pantalon", gender: "UNISEX", price: 69, colors: ["negro", "gris"], sizes: ["S", "M", "L", "XL"], composition: "100% poliéster reciclado, secado rápido", description: "Con forro interior y bolsillo con cierre.", measurements: { S: { Cintura: 70, Largo: 42 }, M: { Cintura: 76, Largo: 44 }, L: { Cintura: 82, Largo: 46 }, XL: { Cintura: 88, Largo: 48 } }, weight: 200 },
];

const categories = [
  { slug: "polos", name: "Polos" },
  { slug: "polerones", name: "Poleras y hoodies" },
  { slug: "pantalones", name: "Pantalones y shorts" },
  { slug: "casacas", name: "Casacas" },
  { slug: "vestidos", name: "Vestidos" },
];

// Pseudoaleatorio determinista para que el seed sea reproducible.
let seed = 7;
const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

async function main() {
  for (const [i, c] of categories.entries()) {
    await prisma.category.upsert({ where: { slug: c.slug }, update: { name: c.name, position: i }, create: { ...c, position: i } });
  }

  for (const p of products) {
    const category = await prisma.category.findUniqueOrThrow({ where: { slug: p.category } });
    const data = {
      name: p.name,
      description: p.description,
      composition: p.composition,
      care: "Lavar a máquina en frío, del revés. No usar lejía. Secar a la sombra. Planchar a temperatura media.",
      gender: p.gender,
      status: "ACTIVE" as const,
      priceCents: p.price * 100,
      compareAtCents: p.compareAt ? p.compareAt * 100 : null,
      weightGrams: p.weight,
      isNew: p.isNew ?? false,
      isFeatured: p.isFeatured ?? false,
      measurements: p.measurements,
      categoryId: category.id,
    };
    const product = await prisma.product.upsert({ where: { slug: p.slug }, update: data, create: { slug: p.slug, ...data } });

    await prisma.productImage.deleteMany({ where: { productId: product.id } });
    await prisma.productImage.createMany({
      data: p.colors.map((c, i) => ({
        productId: product.id,
        url: `/img/productos/${p.shape}-${c}.svg`,
        alt: `${p.name} color ${COLORS[c].name}`,
        color: COLORS[c].name,
        position: i,
      })),
    });

    let position = 0;
    for (const c of p.colors) {
      for (const size of p.sizes) {
        const sku = `${p.slug.split("-").map((w) => w.slice(0, 3)).join("").toUpperCase().slice(0, 9)}-${c.slice(0, 3).toUpperCase()}-${size}`;
        const stock = Math.floor(rand() * 9); // algunas combinaciones quedan agotadas
        const existing = await prisma.variant.findUnique({ where: { sku } });
        if (existing) continue;
        const variant = await prisma.variant.create({
          data: { sku, productId: product.id, size, color: COLORS[c].name, colorHex: COLORS[c].hex, stock, position: position++ },
        });
        if (stock > 0) {
          await prisma.stockMovement.create({ data: { variantId: variant.id, type: "IMPORT", quantity: stock, note: "Seed" } });
        }
      }
    }
  }

  // Tarifas de ejemplo: ajústalas al contrato con el courier.
  if ((await prisma.shippingZone.count()) === 0) {
    await prisma.shippingZone.createMany({
      data: [
        { name: "Lima Metropolitana", ubigeoPrefixes: ["1501"], feeCents: 1200, freeOverCents: 25000, etaText: "Entrega estimada en 1 a 3 días hábiles tras confirmar el pago", codAllowed: true, position: 0 },
        { name: "Callao", ubigeoPrefixes: ["0701"], feeCents: 1200, freeOverCents: 25000, etaText: "Entrega estimada en 1 a 3 días hábiles tras confirmar el pago", codAllowed: true, position: 1 },
        { name: "Lima provincias", ubigeoPrefixes: ["15"], feeCents: 1800, perKgCents: 400, etaText: "Entrega estimada en 2 a 5 días hábiles según courier", position: 2 },
        { name: "Resto del país", ubigeoPrefixes: [""], feeCents: 2000, perKgCents: 500, etaText: "Entrega estimada en 3 a 7 días hábiles según destino y courier", position: 3 },
      ],
    });
  }

  await prisma.coupon.upsert({
    where: { code: "BIENVENIDA10" },
    update: {},
    create: { code: "BIENVENIDA10", type: "PERCENT", value: 10, minSubtotalCents: 10000, maxUses: 500 },
  });

  if ((await prisma.banner.count()) === 0) {
    await prisma.banner.create({
      data: { title: "Nueva colección de temporada", subtitle: "Algodón pima, lino y denim pensados para Lima.", ctaLabel: "Ver novedades", ctaHref: "/novedades" },
    });
  }

  // Looks de demostración: prendas que combinan, cada una se compra por separado.
  const looks = [
    { slug: "urbano-de-fin-de-semana", title: "Urbano de fin de semana", description: "Hoodie, jogger y casaca para salir sin pensarlo.", products: ["hoodie-french-terry", "jogger-cargo", "casaca-rompevientos"] },
    { slug: "verano-en-lima", title: "Verano en Lima", description: "Lino y algodón para los días de sol.", products: ["vestido-midi-lino", "polo-crop-rib", "short-deportivo"] },
  ];
  for (const [position, l] of looks.entries()) {
    const look = await prisma.look.upsert({
      where: { slug: l.slug },
      update: { title: l.title, description: l.description, position },
      create: { slug: l.slug, title: l.title, description: l.description, position },
    });
    await prisma.lookItem.deleteMany({ where: { lookId: look.id } });
    for (const [i, slug] of l.products.entries()) {
      const product = await prisma.product.findUniqueOrThrow({ where: { slug } });
      await prisma.lookItem.create({ data: { lookId: look.id, productId: product.id, position: i } });
    }
  }

  if ((await prisma.faq.count()) === 0) {
    await prisma.faq.createMany({
      data: [
        { question: "¿Necesito crear una cuenta para comprar?", answer: "No. Compras como invitado y recibes un código de pedido para hacer seguimiento.", position: 0 },
        { question: "¿Cómo sé mi talla?", answer: "Cada prenda muestra sus medidas reales en centímetros. Compáralas con una prenda tuya que te quede bien.", position: 1 },
        { question: "¿Cuánto cuesta el envío?", answer: "Depende del distrito de destino y se muestra antes de pagar. El plazo lo confirma el courier al despachar.", position: 2 },
        { question: "¿Puedo cambiar la talla?", answer: "Sí, según nuestra política de cambios y devoluciones. Escríbenos con tu código de pedido.", position: 3 },
      ],
    });
  }

  console.log("Seed completado.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
