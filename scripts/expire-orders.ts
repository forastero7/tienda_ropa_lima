// Cancela pedidos impagos con reserva vencida. Alternativa al endpoint /api/cron/expire-orders.
import { expireUnpaidOrders } from "../src/lib/orders/lifecycle";
import { prisma } from "../src/lib/db";

expireUnpaidOrders()
  .then((n) => console.log(`Pedidos caducados: ${n}`))
  .finally(() => prisma.$disconnect());
